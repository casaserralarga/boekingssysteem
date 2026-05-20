const test = require('node:test');
const assert = require('node:assert/strict');

const { hashPassword, verifyPassword, hashToken } = require('../src/security');

test('password hashing en verificatie werken correct', () => {
    const password = 'SterkWachtwoord123!';
    const { salt, hash } = hashPassword(password);

    assert.equal(verifyPassword(password, salt, hash), true);
    assert.equal(verifyPassword('verkeerd-wachtwoord', salt, hash), false);
});

test('hashToken is deterministisch', () => {
    assert.equal(hashToken('abc'), hashToken('abc'));
});