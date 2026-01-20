// Middleware to allow only instructors
module.exports = function requireInstructor(req, res, next) {
  if (!req.user || (req.user.role !== 'instructor' && req.user.role !== 'admin')) {
    return res.status(403).json({ message: 'Access denied. Instructor only.' });
  }
  next();
} 