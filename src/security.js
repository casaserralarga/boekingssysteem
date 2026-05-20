const crypto = require('crypto');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
    const hash = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHash, 'hex');

    if (hash.length !== expected.length) {
        return false;
    }

    return crypto.timingSafeEqual(hash, expected);
}

function createSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function generateReferenceCode() {
    return `CSL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

module.exports = {
    hashPassword,
    verifyPassword,
    createSessionToken,
    hashToken,
    generateReferenceCode
};
