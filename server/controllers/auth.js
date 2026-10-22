const { verifyToken, fetchMe } = require("../helpers/quant0");
const Auth = require("../models/Auth");

// @desc    Authenticate / Provision user via Quant0 access token
// @route   POST /api/auth/quant0-session
// @access  Public (Quant0 Bearer Token)
const quant0Session = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : req.body.token;

    if (!token) {
      return res.status(401).json({ message: "No Quant0 access token provided" });
    }

    let claims;
    try {
      claims = await verifyToken(token);
    } catch (err) {
      return res
        .status(401)
        .json({ message: err.message || "Token verification rejected by Quant0" });
    }

    const profile = await fetchMe(token);
    const sub = claims.subject || claims.sub;

    let idClaims = {};
    if (req.body?.id_token) {
      try {
        const parts = req.body.id_token.split(".");
        if (parts[1]) {
          idClaims = JSON.parse(
            Buffer.from(parts[1], "base64url").toString("utf8")
          );
        }
      } catch (e) {
        console.warn("[quant0] Could not parse id_token payload:", e.message);
      }
    }

    const email =
      req.body?.email ||
      idClaims?.email ||
      profile?.email ||
      claims.email ||
      (claims.subject && claims.subject.includes("@") ? claims.subject : null) ||
      (sub ? `${sub}@quant0.local` : `user_${Date.now()}@quant0.local`);

    const name =
      req.body?.name ||
      idClaims?.name ||
      profile?.name ||
      profile?.display_name ||
      claims.name ||
      (email && email.includes("@") ? email.split("@")[0] : "User");

    let user = await Auth.findOne({ quant0Sub: sub });

    // Link by email if existing
    if (!user && email) {
      user = await Auth.findOne({ email });
      if (user) {
        user.quant0Sub = sub;
        await user.save();
      }
    }

    // JIT provision new user
    if (!user) {
      let userNameCandidate = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
      if (userNameCandidate.length < 5) {
        userNameCandidate = `${userNameCandidate}_${Math.floor(1000 + Math.random() * 9000)}`;
      }
      if (userNameCandidate.length > 20) {
        userNameCandidate = userNameCandidate.substring(0, 20);
      }
      let existingUsername = await Auth.findOne({ userName: userNameCandidate });
      if (existingUsername) {
        userNameCandidate = `user_${Date.now().toString().slice(-6)}`;
      }

      user = await Auth.create({
        name,
        userName: userNameCandidate,
        email,
        quant0Sub: sub,
        role: "user",
      });
    }

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      userName: user.userName,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  quant0Session,
};
