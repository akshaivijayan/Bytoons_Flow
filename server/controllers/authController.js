const { User } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { isNonEmptyString, isValidEmail } = require('../utils/validation');

// Register User
exports.register = async (req, res) => {
    try {
        if (config.nodeEnv === 'production' && !config.allowRegistration) {
            return res.status(403).json({ message: 'Registration disabled' });
        }

        const { name, email, password } = req.body;
        const emailNorm = typeof email === 'string' ? email.trim().toLowerCase() : '';
        const nameNorm = typeof name === 'string' ? name.trim() : '';
        const passwordNorm = typeof password === 'string' ? password : '';
        if (!isNonEmptyString(nameNorm) || !isValidEmail(emailNorm) || !isNonEmptyString(passwordNorm)) {
            return res.status(400).json({ message: 'Invalid registration payload' });
        }
        if (passwordNorm.trim().length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }

        let user = await User.findOne({ email: emailNorm });
        if (user) return res.status(400).json({ message: 'User already exists' });

        // Hash password before saving (SQLite layer has no pre-save hook)
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = User({ 
            name: nameNorm, 
            email: emailNorm, 
            password: hashedPassword,
            role: 'admin' // Ensure all users are created with admin role for current internal requirements
        });
        await newUser.save();

        const payload = { user: { id: newUser.id } };
        jwt.sign(payload, config.jwtSecret, { expiresIn: '8h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email } });
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).send('Server Error');
    }
};

// Login User
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const emailNorm = typeof email === 'string' ? email.trim().toLowerCase() : '';
        const passwordNorm = typeof password === 'string' ? password : '';
        if (!isValidEmail(emailNorm) || !isNonEmptyString(passwordNorm)) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const user = await User.findOne({ email: emailNorm });
        if (!user) return res.status(400).json({ message: 'Invalid Credentials' });

        const isMatch = await bcrypt.compare(passwordNorm, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid Credentials' });

        const payload = { user: { id: user.id, role: user.role } };
        jwt.sign(payload, config.jwtSecret, { expiresIn: '8h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).send('Server Error');
    }
};
