const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 1. Initial Configuration Load
dotenv.config({ path: path.join(__dirname, '.env') });
const config = require('./config');

// --- CRITICAL ERROR PROTECTION ---
process.on('uncaughtException', (err) => {
    console.error('--- [FATAL] UNCAUGHT EXCEPTION ---');
    console.error(err.stack || err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('--- [FATAL] UNHANDLED REJECTION ---');
    console.error('At:', promise, 'reason:', reason);
});

const app = express();

// 2. Structured Global Logger Utility
const logger = {
    info: (msg) => console.log(`--- [INFO] ${new Date().toISOString()} | ${msg}`),
    warn: (msg) => console.warn(`--- [WARN] ${new Date().toISOString()} | ${msg}`),
    error: (msg, err) => console.error(`--- [ERROR] ${new Date().toISOString()} | ${msg}`, err)
};

// 3. Middle-ware Stack: Security First
app.disable('x-powered-by');
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "https://cdn.tailwindcss.com", "'unsafe-inline'"],
            "script-src-attr": ["'none'"], // Disallow inline script attributes for maximum security
            "style-src": ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
            "font-src": ["'self'", "https://fonts.gstatic.com"],
            "img-src": ["'self'", "data:", "https://www.transparenttextures.com"],
            "connect-src": ["'self'"],
            "object-src": ["'none'"], // Preventive boundary against plugin-based exploits
            "frame-ancestors": ["'none'"] // Prevent clickjacking
        }
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Global Rate Limiter: Protect all API endpoints
const apiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 200, // Limit each IP to 200 requests per window
    message: { message: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// 4. CORS Strategy
const corsOrigins = config.corsOrigins;
app.use(cors({
    origin: (origin, cb) => {
        // 1. Allow if no origin (server-to-server, curl, etc.)
        if (!origin) return cb(null, true);
        
        // 2. Allow if in explicit list
        if (corsOrigins.includes(origin)) return cb(null, true);
        
        // 3. Allow same-origin/subdomain for Hostinger deployments
        const isHostinger = origin.includes('hostingersite.com');
        
        if (config.nodeEnv !== 'production' || isHostinger || corsOrigins.length === 0) {
            return cb(null, true);
        }
        
        return cb(new Error('CORS blocked'), false);
    },
    credentials: true
}));

// 5. Request Logging (Non-Production Only)
if (config.nodeEnv !== 'production') {
    app.use((req, res, next) => {
        logger.info(`${req.method} ${req.url}`);
        next();
    });
}

// 6. Static Asset Delivery
// Support multiple directory names common in shared hosting (public, public_html, etc)
const getStaticPath = () => {
    const dirs = ['public', 'public_html', 'public.html'];
    for (const dir of dirs) {
        const fullPath = path.join(__dirname, '..', dir);
        if (fs.existsSync(fullPath)) return fullPath;
    }
    return path.join(__dirname, '..', 'public'); // Default fallback
};

app.use(express.static(getStaticPath()));

// Dedicated Favicon route to prevent 404s
app.get('/favicon.ico', (req, res) => {
    const iconPath = path.join(getStaticPath(), 'favicon.ico');
    if (fs.existsSync(iconPath)) {
        res.sendFile(iconPath);
    } else {
        res.status(204).end(); // No content, but not a 404 error
    }
});

// 7. Core Application Routes
const auth = require('./middleware/auth');
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

app.get('/debug-health', (req, res) => res.json({ 
    status: 'Express is running!', 
    env: config.nodeEnv, 
    port: config.port,
    db_exists: fs.existsSync(path.join(__dirname, 'db.sqlite'))
}));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

app.use('/api', apiLimiter); // Apply general rate limit to all /api routes
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/assets', require('./routes/assetRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/managers', require('./routes/managerRoutes'));
app.use('/api/audit', require('./routes/auditRoutes'));
app.use('/api/mapping', require('./routes/mappingRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// 8. Dynamic Dashboard Stats (Relational Engine)
const { Asset, Employee } = require('./models');
const isAdmin = require('./middleware/isAdmin');
app.get('/api/stats', auth, async (req, res, next) => {
    try {
        const [totalAssets, equippedAssets, maintenanceAssets, totalEmployees, totalManagers] = await Promise.all([
            Asset.countDocuments(),
            Asset.countDocuments({ assetStatus: 'IN USE' }),
            Asset.countDocuments({ assetStatus: 'MAINTENANCE' }),
            Employee.countDocuments(),
            (require('./models').Manager.countDocuments())
        ]);

        const allAssets = await Asset.find();
        const categories = {};
        allAssets.forEach(a => categories[a.assetCategory] = (categories[a.assetCategory] || 0) + 1);

        const allEmployees = await Employee.find();
        const departments = {};
        allEmployees.forEach(e => { if (e.department) departments[e.department] = (departments[e.department] || 0) + 1; });

        res.json({
            totalAssets,
            totalEquipped: equippedAssets,
            remainingAssets: totalAssets - equippedAssets,
            maintenanceCount: maintenanceAssets,
            totalEmployees,
            totalManagers,
            categories,
            departments
        });
    } catch (err) { next(err); }
});

// 9. Centralized Production Error Handler
app.use((err, req, res, next) => {
    logger.error(`${req.method} ${req.url} failed:`, err.message);
    
    if (err.message === 'CORS blocked') {
        return res.status(403).json({ 
            message: 'Dynamic security policy blocked the connection',
            hint: 'To allow this domain, set the CORS_ORIGINS environment variable in your Hostinger panel to include this origin.'
        });
    }

    // Sanitize error response for production
    const status = err.status || 500;
    const isConstraintError = err.message.includes('SQLITE_CONSTRAINT');
    
    res.status(status).json({
        message: config.nodeEnv === 'production' 
            ? (isConstraintError ? 'Data collision or integrity violation' : 'An internal operational error occurred. Systems are stable.') 
            : err.message,
        id: crypto.randomUUID().substring(0, 8) // Tracking ID for logs
    });
});

// 10. Database Integrity Check (Self-Healing)
const repairRoles = async () => {
    try {
        const db = require('./database');
        // We use raw SQL because the ORM countDocuments doesn't handle IS NULL correctly yet
        const result = await db.execute("UPDATE users SET role = 'admin' WHERE role IS NULL OR role = ''");
        if (result.changes > 0) {
            console.log(`--- [SYS] REPAIR COMPLETE: Restored administrative privileges for ${result.changes} users ---`);
        }
    } catch (err) {
        console.error('--- [ERR] Role repair failed:', err.message);
    }
};
repairRoles();

// 11. Process Management
// Hostinger/Shared hosting often requires binding to 0.0.0.0
const server = app.listen(config.port, '0.0.0.0', () => {
    logger.info(`SERVER ACTIVE ON PORT: ${config.port}`);
    logger.info(`PLATFORM STATUS: OPERATIONAL [${config.nodeEnv.toUpperCase()}]`);
    logger.info(`DATABASE STATUS: ${fs.existsSync(path.join(__dirname, 'db.sqlite')) ? 'READY' : 'PENDING'}`);
});

const shutdown = () => {
    logger.warn('SHUTDOWN SIGNAL RECEIVED. STANDING BY...');
    server.close(() => {
        logger.info('APPLICATION CLOSED GRACEFULLY. DATABASE PERSISTED.');
        process.exit(0);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = app;
