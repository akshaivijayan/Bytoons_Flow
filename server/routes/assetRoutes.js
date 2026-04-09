const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

router.get('/', auth, assetController.getAssets);
router.post('/', auth, isAdmin, assetController.createAsset);
router.put('/:id', auth, isAdmin, assetController.updateAsset);
router.delete('/:id', auth, isAdmin, assetController.deleteAsset);

module.exports = router;
