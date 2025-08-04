const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not set');
    }
    
    console.log('🔄 Connecting to MongoDB Atlas...');
    console.log('📍 Connection string:', process.env.MONGO_URI.substring(0, 50) + '...');
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });
    console.log("✅ MongoDB Atlas connected successfully");
  } catch (error) {
    console.error("❌ MongoDB Atlas connection failed:", error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Tip: Check if your IP is whitelisted in Atlas Network Access');
    } else if (error.message.includes('Authentication failed')) {
      console.log('💡 Tip: Check your username and password in Atlas Database Access');
    }
    throw error;
  }
};

module.exports = connectDB;
