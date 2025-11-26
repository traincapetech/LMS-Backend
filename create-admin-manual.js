const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const createAdminUser = async () => {
  try {
    console.log('🚀 Creating admin user manually...');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'vikasdev518@gmail.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists, updating password...');
      const hashedPassword = await bcrypt.hash('Vikas@2006', 10);
      existingAdmin.password = hashedPassword;
      existingAdmin.role = 'admin';
      existingAdmin.name = 'Vikas Dev';
      await existingAdmin.save();
      console.log('✅ Admin user updated successfully!');
    } else {
      console.log('📝 Creating new admin user...');
      const hashedPassword = await bcrypt.hash('Vikas@2006', 10);
      
      const adminUser = new User({
        name: 'Vikas Dev',
        email: 'vikasdev518@gmail.com',
        password: hashedPassword,
        role: 'admin'
      });
      
      await adminUser.save();
      console.log('✅ Admin user created successfully!');
    }
    
    console.log('📧 Email: vikasdev518@gmail.com');
    console.log('🔑 Password: Vikas@2006');
    console.log('👤 Name: Vikas Dev');
    console.log('🔑 Role: admin');
    console.log('🎉 You can now login as admin!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  }
};

const run = async () => {
  await connectDB();
  await createAdminUser();
  mongoose.connection.close();
  console.log('✅ Script completed!');
};

run();