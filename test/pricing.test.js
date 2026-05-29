const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateQuote, calculateMultiRoomQuote } = require('../src/services/pricing');

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
    assert.equal(quote.subtotalPriceCents, 40500);
    assert.equal(quote.vatRatePercent, 6);
    assert.equal(quote.vatPriceCents, 2430);
    assert.equal(quote.totalPriceCents, 42930);
});

test('calculateMultiRoomQuote telt btw per kamer mee in het betaalbedrag', () => {
    const quote = calculateMultiRoomQuote({
        selectedRoomIds: [1, 2],
        checkin: '2026-11-01',
        checkout: '2026-11-02',
        extraBed: false,
        prices: {
            low: 8000,
            mid: 10000,
            high: 12000
        },
        rooms: [
            { id: 1, basePriceCents: 9999 },
            { id: 2, basePriceCents: 14999 }
        ]
    });

    assert.equal(quote.subtotalPriceCents, 24998);
    assert.equal(quote.vatPriceCents, 1500);
    assert.equal(quote.totalPriceCents, 26498);
});

test('calculateMultiRoomQuote geeft 10 euro nachtkorting bij single occupancy', () => {
    const quote = calculateMultiRoomQuote({
        selectedRoomIds: [1],
        checkin: '2026-11-01',
        checkout: '2026-11-03',
        adultCount: 1,
        childCount: 0,
        extraBedCount: 0,
        prices: {
            low: 8000,
            mid: 10000,
            high: 12000
        },
        rooms: [
            { id: 1, basePriceCents: 9000 }
        ]
    });

    assert.equal(quote.stayPriceCents, 16000);
    assert.equal(quote.subtotalPriceCents, 16000);
    assert.equal(quote.occupancy.singleOccupancyRooms, 1);
    assert.deepEqual(quote.roomQuotes[0].nightBreakdown.map((night) => night.singleOccupancyDiscountCents), [1000, 1000]);
    assert.equal(quote.totalPriceCents, 16960);
});

test('calculateMultiRoomQuote rekent extra kinderbedden per stuk per nacht', () => {
    const quote = calculateMultiRoomQuote({
        selectedRoomIds: [1],
        checkin: '2026-11-01',
        checkout: '2026-11-03',
        adultCount: 2,
        childCount: 1,
        extraBedCount: 1,
        prices: {
            low: 8000,
            mid: 10000,
            high: 12000
        },
        rooms: [
            { id: 1, basePriceCents: 9000 }
        ]
    });

    assert.equal(quote.stayPriceCents, 18000);
    assert.equal(quote.extrasPriceCents, 3000);
    assert.equal(quote.totalPriceCents, 22260);
});

test('calculateMultiRoomQuote rekent stapelbedden, kinderbedden en babybedden met instelbare prijzen', () => {
    const quote = calculateMultiRoomQuote({
        selectedRoomIds: [1, 2],
        checkin: '2026-11-01',
        checkout: '2026-11-03',
        adultCount: 2,
        childCount: 3,
        babyCount: 1,
        extraBedCount: 1,
        bunkBedCount: 1,
        babyBedCount: 1,
        prices: {
            low: 8000,
            mid: 10000,
            high: 12000
        },
        rooms: [
            { id: 1, basePriceCents: 9000 },
            { id: 2, basePriceCents: 10000 }
        ],
        bedPrices: {
            extraBedPriceCents: 1500,
            bunkBedPriceCents: 3000,
            babyBedPriceCents: 0
        }
    });

    assert.equal(quote.extrasPriceCents, 9000);
    assert.equal(quote.extrasBreakdown.extraBedTotalCents, 3000);
    assert.equal(quote.extrasBreakdown.bunkBedTotalCents, 6000);
    assert.equal(quote.extrasBreakdown.babyBedTotalCents, 0);
    assert.equal(quote.totalPriceCents, 49820);
});
