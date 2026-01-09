const express = require('express');
const router = express.Router();
const instructorRequestController = require('../controllers/instructorRequestController');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Middleware to set req.user from JWT
router.use(async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
});

router.post('/apply', instructorRequestController.apply);
router.get('/', instructorRequestController.list);
router.put('/:id/approve', instructorRequestController.approve);
router.delete("/deleteInstructor/:id",instructorRequestController.deleteInstructor)
router.put('/:id/reject', instructorRequestController.reject);

module.exports = router; 