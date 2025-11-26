const mongoose = require("mongoose");

const InstructorSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  isSubscribed: { type: Boolean, default: false },
  otp: { type: String },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Instructor", InstructorSchema);
