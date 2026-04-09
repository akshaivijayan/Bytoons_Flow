const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

router.get('/', auth, categoryController.getCategories);
router.post('/', auth, isAdmin, categoryController.createCategory);
router.delete('/:id', auth, isAdmin, categoryController.deleteCategory);

module.exports = router;
