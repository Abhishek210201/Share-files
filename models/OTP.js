const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // Auto-delete when expires
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// Index for faster OTP verification
otpSchema.index({ phone: 1, otp: 1 });

module.exports = mongoose.model("OTP", otpSchema);
