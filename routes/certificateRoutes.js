/**
 * Certificate Routes
 * 
 * Routes for certificate operations:
 * - GET /data/:courseId - Get certificate data for preview (Auth required)
 * - GET /download/:courseId - Download PDF certificate (Auth required)
 */

const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const requireAuth = require('../utils/requireAuth');

// Protected routes - Auth required
router.get('/data/:courseId', requireAuth, certificateController.getCertificateData);
router.get('/download/:courseId', requireAuth, certificateController.downloadCertificate);

module.exports = router;
