const mongoose = require("mongoose");

const linksSchema = new mongoose.Schema(
  {
    website: String,
    facebook: String,
    instagram: String,
    linkedin: String,
    tiktok: String,
    x: String,
    youtube: String,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["student", "instructor", "admin"],
      default: "student",
    },
    headline: { type: String, trim: true },
    bio: { type: String, trim: true },
    language: { type: String, trim: true },
    links: linksSchema,
    photoUrl: { type: String },
    notifications: [
      {
        message: String,
        type: { type: String }, // e.g., 'instructor-request', 'admin', etc.
        read: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    resetOtp: { type: String },
    resetOtpExpires: { type: Date },
    otpVerifiedForReset: { type: Boolean },
    isVerified: { type: Boolean, default: false },
    verificationOtp: { type: String },
    verificationOtpExpires: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
