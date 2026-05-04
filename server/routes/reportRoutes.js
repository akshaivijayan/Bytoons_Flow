const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/auth');

// GET /api/reports/data - Core data mining for reports (JSON Preview - Protected)
router.get('/data', auth, (req, res) => reportController.getData(req, res));

// GET /api/reports/export - Server-side CSV Export (Protected)
router.get('/export', auth, (req, res) => reportController.exportCSV(req, res));

module.exports = router;
