const test = require('node:test');
const assert = require('node:assert/strict');

const { validateDateRange, validatePaidStripeSession, toPublicHold, sanitizeRequestPath } = require('../src/app');

test('validateDateRange accepteert een normaal verblijf', () => {
    assert.doesNotThrow(() => validateDateRange('2026-10-01', '2026-10-08'));
});

test('validateDateRange weigert niet-bestaande datums', () => {
    assert.throws(
        () => validateDateRange('2026-02-30', '2026-03-02'),
        /geldige datum/
    );
});

test('validateDateRange begrenst een verblijf tot 90 nachten', () => {
    assert.doesNotThrow(() => validateDateRange('2026-01-01', '2026-04-01'));
    assert.throws(
        () => validateDateRange('2026-01-01', '2026-04-02'),
        /maximaal 90 nachten/
    );
});

test('toPublicHold verbergt contact-, adres- en betaalgegevens', () => {
    const publicHold = toPublicHold({
        holdToken: 'secret-token',
        stripeSessionId: 'cs_secret',
        guestName: 'Test Persoon',
        guestEmail: 'test@example.com',
        guestPhone: '+351123456789',
        nifNumber: '123456789',
        street: 'Geheime straat',
        checkin: '2026-10-01',
        checkout: '2026-10-08',
        stayPriceCents: 10000,
        extrasPriceCents: 0,
        subtotalPriceCents: 10000,
        vatRatePercent: 6,
        vatPriceCents: 600,
        totalPriceCents: 10600,
        expiresAt: '2026-10-01T00:10:00.000Z',
        selectedRooms: [{ id: 1, name: 'Kamer 1', roomNumber: 1 }]
    });

    assert.equal(publicHold.guestName, 'T*** P***');
    assert.equal(publicHold.guestEmail, 't***@example.com');
    assert.equal(publicHold.holdToken, undefined);
    assert.equal(publicHold.stripeSessionId, undefined);
    assert.equal(publicHold.guestPhone, undefined);
    assert.equal(publicHold.street, undefined);
    assert.deepEqual(publicHold.selectedRooms, [{ id: 1, name: 'Kamer 1' }]);
});

test('validatePaidStripeSession accepteert alleen een gekoppelde betaalde EUR-sessie', () => {
    const hold = { holdToken: 'hold-token', stripeSessionId: 'cs_test_123', totalPriceCents: 10600 };
    const paidSession = {
        id: 'cs_test_123',
        mode: 'payment',
        payment_status: 'paid',
        currency: 'eur',
        amount_total: 10600
    };

    assert.doesNotThrow(() => validatePaidStripeSession(paidSession, hold));
    assert.throws(
        () => validatePaidStripeSession({ ...paidSession, payment_status: 'unpaid', status: 'complete' }, hold),
        /nog niet afgerond/
    );
    assert.throws(
        () => validatePaidStripeSession({ ...paidSession, id: 'cs_test_other' }, hold),
        /hoort niet bij/
    );
    assert.throws(
        () => validatePaidStripeSession({ ...paidSession, amount_total: 10599 }, hold),
        /bedrag komt niet overeen/
    );
});

test('sanitizeRequestPath verwijdert querywaarden en tokenachtige padsegmenten', () => {
    assert.equal(
        sanitizeRequestPath('/payment?hold=6482150ba981a114c11cb507e823cc072bb3'),
        '/payment'
    );
    assert.equal(
        sanitizeRequestPath('/api/public/holds/6482150ba981a114c11cb507e823cc072bb3'),
        '/api/public/holds/[REDACTED]'
    );
});