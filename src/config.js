const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const nodeEnv = process.env.NODE_ENV || 'development';

const config = {
    port: Number(process.env.PORT || 3000),
    rootDir,
    dataDir: path.join(rootDir, 'data'),
    dbPath: path.join(rootDir, 'data', 'reservations.sqlite'),
    appOrigin: process.env.APP_ORIGIN || 'http://localhost:3000',
    nodeEnv,
    trustProxy: process.env.TRUST_PROXY || (nodeEnv === 'production' ? 'loopback' : ''),
    sessionTtlDays: Number(process.env.SESSION_TTL_DAYS || 7),
    holdTtlMinutes: Number(process.env.HOLD_TTL_MINUTES || 10),
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    isProduction: nodeEnv === 'production'
};

module.exports = { config };
