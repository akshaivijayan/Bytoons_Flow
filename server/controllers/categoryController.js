const { Category } = require('../models');
const { isNonEmptyString } = require('../utils/validation');

exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.json(categories);
    } catch (err) {
        console.error('getCategories error:', err);
        res.status(500).send('Server Error');
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { code, name, description } = req.body;
        if (!isNonEmptyString(code) || !isNonEmptyString(name)) {
            return res.status(400).json({ message: 'Code and name are required' });
        }

        const newCat = Category({ code, name, description });
        const cat = await newCat.save();
        res.json(cat);
    } catch (err) {
        console.error('createCategory error:', err);
        res.status(500).send('Server Error');
    }
};
exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });

        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: 'Category removed' });
    } catch (err) {
        console.error('deleteCategory error:', err);
        res.status(500).send('Server Error');
    }
};
