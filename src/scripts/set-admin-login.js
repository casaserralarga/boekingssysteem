require('dotenv').config();

const { parseArgs } = require('util');

const db = require('../db');
const { hashPassword } = require('../security');

const { values } = parseArgs({
    options: {
        username: { type: 'string' },
        email: { type: 'string' },
        password: { type: 'string' }
    }
});

const username = values.username;
const email = values.email || 'admin@casaserralarga.local';
const password = values.password;

main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});

async function main() {
    if (!username || !password) {
        console.error('Gebruik: node src/scripts/set-admin-login.js --username=admin --password="sterk-wachtwoord" [--email=admin@example.com]');
        process.exit(1);
    }

    if (password.length < 10) {
        console.error('Het wachtwoord moet minimaal 10 tekens lang zijn.');
        process.exit(1);
    }

    const { salt, hash } = hashPassword(password);
    const userId = await db.upsertAdminLogin({
        username,
        email,
        passwordHash: hash,
        passwordSalt: salt,
        mustChangePassword: true
    });

    console.log(`Admin login ingesteld voor gebruiker ${username} (id ${userId}). Wachtwoordwissel is verplicht bij de eerste login.`);
}