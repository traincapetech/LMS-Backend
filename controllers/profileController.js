const User = require("../models/User");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// Middleware to get user from JWT
function getUserFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  try {
    const decoded = jwt.verify(auth.split(" ")[1], JWT_SECRET);
    return decoded.userId;
  } catch {
    return null;
  }
}

exports.getProfile = async (req, res) => {
  const userId = getUserFromToken(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const user = await User.findById(userId).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
};

exports.updateProfile = async (req, res) => {
  const userId = getUserFromToken(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const update = req.body;
  try {
    const user = await User.findByIdAndUpdate(userId, update, {
      new: true,
      runValidators: true,
    }).select("-password");
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: "Update failed", error: err.message });
  }
};

exports.getInstructors = async (req, res) => {
  try {
    const instructors = await User.find({ role: "instructor" });
    res.json(instructors);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch instructors", error: err.message });
  }
};

exports.getWishlist = async (req, res) => {
  const userId = getUserFromToken(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const user = await User.findById(userId).populate("wishlist");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user.wishlist);
};

exports.addToWishlist = async (req, res) => {
  const userId = getUserFromToken(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const { courseId } = req.body;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (!user.wishlist.includes(courseId)) {
    user.wishlist.push(courseId);
    await user.save();
  }

  await user.populate("wishlist");
  res.json(user.wishlist);
};

exports.removeFromWishlist = async (req, res) => {
  const userId = getUserFromToken(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const { courseId } = req.params;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.wishlist = user.wishlist.filter((id) => id.toString() !== courseId);
  await user.save();

  await user.populate("wishlist");
  res.json(user.wishlist);
};
