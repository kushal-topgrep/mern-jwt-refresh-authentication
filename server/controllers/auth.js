const jwt = require("jsonwebtoken");
const cookieOption = require("../config/cookieOption");
const { jwtSecret } = require("../config");
const authService = require("../services/auth");

// signup
const signup = async (req, res, next) => {
  try {
    const user = req.body;

    await authService.signupUser(user);

    res.status(201).json({ message: "Account created successfully!" });
  } catch (error) {
    next(error);
  }
};

// login
const login = async (req, res, next) => {
  const { userName, password } = req.body;

  const cookies = req.cookies;
  const cookiesToken = cookies?.refreshToken;

  try {
    const loggedInUser = await authService.login({ userName, password });

    let newRefreshTokenList = !cookiesToken
      ? loggedInUser.refreshToken || []
      : loggedInUser.refreshToken?.filter((rt) => rt !== cookiesToken) || [];

    if (cookiesToken) {
      const foundToken = await authService.findByProperty(
        "refreshToken",
        cookiesToken
      );

      // refresh token reuse detected
      if (!foundToken) newRefreshTokenList = [];

      // clear old cookie
      res.clearCookie("refreshToken", cookieOption);
    }

    // sign jwt
    const payload = {
      userId: loggedInUser._id.toString(),
      userName: loggedInUser.userName,
      role: loggedInUser.role,
    };

    const { accessToken, refreshToken } = authService.jwtSignIn(payload);

    // saving refreshToken with current user
    loggedInUser.refreshToken = [...newRefreshTokenList, refreshToken];
    await loggedInUser.save();

    // set new cookise
    res.cookie("refreshToken", refreshToken, cookieOption);

    res.json({ accessToken });
  } catch (error) {
    next(error);
  }
};

// refresh token
const refresh = async (req, res) => {
  const cookies = req.cookies;
  const cookiesToken = cookies?.refreshToken;

  if (!cookiesToken) {
    return res.status(401).json({ message: "Unauthorized!" });
  }

  // clear old cookie
  res.clearCookie("refreshToken", cookieOption);

  const foundUser = await authService.findByProperty(
    "refreshToken",
    cookiesToken
  );

  // Detected refresh token reuse
  if (!foundUser) {
    jwt.verify(cookiesToken, jwtSecret.refresh, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Forbidden!" });
      }

      const decodedId = decoded.userId;
      const hackedUser = await authService.findByProperty("_id", decodedId);

      if (hackedUser) {
        hackedUser.refreshToken = [];
        await hackedUser.save();
      }
    });

    return res.status(403).json({ message: "Forbidden!" });
  }

  const newRefreshTokenList =
    foundUser?.refreshToken?.filter((rt) => rt !== cookiesToken) || [];

  jwt.verify(cookiesToken, jwtSecret.refresh, async (err, decoded) => {
    if (err) {
      foundUser.refreshToken = [...newRefreshTokenList];
      await foundUser.save();
    }

    const decodedId = decoded.userId;

    if (err || foundUser?._id.toString() !== decodedId) {
      return res.status(403).json({ message: "Forbidden!" });
    }

    // sign jwt
    const payload = {
      userId: foundUser._id.toString(),
      userName: foundUser.userName,
      role: foundUser.role,
    };

    const jwtSign = authService.jwtSignIn(payload);

    // saving refreshToken with current user
    foundUser.refreshToken = [...newRefreshTokenList, jwtSign.refreshToken];
    await foundUser.save();

    // set cookie with refresh token
    res.cookie("refreshToken", jwtSign.refreshToken, cookieOption);

    res.json({ accessToken: jwtSign.accessToken });
  });
};

// logout
const logout = async (req, res) => {
  const cookies = req.cookies;
  const cookiesToken = cookies?.refreshToken;

  if (!cookiesToken) return res.status(204).json({ message: "No content!" });

  res.clearCookie("refreshToken", cookieOption);

  const foundUser = await authService.findByProperty(
    "refreshToken",
    cookiesToken
  );

  if (!foundUser) {
    return res.status(204).json({ message: "No content!" });
  }

  // remove refreshToken from DB
  foundUser.refreshToken = foundUser.refreshToken.filter(
    (rt) => rt !== cookiesToken
  );
  await foundUser.save();

  res.status(204).json({ message: "No content!" });
};

const { verifyToken, fetchMe } = require("../helpers/quant0");

// quant0-session bootstrap
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

    const Auth = require("../models/Auth");

    let user = await Auth.findOne({ quant0Sub: sub });

    if (!user && email) {
      user = await Auth.findOne({ email });
      if (user) {
        user.quant0Sub = sub;
        await user.save();
      }
    }

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
  signup,
  login,
  refresh,
  logout,
  quant0Session,
};
