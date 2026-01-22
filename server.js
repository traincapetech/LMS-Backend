const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const User = require("./models/User");
const bcrypt = require("bcryptjs");

dotenv.config();

// Debug environment variables
console.log("🔍 Environment variables check:");
console.log("MONGO_URI:", process.env.MONGO_URI ? "✅ Set" : "❌ Not set");
console.log("PORT:", process.env.PORT || "5000 (default)");
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "✅ Set" : "❌ Not set");
console.log("\n📦 R2 Storage Configuration:");
console.log("R2_ENDPOINT:", process.env.R2_ENDPOINT ? `✅ Set (${process.env.R2_ENDPOINT.substring(0, 30)}...)` : "❌ Not set");
console.log("R2_ACCESS_KEY_ID:", process.env.R2_ACCESS_KEY_ID ? "✅ Set" : "❌ Not set");
console.log("R2_SECRET_ACCESS_KEY:", process.env.R2_SECRET_ACCESS_KEY ? "✅ Set" : "❌ Not set");
console.log("R2_BUCKET_VIDEOS:", process.env.R2_BUCKET_VIDEOS ? `✅ Set ("${process.env.R2_BUCKET_VIDEOS}")` : "❌ Not set");
console.log("R2_BUCKET_DOCS:", process.env.R2_BUCKET_DOCS ? `✅ Set ("${process.env.R2_BUCKET_DOCS}")` : "❌ Not set");
console.log("R2_BUCKET_IMAGES:", process.env.R2_BUCKET_IMAGES ? `✅ Set ("${process.env.R2_BUCKET_IMAGES}")` : "❌ Not set");
console.log("R2_PUBLIC_URL_VIDEOS:", process.env.R2_PUBLIC_URL_VIDEOS ? `✅ Set ("${process.env.R2_PUBLIC_URL_VIDEOS}")` : "❌ Not set");
console.log("R2_PUBLIC_URL_DOCS:", process.env.R2_PUBLIC_URL_DOCS ? `✅ Set ("${process.env.R2_PUBLIC_URL_DOCS}")` : "❌ Not set");
console.log("R2_PUBLIC_URL_IMAGES:", process.env.R2_PUBLIC_URL_IMAGES ? `✅ Set ("${process.env.R2_PUBLIC_URL_IMAGES}")` : "❌ Not set");

// Initialize server after environment variables are loaded
const initializeServer = async () => {
  try {
    console.log("🔄 Attempting to connect to MongoDB...");
    await connectDB();
    console.log("🔄 Setting up admin user...");
    await ensureAdminUser();
    console.log("✅ Server initialization complete");
  } catch (error) {
    console.error("❌ Server initialization failed:", error.message);
    console.log("🔄 Retrying in 5 seconds...");
    setTimeout(initializeServer, 5000);
  }
};

// Start server initialization
initializeServer();

async function ensureAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@traincape.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = new User({
      name: "Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
    });
    await admin.save();
    console.log("✅ Admin user created");
  } else {
    admin.password = hashedPassword;
    admin.role = "admin";
    await admin.save();
    console.log("✅ Admin user password and role updated");
  }
}

const app = express();

// Configure CORS properly
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://cognify.traincapetech.in",
  "https://www.cognify.traincapetech.in",
];

// Add Render URL from environment variable if set
if (process.env.RENDER_URL) {
  allowedOrigins.push(process.env.RENDER_URL);
}

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Last-Check"],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.use(express.json({ limit: "5mb" }));

// Handle preflight requests
app.options("*", cors());

app.use("/uploads", express.static("uploads"));
app.use("/api/upload", require("./routes/uploadRoutes"));

// Routes
app.use("/api", require("./routes/otpRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/profile", require("./routes/profileRoutes"));
app.use(
  "/api/instructor-requests",
  require("./routes/instructorRequestRoutes")
);
app.use("/api/courses", require("./routes/courseRoutes"));
app.use("/api/pending-courses", require("./routes/pendingCourseRoutes"));
app.use("/api/cart", require("./routes/cartRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/coupons", require("./routes/couponRoutes"));
app.use(
  "/api/quizzes/:quizId/questions",
  require("./routes/quizQuestion&Option")
);
app.use("/api/quizzes/:quizId/results", require("./routes/quizResultRoute"));
app.use("/api/quizzes", require("./routes/quizRoute"));
app.use("/api/newsletter", require("./routes/newsletterRoutes"));
app.use("/api/public", require("./routes/publicRoutes"));
app.use("/api/enrollments", require("./routes/enrollmentRoutes"));
app.use("/api/progress", require("./routes/progressRoutes"));
app.use("/api/discussion", require("./routes/discussionRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/questions", require("./routes/questionRoutes"));
app.use("/api/notes", require("./routes/noteRoutes"));
app.use("/api/certificate", require("./routes/certificateRoutes"));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// 404 handler
app.use("*", (req, res) => {
  const isRootProbe =
    req.path === "/" && (req.method === "GET" || req.method === "HEAD");
  if (!isRootProbe) {
    console.log("❌ 404 - Route not found:", {
      method: req.method,
      url: req.originalUrl,
      path: req.path,
      headers: {
        origin: req.headers.origin,
        "content-type": req.headers["content-type"],
      },
    });
  }
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
    method: req.method,
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
