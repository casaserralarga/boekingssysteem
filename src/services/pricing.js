function parseIsoDate(value) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}

function formatIsoDate(date) {
    return date.toISOString().slice(0, 10);
}

function addUtcDays(date, amount) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + amount);
    return next;
}

function getSeasonPriceCents(date, prices) {
    const month = date.getUTCMonth() + 1;

    if (month <= 3 || month >= 11) return prices.low;
    if (month >= 7 && month <= 8) return prices.high;
    return prices.mid;
}

function getNightlyPriceCents({ roomId, date, pricingRules = [], roomBasePriceCents = null, seasonPricing }) {
    const isoDate = typeof date === 'string' ? date : formatIsoDate(date);
    const matchingRule = pricingRules.find((rule) => Number(rule.roomId) === Number(roomId) && rule.start <= isoDate && rule.end >= isoDate);

    if (matchingRule) {
        return matchingRule.nightlyPriceCents;
    }

    if (roomBasePriceCents != null) {
        return Number(roomBasePriceCents);
    }

    return getSeasonPriceCents(typeof date === 'string' ? parseIsoDate(date) : date, seasonPricing);
}

function getNightlyBreakdown({ roomId, checkin, checkout, pricingRules = [], roomBasePriceCents = null, seasonPricing, extraBed }) {
    const start = parseIsoDate(checkin);
    const end = parseIsoDate(checkout);
    const nights = [];
    let current = new Date(start);

    while (current < end) {
        const isoDate = formatIsoDate(current);
        nights.push({
            date: isoDate,
            nightlyPriceCents: getNightlyPriceCents({
                roomId,
                date: current,
                pricingRules,
                roomBasePriceCents,
                seasonPricing
            }),
            extraBedPriceCents: extraBed ? 1500 : 0
        });
        current = addUtcDays(current, 1);
    }

    return nights;
}

function calculateQuote({ roomId = null, checkin, checkout, extraBed, roomsRequested = 1, prices, pricingRules = [], roomBasePriceCents = null }) {
    const nightBreakdown = getNightlyBreakdown({
        roomId,
        checkin,
        checkout,
        pricingRules,
        roomBasePriceCents,
        seasonPricing: prices,
        extraBed
    });

    const stayPriceCents = nightBreakdown.reduce((sum, night) => sum + (night.nightlyPriceCents * roomsRequested), 0);
    const extrasPriceCents = nightBreakdown.reduce((sum, night) => sum + night.extraBedPriceCents, 0);

    return {
        nights: nightBreakdown.length,
        nightBreakdown,
        stayPriceCents,
        extrasPriceCents,
        totalPriceCents: stayPriceCents + extrasPriceCents
    };
}

function calculateMultiRoomQuote({ selectedRoomIds = [], checkin, checkout, extraBed, prices, pricingRules = [], rooms = [] }) {
    const roomLookup = new Map(rooms.map((room) => [Number(room.id), room]));
    const roomQuotes = selectedRoomIds.map((roomId) => {
        const room = roomLookup.get(Number(roomId));
        const quote = calculateQuote({
            roomId,
            checkin,
            checkout,
            extraBed,
            roomsRequested: 1,
            prices,
            pricingRules,
            roomBasePriceCents: room?.basePriceCents ?? null
        });

        return {
            roomId: Number(roomId),
            ...quote
        };
    });

    return {
        roomQuotes,
        nights: roomQuotes[0]?.nights || 0,
        stayPriceCents: roomQuotes.reduce((sum, quote) => sum + quote.stayPriceCents, 0),
        extrasPriceCents: roomQuotes.reduce((sum, quote) => sum + quote.extrasPriceCents, 0),
        totalPriceCents: roomQuotes.reduce((sum, quote) => sum + quote.totalPriceCents, 0)
    };
}

module.exports = {
    calculateQuote,
    calculateMultiRoomQuote,
    getSeasonPriceCents,
    getNightlyPriceCents,
    getNightlyBreakdown,
    parseIsoDate,
    formatIsoDate,
    addUtcDays
};
