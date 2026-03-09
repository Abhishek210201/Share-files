const User = require("../models/user");
const OTP = require("../models/OTP");

// SEND OTP
exports.sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    // Validate phone number
    if (!phone || phone.length < 10) {
      return res.status(400).json({ error: "Invalid phone number" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing OTPs for this phone
    await OTP.deleteMany({ phone });

    // Create new OTP with 5-minute expiration
    await OTP.create({
      phone,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    console.log(`📧 OTP generated for ${phone}: ${otp}`);

    // TODO: In production, use a real SMS service like Twilio
    // For now, returning OTP in response for testing
    res.json({
      message: "OTP sent successfully",
      otp: otp // Remove this in production
    });

  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

// VERIFY OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { phone, otp, deviceId, deviceName } = req.body;

    // Validate input
    if (!phone || !otp || !deviceId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Find OTP
    const existingOTP = await OTP.findOne({ phone, otp });

    if (!existingOTP) {
      return res.status(400).json({ message: "Invalid OTP ❌" });
    }

    // Check if OTP expired
    if (existingOTP.expiresAt < new Date()) {
      await OTP.deleteMany({ phone });
      return res.status(400).json({ message: "OTP expired ❌" });
    }

    // Find or create user
    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({ phone });
      console.log(`✅ New user created: ${phone}`);
    }

    // Add or update device
    const deviceIndex = user.devices.findIndex(
      (d) => d.deviceId === deviceId
    );

    if (deviceIndex === -1) {
      // New device
      user.devices.push({
        deviceId,
        deviceName: deviceName || "Unknown",
        lastActive: new Date(),
      });
    } else {
      // Update existing device
      user.devices[deviceIndex].lastActive = new Date();
      user.devices[deviceIndex].deviceName = deviceName || user.devices[deviceIndex].deviceName;
    }

    await user.save();

    // Clean up used OTP
    await OTP.deleteMany({ phone });

    console.log(`✅ Login successful for ${phone} on ${deviceName}`);

    res.json({
      message: "Login successful ✅",
      userId: user._id,
      deviceCount: user.devices.length
    });

  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ error: "Verification failed" });
  }
};

// Get user devices (optional feature)
exports.getUserDevices = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      devices: user.devices,
      phone: user.phone
    });

  } catch (error) {
    console.error("Get devices error:", error);
    res.status(500).json({ error: "Failed to fetch devices" });
  }
};
