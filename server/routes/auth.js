const { Router } = require("express");
const authController = require("../controllers/auth");

const router = Router();

// POST /api/auth/quant0-session
router.post("/quant0-session", authController.quant0Session);

module.exports = router;
