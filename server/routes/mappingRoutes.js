const express = require('express');
const router = express.Router();
const mappingController = require('../controllers/mappingController');
const auth = require('../middleware/auth');

// GET /api/mapping/history - Fetch full historical audit trail (Protected)
router.get('/history', auth, (req, res) => mappingController.getHistory(req, res));

module.exports = router;
