const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config");
const { verifyToken } = require("../helpers/quant0");
const Auth = require("../models/Auth");

const isAuth = (role) => async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized!" });
    }

    const token = authHeader.split(" ")[1];

    let userObj = null;

    // 1. Try local JWT verify first
    try {
      const decoded = jwt.verify(token, jwtSecret.access);
      userObj = decoded;
    } catch (localJwtErr) {
      // 2. Fall back to Quant0 token verification
      try {
        const claims = await verifyToken(token);
        const sub = claims.subject || claims.sub;
        const dbUser = await Auth.findOne({ quant0Sub: sub });

        if (dbUser) {
          userObj = {
            userId: dbUser._id.toString(),
            userName: dbUser.userName,
            role: dbUser.role || "user",
          };
          req.quant0User = dbUser;
          req.quant0Claims = claims;
        } else {
          userObj = {
            userId: sub,
            userName: claims.name || claims.email?.split("@")[0] || sub,
            role: "user",
          };
        }
      } catch (quant0Err) {
        return res.status(403).json({ message: "Invalid token!" });
      }
    }

    if (!userObj) {
      return res.status(403).json({ message: "Invalid token!" });
    }

    req.user = userObj;

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

