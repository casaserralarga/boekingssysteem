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

const username = values.username || values.email?.split('@')[0] || 'admin';
const email = values.email;
const password = values.password;

main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});

async function main() {
    if (!email || !password) {
        console.error('Gebruik: npm run setup:admin -- --email=admin@example.com --password="sterk-wachtwoord"');
        process.exit(1);
    }

    if (password.length < 10) {
        console.error('Het wachtwoord moet minimaal 10 tekens lang zijn.');
        process.exit(1);
    }

    if (await db.findAdminUserByEmail(email)) {
        console.error('Er bestaat al een admin met dit e-mailadres.');
        process.exit(1);
    }

    if (await db.findAdminUserByUsername(username)) {
        console.error('Er bestaat al een admin met deze gebruikersnaam.');
        process.exit(1);
    }

    const { salt, hash } = hashPassword(password);
    const userId = await db.createAdminUser({
        username,
        email,
        passwordHash: hash,
        passwordSalt: salt,
        mustChangePassword: false
    });

    console.log(`Admin gebruiker aangemaakt met id ${userId}.`);
}
