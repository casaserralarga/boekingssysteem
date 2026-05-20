const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateQuote } = require('../src/services/pricing');

test('calculateQuote berekent nachten en totalen correct', () => {
    const quote = calculateQuote({
        checkin: '2026-07-01',
        checkout: '2026-07-04',
        extraBed: true,
        roomsRequested: 1,
        prices: {
            low: 8000,
            mid: 10000,
            high: 12000
        }
    });

    assert.equal(quote.nights, 3);
    assert.equal(quote.stayPriceCents, 36000);
    assert.equal(quote.extrasPriceCents, 4500);
    assert.equal(quote.totalPriceCents, 40500);
});
