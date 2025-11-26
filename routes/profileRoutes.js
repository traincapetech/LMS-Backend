const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);
router.get('/instructors', profileController.getInstructors);

module.exports = router; 