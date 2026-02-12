const User = require("../models/user");
const OTP = require("../models/OTP");

// SEND OTP
exports.sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.deleteMany({ phone });

    await OTP.create({
      phone,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    console.log("Generated OTP:", otp);

    res.json({ message: "OTP sent successfully ✅" });

  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};


// VERIFY OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { phone, otp, deviceId, deviceName } = req.body;

    const existingOTP = await OTP.findOne({ phone, otp });

    if (!existingOTP) {
      return res.status(400).json({ message: "Invalid OTP ❌" });
    }

    if (existingOTP.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired ❌" });
    }

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({ phone });
    }

    // Add device if not exists
    const deviceExists = user.devices.find(
      (d) => d.deviceId === deviceId
    );

    if (!deviceExists) {
      user.devices.push({
        deviceId,
        deviceName,
        lastActive: new Date(),
      });

      await user.save();
    }

    await OTP.deleteMany({ phone });

    res.json({
      message: "Login successful ✅",
      userId: user._id,
    });

  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
