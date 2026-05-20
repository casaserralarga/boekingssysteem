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

const VAT_RATE_PERCENT = 6;
const SINGLE_OCCUPANCY_DISCOUNT_CENTS = 1000;
const EXTRA_CHILD_BED_PRICE_CENTS = 1500;

function calculateVatCents(subtotalPriceCents) {
    return Math.round((Number(subtotalPriceCents || 0) * VAT_RATE_PERCENT) / 100);
}

function addVatToPriceCents(priceCents) {
    const netPriceCents = Number(priceCents || 0);
    return netPriceCents + calculateVatCents(netPriceCents);
}

function buildPriceBreakdown({ stayPriceCents = 0, extrasPriceCents = 0, totalPriceCents = null }) {
    const subtotalPriceCents = Number(stayPriceCents || 0) + Number(extrasPriceCents || 0);
    const resolvedTotalPriceCents = totalPriceCents == null ? null : Number(totalPriceCents || 0);
    const vatPriceCents = resolvedTotalPriceCents == null
        ? calculateVatCents(subtotalPriceCents)
        : Math.max(resolvedTotalPriceCents - subtotalPriceCents, 0);

    return {
        subtotalPriceCents,
        vatRatePercent: VAT_RATE_PERCENT,
        vatPriceCents,
        totalPriceCents: resolvedTotalPriceCents == null ? subtotalPriceCents + vatPriceCents : resolvedTotalPriceCents
    };
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

function getNightlyBreakdown({ roomId, checkin, checkout, pricingRules = [], roomBasePriceCents = null, seasonPricing, extraBed, singleOccupancy = false }) {
    const start = parseIsoDate(checkin);
    const end = parseIsoDate(checkout);
    const nights = [];
    let current = new Date(start);

    while (current < end) {
        const isoDate = formatIsoDate(current);
        const baseNightlyPriceCents = getNightlyPriceCents({
            roomId,
            date: current,
            pricingRules,
            roomBasePriceCents,
            seasonPricing
        });
        const singleOccupancyDiscountCents = singleOccupancy ? SINGLE_OCCUPANCY_DISCOUNT_CENTS : 0;

        nights.push({
            date: isoDate,
            baseNightlyPriceCents,
            singleOccupancyDiscountCents,
            nightlyPriceCents: Math.max(baseNightlyPriceCents - singleOccupancyDiscountCents, 0),
            extraBedPriceCents: extraBed ? EXTRA_CHILD_BED_PRICE_CENTS : 0
        });
        current = addUtcDays(current, 1);
    }

    return nights;
}

function calculateQuote({ roomId = null, checkin, checkout, extraBed, roomsRequested = 1, prices, pricingRules = [], roomBasePriceCents = null, singleOccupancy = false }) {
    const nightBreakdown = getNightlyBreakdown({
        roomId,
        checkin,
        checkout,
        pricingRules,
        roomBasePriceCents,
        seasonPricing: prices,
        extraBed,
        singleOccupancy
    });

    const stayPriceCents = nightBreakdown.reduce((sum, night) => sum + (night.nightlyPriceCents * roomsRequested), 0);
    const extrasPriceCents = nightBreakdown.reduce((sum, night) => sum + night.extraBedPriceCents, 0);
    const priceBreakdown = buildPriceBreakdown({ stayPriceCents, extrasPriceCents });

    return {
        nights: nightBreakdown.length,
        nightBreakdown,
        stayPriceCents,
        extrasPriceCents,
        ...priceBreakdown
    };
}

function distributePayingGuests(payingGuests, selectedRoomCount) {
    let remainingGuests = Number(payingGuests || 0);
    return Array.from({ length: selectedRoomCount }, () => {
        const roomGuests = Math.min(2, remainingGuests);
        remainingGuests -= roomGuests;
        return roomGuests;
    });
}

function calculateMultiRoomQuote({ selectedRoomIds = [], checkin, checkout, extraBed, extraBedCount = null, adultCount = 2, childCount = 0, prices, pricingRules = [], rooms = [] }) {
    const roomLookup = new Map(rooms.map((room) => [Number(room.id), room]));
    const payingGuests = Math.max(0, Number(adultCount || 0)) + Math.max(0, Number(childCount || 0));
    const roomOccupancy = distributePayingGuests(payingGuests, selectedRoomIds.length);
    const resolvedExtraBedCount = extraBedCount == null ? (extraBed ? selectedRoomIds.length : 0) : Number(extraBedCount || 0);

    const roomQuotes = selectedRoomIds.map((roomId, index) => {
        const room = roomLookup.get(Number(roomId));
        const quote = calculateQuote({
            roomId,
            checkin,
            checkout,
            extraBed: false,
            roomsRequested: 1,
            prices,
            pricingRules,
            roomBasePriceCents: room?.basePriceCents ?? null,
            singleOccupancy: roomOccupancy[index] === 1
        });

        return {
            roomId: Number(roomId),
            ...quote
        };
    });

    const stayPriceCents = roomQuotes.reduce((sum, quote) => sum + quote.stayPriceCents, 0);
    const nights = roomQuotes[0]?.nights || 0;
    const extrasPriceCents = nights * resolvedExtraBedCount * EXTRA_CHILD_BED_PRICE_CENTS;
    const vatPriceCents = calculateVatCents(stayPriceCents + extrasPriceCents);

    return {
        roomQuotes,
        nights,
        stayPriceCents,
        extrasPriceCents,
        subtotalPriceCents: stayPriceCents + extrasPriceCents,
        vatRatePercent: VAT_RATE_PERCENT,
        vatPriceCents,
        totalPriceCents: stayPriceCents + extrasPriceCents + vatPriceCents,
        occupancy: {
            adultCount: Number(adultCount || 0),
            childCount: Number(childCount || 0),
            payingGuests,
            roomOccupancy,
            singleOccupancyRooms: roomOccupancy.filter((count) => count === 1).length,
            extraBedCount: resolvedExtraBedCount
        }
    };
}

module.exports = {
    VAT_RATE_PERCENT,
    SINGLE_OCCUPANCY_DISCOUNT_CENTS,
    EXTRA_CHILD_BED_PRICE_CENTS,
    calculateVatCents,
    addVatToPriceCents,
    buildPriceBreakdown,
    calculateQuote,
    calculateMultiRoomQuote,
    getSeasonPriceCents,
    getNightlyPriceCents,
    getNightlyBreakdown,
    parseIsoDate,
    formatIsoDate,
    addUtcDays
};
