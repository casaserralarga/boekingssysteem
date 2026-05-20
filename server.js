require('dotenv').config();

const { createApp } = require('./src/app');
const { config } = require('./src/config');
const db = require('./src/db');

async function start() {
    await db.initialize();

    const app = createApp();
    app.listen(config.port, () => {
        console.log(`Casa Serra Larga server listening on http://localhost:${config.port}`);
    });
}

start().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
