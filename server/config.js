const crypto = require('crypto');

const nodeEnv = process.env.NODE_ENV || 'development';
let jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
    if (nodeEnv === 'production') {
        throw new Error('JWT_SECRET must be set in production');
    }
    jwtSecret = `dev-${crypto.randomBytes(16).toString('hex')}`;
    console.warn('[WARN] JWT_SECRET not set. Using a random dev secret (tokens reset on restart).');
}

const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

const config = {
    nodeEnv,
    port: Number(process.env.PORT || 5000),
    jwtSecret,
    corsOrigins,
    allowRegistration: process.env.ALLOW_REGISTRATION === 'true',
    adminEmail: process.env.ADMIN_EMAIL || (nodeEnv !== 'production' ? 'admin@bytoons.com' : ''),
    adminPassword: process.env.ADMIN_PASSWORD || (nodeEnv !== 'production' ? 'password123' : '')
};

module.exports = config;
