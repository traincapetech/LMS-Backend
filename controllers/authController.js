const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOtpEmail } = require('../utils/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

exports.signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role: role || 'student' });
    await user.save();
    // Generate JWT and return user (excluding password)
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const userObj = { name: user.name, email: user.email, role: user.role };
    return res.status(201).json({ message: 'User registered successfully.', token, user: userObj });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('=== BACKEND LOGIN DEBUG ===');
    console.log('Login attempt for email:', email);
    
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ message: 'All fields are required.' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(400).json({ message: 'Invalid credentials.' });
    }
    
    console.log('User found:', user.email, 'Role:', user.role);
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch for user:', email);
      return res.status(400).json({ message: 'Invalid credentials.' });
    }
    
    console.log('Password verified successfully');
    
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    console.log('Token generated, length:', token.length);
    console.log('Token preview:', token.substring(0, 20) + '...');
    
    const responseData = { token, user: { name: user.name, email: user.email, role: user.role } };
    console.log('Sending response with token');
    
    return res.status(200).json(responseData);
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// Forgot Password: Send OTP
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 10 * 60 * 1000; // 10 min expiry
    await user.save();
    
    // Send OTP via email
    const emailSent = await sendOtpEmail(email, otp, 'password-reset');
    
    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send OTP email. Please try again.' });
    }
    
    return res.status(200).json({ message: 'OTP sent to your email.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

// Verify OTP (for password reset)
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required.' });
  try {
    const user = await User.findOne({ email });
    if (!user || !user.resetOtp || !user.resetOtpExpires) return res.status(400).json({ message: 'Invalid or expired OTP.' });
    if (user.resetOtp !== otp) return res.status(400).json({ message: 'Incorrect OTP.' });
    if (user.resetOtpExpires < Date.now()) return res.status(400).json({ message: 'OTP expired.' });
    user.otpVerifiedForReset = true;
    await user.save();
    return res.status(200).json({ message: 'OTP verified successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

// Reset Password: Only allow if OTP was verified
exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) return res.status(400).json({ message: 'All fields are required.' });
  try {
    const user = await User.findOne({ email });
    if (!user || !user.otpVerifiedForReset) return res.status(400).json({ message: 'OTP not verified.' });
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    user.otpVerifiedForReset = undefined;
    await user.save();
    return res.status(200).json({ message: 'Password reset successful.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
}; 