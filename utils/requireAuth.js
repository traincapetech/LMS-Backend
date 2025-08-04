const jwt = require('jsonwebtoken');
const User = require('../models/User');

const requireAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('No token provided in request');
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    console.log('Token received:', token.substring(0, 20) + '...');

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('Token decoded:', { userId: decoded.userId, role: decoded.role });
    
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      console.log('User not found for ID:', decoded.userId);
      return res.status(401).json({ message: 'Invalid token. User not found.' });
    }

    console.log('User authenticated:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ message: 'Invalid token.' });
  }
};

module.exports = requireAuth; 