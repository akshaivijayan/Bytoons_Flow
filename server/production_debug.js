/**
 * Bytoons Flow - Hostinger Deployment Debugger
 * Run this script via SSH or Node.js Selector to verify environment compatibility.
 * Usage: node server/production_debug.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n--- BYTOONS FLOW: HOSTINGER DEPLOYMENT DEBUGGER ---\n');

// 1. Check Node.js Environment
console.log('1. RUNTIME CHECK:');
console.log(`   - Node Version: ${process.version}`);
console.log(`   - OS Platform: ${process.platform}`);
console.log(`   - Working Dir: ${process.cwd()}`);

// 2. Check Directory Structure
console.log('\n2. STRUCTURE CHECK:');
const requiredDirs = ['server', 'public', 'node_modules'];
requiredDirs.forEach(dir => {
    const exists = fs.existsSync(path.join(process.cwd(), dir));
    console.log(`   - [${exists ? '✔' : '✖'}] ${dir}/ folder`);
});

// 3. Check SQLite3 Native Compatibility
console.log('\n3. SQLITE3 COMPATIBILITY:');
try {
    const sqlite3 = require('sqlite3');
    console.log('   - [✔] sqlite3 module loaded successfully.');
    
    const db = new sqlite3.Database(':memory:');
    db.serialize(() => {
        db.run("CREATE TABLE test (info TEXT)");
        console.log('   - [✔] sqlite3 database operations functional.');
    });
    db.close();
} catch (err) {
    console.error('   - [✖] SQLITE3 ERROR:', err.message);
    if (err.message.includes('GLIBC')) {
        console.error('     TIP: Your Node.js version is incompatible with the OS glibc. Use Bullseye/Bookworm based Node.');
    } else if (err.message.includes('find module')) {
        console.error('     TIP: Run "npm install" in the application root.');
    } else {
        console.error('     TIP: Reinstall dependencies by deleting node_modules and running "npm install" on the server.');
    }
}

// 4. Check Environment Variables
console.log('\n4. CONFIGURATION CHECK:');
const envs = ['NODE_ENV', 'JWT_SECRET', 'PORT'];
envs.forEach(e => {
    console.log(`   - ${e}: ${process.env[e] ? 'SET [OK]' : 'NOT SET'}`);
});

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.error('   - [!] CRITICAL: JWT_SECRET is missing but NODE_ENV is set to production.');
}

console.log('\n--- DEBUGGER FINISHED ---\n');
