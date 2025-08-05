const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms');
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Create admin user
const createAdminUser = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'vikasdev518@gmail.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists with email: vikasdev518@gmail.com');
      console.log('📧 Email:', existingAdmin.email);
      console.log('👤 Name:', existingAdmin.name);
      console.log('🔑 Role:', existingAdmin.role);
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('Vikas@2006', 10);

    // Create admin user
    const adminUser = new User({
      name: 'Vikas Dev',
      email: 'vikasdev518@gmail.com',
      password: hashedPassword,
      role: 'admin'
    });

    await adminUser.save();
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: vikasdev518@gmail.com');
    console.log('🔑 Password: Vikas@2006');
    console.log('👤 Name: Vikas Dev');
    console.log('🔑 Role: admin');
    console.log('\n🎉 You can now login as admin with these credentials!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  }
};

// Run the script
const run = async () => {
  console.log('🚀 Creating admin user...');
  await connectDB();
  await createAdminUser();
  mongoose.connection.close();
  console.log('✅ Script completed!');
};

// Run if this file is executed directly
if (require.main === module) {
  run();
}

module.exports = { createAdminUser }; 