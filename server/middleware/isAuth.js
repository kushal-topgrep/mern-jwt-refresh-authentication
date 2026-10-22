const { verifyToken } = require("../helpers/quant0");
const Auth = require("../models/Auth");

/**
 * Protect middleware: Exclusively verifies Quant0 Bearer tokens.
 * Legacy JWT cookies and local password session verification have been removed.
 */
const isAuth = (role) => async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized: Missing Quant0 Bearer token" });
    }

    const token = authHeader.split(" ")[1];
    let claims;
    try {
      claims = await verifyToken(token);
    } catch (err) {
      return res.status(401).json({ message: `Not authorized: ${err.message}` });
    }

    const sub = claims.subject || claims.sub;
    const dbUser = await Auth.findOne({ quant0Sub: sub });

    const userObj = dbUser
      ? {
          userId: dbUser._id.toString(),
          userName: dbUser.userName,
          role: dbUser.role || "user",
          email: dbUser.email,
        }
      : {
          userId: sub,
          userName: claims.name || claims.email?.split("@")[0] || sub,
          role: "user",
          email: claims.email,
        };

    req.user = userObj;
    req.token = token;
    req.claims = claims;

    if (role === "allowAll") return next();

    if (role !== userObj.role) {
      req.user = undefined;
      return res
        .status(403)
        .json({ message: "You are not authorized to view this page" });
    }

    next();
  } catch (error) {
    res.status(403).json({ message: "Invalid token!" });
  }
};

module.exports = isAuth;
