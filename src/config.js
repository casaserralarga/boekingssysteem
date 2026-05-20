const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const config = {
    port: Number(process.env.PORT || 3000),
    rootDir,
    dataDir: path.join(rootDir, 'data'),
    dbPath: path.join(rootDir, 'data', 'reservations.sqlite'),
    appOrigin: process.env.APP_ORIGIN || 'http://localhost:3000',
    nodeEnv: process.env.NODE_ENV || 'development',
    sessionTtlDays: Number(process.env.SESSION_TTL_DAYS || 7),
    holdTtlMinutes: Number(process.env.HOLD_TTL_MINUTES || 10),
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    isProduction: (process.env.NODE_ENV || 'development') === 'production'
};

module.exports = { config };
