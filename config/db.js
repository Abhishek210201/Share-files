const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected (Atlas) ✅");
  } catch (error) {
    console.log("DB ERROR:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
