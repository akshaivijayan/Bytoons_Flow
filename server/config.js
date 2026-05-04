const crypto = require('crypto');

const nodeEnv = process.env.NODE_ENV || 'development';
let jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
    if (nodeEnv === 'production') {
        const errorMsg = 'CRITICAL CONFIG ERROR: JWT_SECRET must be set in production for security. ' +
                         'Please add JWT_SECRET to your environment variables in the Hostinger panel.';
        console.error(`\n[FATAL] ${errorMsg}\n`);
        throw new Error(errorMsg);
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

if (nodeEnv === 'production') {
    if (!config.adminEmail || !config.adminPassword) {
        console.warn('[WARN] Admin credentials not fully configured for production. Defaulting to empty strings which may block login.');
    }
}

module.exports = config;
