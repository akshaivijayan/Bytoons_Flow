const db = require('./server/database');
const { User } = require('./server/models');

async function testStartup() {
    console.log('--- STARTING STARTUP VERIFICATION ---');
    try {
        // 1. Check if extensions are attached
        if (typeof db.getOne !== 'function') throw new Error('db.getOne is missing');
        console.log('[OK] Database extensions attached.');

        // 2. Check if admin exists (this tests if tables were created and seed/bootstrap ran)
        const admin = await User.findOne({ email: 'admin@bytoons.com' });
        if (!admin) {
            console.log('[WAIT] Admin not found yet. It might be seeding. Retrying in 2s...');
            setTimeout(testStartup, 2000);
            return;
        }
        console.log('[OK] Admin user found:', admin.name);
        console.log('[SUCCESS] Startup sequence verified.');
        process.exit(0);
    } catch (err) {
        console.error('[FAILURE] Startup check failed:', err.message);
        process.exit(1);
    }
}

// Initial delay to allow the async DB constructor to start
setTimeout(testStartup, 1000);
