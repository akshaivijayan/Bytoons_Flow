/**
 * Bytoons Flow - Root Entry Point
 * This file allows you to start the backend from the root directory.
 */

const path = require('path');
const fs = require('fs');

// Ensure the server directory exists
if (!fs.existsSync(path.join(__dirname, 'server'))) {
    console.error('Error: "server" directory not found. Please run this command from the bytoons.com root.');
    process.exit(1);
}

// Delegate to the main app entry point
console.log('\n--- BYTOONS FLOW DATABASE DIAGNOSTIC ---\n');
require('./server/app');
