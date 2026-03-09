const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  devices: [
    {
      deviceId: {
        type: String,
        required: true,
      },
      deviceName: {
        type: String,
        default: "Unknown Device",
      },
      lastActive: {
        type: Date,
        default: Date.now,
      },
      addedAt: {
        type: Date,
        default: Date.now,
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  }
});

// Update lastLogin on save
userSchema.pre('save', function(next) {
  this.lastLogin = new Date();
  next();
});

module.exports = mongoose.model("User", userSchema);
