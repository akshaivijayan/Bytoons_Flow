const { Department } = require('../models');
const { isNonEmptyString } = require('../utils/validation');

exports.getDepartments = async (req, res) => {
    try {
        const departments = await Department.find();
        res.json(departments);
    } catch (err) {
        console.error('getDepartments error:', err);
        res.status(500).send('Server Error');
    }
};

exports.createDepartment = async (req, res) => {
    try {
        const { code, name, description } = req.body;
        if (!isNonEmptyString(code) || !isNonEmptyString(name)) {
            return res.status(400).json({ message: 'Code and name are required' });
        }

        const newDept = Department({ code, name, description });
        const dept = await newDept.save();
        res.json(dept);
    } catch (err) {
        console.error('createDepartment error:', err);
        res.status(500).send('Server Error');
    }
};
exports.deleteDepartment = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) return res.status(404).json({ message: 'Department not found' });

        await Department.findByIdAndDelete(req.params.id);
        res.json({ message: 'Department removed' });
    } catch (err) {
        console.error('deleteDepartment error:', err);
        res.status(500).send('Server Error');
    }
};
