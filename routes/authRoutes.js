const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

// OTP routes
router.post("/send-otp", authController.sendOTP);
router.post("/verify-otp", authController.verifyOTP);

// Optional: Get user devices
router.get("/devices/:userId", authController.getUserDevices);

module.exports = router;
