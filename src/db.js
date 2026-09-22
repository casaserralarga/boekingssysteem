const crypto = require('crypto');

const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSQLite3 } = require('@prisma/adapter-better-sqlite3');

const { config } = require('./config');
const { generateReferenceCode } = require('./security');
const { buildPriceBreakdown } = require('./services/pricing');

const databaseUrl = process.env.DATABASE_URL || `file:${config.dbPath.replace(/\\/g, '/')}`;
const adapter = new PrismaBetterSQLite3({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

const activeBookingStatuses = ['pending', 'confirmed', 'checked-in'];
const occupancyBookingStatuses = ['pending', 'confirmed', 'checked-in', 'checked-out'];

let initializationPromise = null;

const nowIso = () => new Date().toISOString();

function normalizeUsername(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '');
}

async function ensureInitialized() {
    if (!initializationPromise) {
        initializationPromise = initializeData();
    }

    return initializationPromise;
}

async function initializeData() {
    await validateDatabaseSchema();
    await ensureDefaults();
    await ensureDefaultRooms();
    await ensureAdminUsernames();
    await ensureBookingRoomAssignments();
    await ensureBlockedPeriodAssignments();
}

async function validateDatabaseSchema() {
    try {
        await prisma.setting.count();
        await prisma.room.count();
        await prisma.session.count();
        await prisma.pricingRule.count();
        await prisma.bookingRoom.count();
        await prisma.blockedPeriodRoom.count();
        await prisma.booking.findFirst({
            select: {
                id: true,
                street: true,
                phone: true,
                nifNumber: true,
                adultCount: true,
                childCount: true,
                babyCount: true,
                houseNumber: true,
                postalCode: true,
                city: true,
                country: true,
                babyBed: true,
                extraBed: true,
                bunkBed: true
            }
        });
        await prisma.bookingHold.findFirst({
            select: {
                id: true,
                guestPhone: true,
                nifNumber: true,
                adultCount: true,
                childCount: true,
                babyCount: true,
                street: true,
                houseNumber: true,
                postalCode: true,
                city: true,
                country: true,
                babyBed: true,
                extraBed: true,
                bunkBed: true
            }
        });
        await prisma.adminUser.findFirst({
            select: {
                id: true,
                username: true,
                mustChangePassword: true
            }
        });
    } catch (error) {
        throw new Error(
            'Database schema is niet up-to-date. Voer eerst `npx prisma db push` en daarna `npx prisma generate` uit voordat je de server start.'
        );
    }
}

async function readSettingsDirect() {
    const rows = await prisma.setting.findMany();
    return rows.reduce((accumulator, row) => {
        accumulator[row.key] = row.value;
        return accumulator;
    }, {});
}

async function upsertSettingDirect(key, value) {
    return prisma.setting.upsert({
        where: { key },
        create: {
            key,
            value: String(value),
            updatedAt: nowIso()
        },
        update: {
            value: String(value),
            updatedAt: nowIso()
        }
    });
}

async function ensureDefaults() {
    const defaults = {
        price_low_cents: 8000,
        price_mid_cents: 10000,
        price_high_cents: 12000,
        total_rooms: 6,
        extra_bed_capacity: 1,
        baby_bed_capacity: 1,
        bunk_bed_capacity: 1,
        extra_bed_price_cents: 1500,
        baby_bed_price_cents: 0,
        bunk_bed_price_cents: 3000,
        invoice_number: 1000,
        property_name: 'Casa Serra Larga'
    };

    for (const [key, value] of Object.entries(defaults)) {
        const existing = await prisma.setting.findUnique({ where: { key } });
        if (!existing) {
            await prisma.setting.create({
                data: {
                    key,
                    value: String(value),
                    updatedAt: nowIso()
                }
            });
        }
    }
}

async function ensureDefaultRooms() {
    const settings = await readSettingsDirect();
    const targetCount = Number(settings.total_rooms || 6);
    const currentRooms = await prisma.room.count({ where: { isActive: 1 } });

    if (currentRooms >= targetCount) {
        await syncTotalRoomsSetting();
        return;
    }

    const timestamp = nowIso();
    for (let roomNumber = currentRooms + 1; roomNumber <= targetCount; roomNumber += 1) {
        await prisma.room.create({
            data: {
                roomNumber,
                name: `Kamer ${roomNumber}`,
                shortName: `K${roomNumber}`,
                isActive: 1,
                createdAt: timestamp,
                updatedAt: timestamp
            }
        });
    }

    await syncTotalRoomsSetting();
}

async function ensureAdminUsernames() {
    const users = await prisma.adminUser.findMany({ orderBy: { id: 'asc' } });

    for (const user of users) {
        if (user.username && user.username.trim()) {
            continue;
        }

        const baseCandidate = normalizeUsername(user.email.split('@')[0]) || `admin${user.id}`;
        let candidate = baseCandidate;
        let suffix = 1;

        while (await prisma.adminUser.findFirst({
            where: {
                username: candidate,
                NOT: { id: user.id }
            }
        })) {
            candidate = `${baseCandidate}${suffix}`;
            suffix += 1;
        }

        await prisma.adminUser.update({
            where: { id: user.id },
            data: {
                username: candidate,
                updatedAt: nowIso()
            }
        });
    }
}

async function ensureBookingRoomAssignments() {
    const bookings = await prisma.booking.findMany({
        include: { bookingRooms: true },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
    });

    for (const booking of bookings) {
        if (booking.bookingRooms.length > 0) {
            continue;
        }

        const roomsNeeded = Math.max(1, Number(booking.roomsRequested || 1));
        const selectedRoomIds = [];

        if (booking.assignedRoom) {
            const assignedRoom = await prisma.room.findFirst({
                where: {
                    OR: [
                        { id: booking.assignedRoom },
                        { roomNumber: booking.assignedRoom }
                    ]
                }
            });

            if (assignedRoom) {
                selectedRoomIds.push(assignedRoom.id);
            }
        }

        if (selectedRoomIds.length < roomsNeeded) {
            const fallbackRoomIds = await findFallbackRoomIds(booking, roomsNeeded);
            for (const roomId of fallbackRoomIds) {
                if (!selectedRoomIds.includes(roomId) && selectedRoomIds.length < roomsNeeded) {
                    selectedRoomIds.push(roomId);
                }
            }
        }

        await assignRoomsToBooking(booking.id, selectedRoomIds);
    }
}

async function ensureBlockedPeriodAssignments() {
    const activeRooms = await prisma.room.findMany({
        where: { isActive: 1 },
        orderBy: { roomNumber: 'asc' },
        select: { id: true }
    });

    if (!activeRooms.length) {
        return;
    }

    const blocks = await prisma.blockedPeriod.findMany({
        include: { blockedRooms: true }
    });

    for (const block of blocks) {
        if (block.blockedRooms.length) {
            continue;
        }

        await prisma.blockedPeriodRoom.createMany({
            data: activeRooms.map((room) => ({
                blockedPeriodId: block.id,
                roomId: room.id,
                createdAt: block.createdAt
            }))
        });
    }
}

async function findFallbackRoomIds(booking, countNeeded) {
    const availableRoomIds = await getAvailableRoomIds(booking.checkin, booking.checkout, booking.id);
    if (availableRoomIds.length >= countNeeded) {
        return availableRoomIds.slice(0, countNeeded);
    }

    const rooms = await listRooms();
    return rooms.slice(0, countNeeded).map((room) => room.id);
}

function mapRoom(row) {
    return {
        id: row.id,
        roomNumber: row.roomNumber,
        name: row.name,
        shortName: row.shortName,
        maxGuests: 2,
        basePriceCents: row.basePriceCents,
        isActive: Boolean(row.isActive),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    };
}

async function getSettings() {
    await ensureInitialized();
    return readSettingsDirect();
}

async function upsertSetting(key, value) {
    await ensureInitialized();
    return upsertSettingDirect(key, value);
}

async function syncTotalRoomsSetting() {
    const roomCount = await prisma.room.count({ where: { isActive: 1 } });
    await upsertSettingDirect('total_rooms', roomCount);
}

async function getPricingSettings() {
    const settings = await getSettings();
    return {
        low: Number(settings.price_low_cents),
        mid: Number(settings.price_mid_cents),
        high: Number(settings.price_high_cents),
        totalRooms: Number(settings.total_rooms),
        invoiceNumber: Number(settings.invoice_number)
    };
}

async function getPaymentSettings() {
    const settings = await getSettings();
    return {
        stripeSecretKey: String(settings.stripe_secret_key || '')
    };
}

function settingInt(settings, key, fallback) {
    const value = Number.parseInt(settings[key], 10);
    return Number.isFinite(value) ? Math.max(0, value) : fallback;
}

async function getBedSettings() {
    const settings = await getSettings();
    return {
        extraBedCapacity: settingInt(settings, 'extra_bed_capacity', 1),
        babyBedCapacity: settingInt(settings, 'baby_bed_capacity', 1),
        bunkBedCapacity: settingInt(settings, 'bunk_bed_capacity', 1),
        extraBedPriceCents: settingInt(settings, 'extra_bed_price_cents', 1500),
        babyBedPriceCents: settingInt(settings, 'baby_bed_price_cents', 0),
        bunkBedPriceCents: settingInt(settings, 'bunk_bed_price_cents', 3000)
    };
}

async function updateBedSettings({ extraBedCapacity, babyBedCapacity, bunkBedCapacity, extraBedPriceCents, babyBedPriceCents, bunkBedPriceCents }) {
    const current = await getBedSettings();
    await upsertSetting('extra_bed_capacity', Math.max(0, Number(extraBedCapacity ?? current.extraBedCapacity)));
    await upsertSetting('baby_bed_capacity', Math.max(0, Number(babyBedCapacity ?? current.babyBedCapacity)));
    await upsertSetting('bunk_bed_capacity', Math.max(0, Number(bunkBedCapacity ?? current.bunkBedCapacity)));
    await upsertSetting('extra_bed_price_cents', Math.max(0, Number(extraBedPriceCents ?? current.extraBedPriceCents)));
    await upsertSetting('baby_bed_price_cents', Math.max(0, Number(babyBedPriceCents ?? current.babyBedPriceCents)));
    await upsertSetting('bunk_bed_price_cents', Math.max(0, Number(bunkBedPriceCents ?? current.bunkBedPriceCents)));
    return getBedSettings();
}

async function updatePaymentSettings({ stripeSecretKey = '' }) {
    await upsertSetting('stripe_secret_key', String(stripeSecretKey || '').trim());
    return getPaymentSettings();
}

async function listRooms() {
    await ensureInitialized();
    const rows = await prisma.room.findMany({
        where: { isActive: 1 },
        orderBy: { roomNumber: 'asc' }
    });

    return rows.map(mapRoom);
}

async function listAllRooms() {
    await ensureInitialized();
    const rows = await prisma.room.findMany({
        orderBy: { roomNumber: 'asc' }
    });

    return rows.map(mapRoom);
}

async function getRoomById(roomId) {
    await ensureInitialized();
    const row = await prisma.room.findUnique({ where: { id: Number(roomId) } });
    return row ? mapRoom(row) : null;
}

async function createRoom({ name, shortName, basePriceCents = null }) {
    await ensureInitialized();
    const highestRoom = await prisma.room.findFirst({
        orderBy: { roomNumber: 'desc' }
    });
    const roomNumber = (highestRoom?.roomNumber || 0) + 1;
    const timestamp = nowIso();

    const row = await prisma.room.create({
        data: {
            roomNumber,
            name,
            shortName: shortName || `K${roomNumber}`,
            basePriceCents: basePriceCents === null ? null : Number(basePriceCents),
            isActive: 1,
            createdAt: timestamp,
            updatedAt: timestamp
        }
    });

    await syncTotalRoomsSetting();
    return mapRoom(row);
}

async function updateRoom(id, { name, shortName, basePriceCents = null, isActive }) {
    await ensureInitialized();
    const roomId = Number(id);
    const existing = await prisma.room.findUnique({ where: { id: roomId } });

    if (!existing) {
        return null;
    }

    const targetIsActive = isActive ? 1 : 0;
    if (!targetIsActive && existing.isActive) {
        const activeRoomCount = await prisma.room.count({ where: { isActive: 1 } });
        if (activeRoomCount <= 1) {
            const error = new Error('Er moet minimaal één actieve kamer overblijven.');
            error.statusCode = 409;
            throw error;
        }

        const today = new Date().toISOString().slice(0, 10);
        const futureBooking = await prisma.bookingRoom.findFirst({
            where: {
                roomId,
                booking: {
                    status: { in: activeBookingStatuses },
                    checkout: { gt: today }
                }
            }
        });
        const activeHold = await prisma.bookingHoldRoom.findFirst({
            where: {
                roomId,
                hold: {
                    status: { in: ['held', 'payment_pending'] },
                    expiresAt: { gt: nowIso() }
                }
            }
        });

        if (futureBooking || activeHold) {
            const error = new Error('Deze kamer heeft nog een actieve of toekomstige reservering en kan nu niet worden uitgezet.');
            error.statusCode = 409;
            throw error;
        }
    }

    const row = await prisma.room.update({
        where: { id: roomId },
        data: {
            name,
            shortName: shortName || existing.shortName || `K${existing.roomNumber}`,
            basePriceCents: basePriceCents === null ? null : Number(basePriceCents),
            isActive: targetIsActive,
            updatedAt: nowIso()
        }
    });

    await syncTotalRoomsSetting();
    return mapRoom(row);
}

async function listPricingRules() {
    await ensureInitialized();
    const rows = await prisma.pricingRule.findMany({
        orderBy: [{ startDate: 'asc' }, { roomId: 'asc' }]
    });

    return rows.map((row) => ({
        id: row.id,
        roomId: row.roomId,
        start: row.startDate,
        end: row.endDate,
        nightlyPriceCents: row.nightlyPriceCents,
        label: row.label,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    }));
}

async function getPricingRuleById(id) {
    const row = await prisma.pricingRule.findUnique({ where: { id: Number(id) } });
    return row ? {
        id: row.id,
        roomId: row.roomId,
        start: row.startDate,
        end: row.endDate,
        nightlyPriceCents: row.nightlyPriceCents,
        label: row.label,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    } : null;
}

async function upsertPricingRule({ id = null, roomId, start, end, nightlyPriceCents, label = '' }) {
    await ensureInitialized();
    const timestamp = nowIso();

    if (id) {
        await prisma.pricingRule.update({
            where: { id: Number(id) },
            data: {
                roomId: Number(roomId),
                startDate: start,
                endDate: end,
                nightlyPriceCents: Number(nightlyPriceCents),
                label,
                updatedAt: timestamp
            }
        });
        return getPricingRuleById(id);
    }

    const rule = await prisma.pricingRule.create({
        data: {
            roomId: Number(roomId),
            startDate: start,
            endDate: end,
            nightlyPriceCents: Number(nightlyPriceCents),
            label,
            createdAt: timestamp,
            updatedAt: timestamp
        }
    });

    return getPricingRuleById(rule.id);
}

async function deletePricingRule(id) {
    await ensureInitialized();
    await prisma.pricingRule.delete({ where: { id: Number(id) } });
}

async function getSelectedRoomsForBooking(bookingId) {
    const rows = await prisma.bookingRoom.findMany({
        where: { bookingId: Number(bookingId) },
        include: { room: true },
        orderBy: { room: { roomNumber: 'asc' } }
    });

    return rows.map((row) => ({
        id: row.room.id,
        roomNumber: row.room.roomNumber,
        name: row.room.name,
        shortName: row.room.shortName
    }));
}

async function mapBooking(row) {
    const selectedRooms = await getSelectedRoomsForBooking(row.id);
    const priceBreakdown = buildPriceBreakdown({
        stayPriceCents: row.stayPriceCents,
        extrasPriceCents: row.extrasPriceCents,
        totalPriceCents: row.totalPriceCents
    });

    return {
        id: row.id,
        referenceCode: row.referenceCode,
        name: row.name,
        email: row.email,
        phone: row.phone,
        nifNumber: row.nifNumber,
        adultCount: row.adultCount,
        childCount: row.childCount,
        babyCount: row.babyCount,
        note: row.note,
        street: row.street,
        houseNumber: row.houseNumber,
        postalCode: row.postalCode,
        city: row.city,
        country: row.country,
        checkin: row.checkin,
        checkout: row.checkout,
        babyBed: row.babyBed,
        extraBed: row.extraBed,
        bunkBed: row.bunkBed,
        roomsRequested: selectedRooms.length || row.roomsRequested,
        assignedRoom: row.assignedRoom,
        selectedRooms,
        selectedRoomIds: selectedRooms.map((room) => room.id),
        stayPriceCents: row.stayPriceCents,
        extrasPriceCents: row.extrasPriceCents,
        ...priceBreakdown,
        status: row.status,
        mailSent: Boolean(row.mailSent),
        depositPaid: Boolean(row.depositPaid),
        paid: Boolean(row.paid),
        checkedIn: Boolean(row.checkedIn),
        checkedOut: Boolean(row.checkedOut),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    };
}

async function listBookings() {
    await ensureInitialized();
    const rows = await prisma.booking.findMany({
        orderBy: [{ checkin: 'asc' }, { createdAt: 'desc' }]
    });

    return Promise.all(rows.map(mapBooking));
}

async function getBookingById(id) {
    await ensureInitialized();
    const row = await prisma.booking.findUnique({ where: { id: Number(id) } });
    return row ? mapBooking(row) : null;
}

async function listBlockedPeriods() {
    await ensureInitialized();
    const rows = await prisma.blockedPeriod.findMany({
        include: {
            blockedRooms: {
                include: { room: true },
                orderBy: { room: { roomNumber: 'asc' } }
            }
        },
        orderBy: { startDate: 'asc' }
    });
    return rows.map((row) => ({
        id: row.id,
        start: row.startDate,
        end: row.endDate,
        reason: row.reason,
        createdAt: row.createdAt,
        selectedRooms: row.blockedRooms.map((entry) => ({
            id: entry.room.id,
            roomNumber: entry.room.roomNumber,
            name: entry.room.name,
            shortName: entry.room.shortName
        })),
        selectedRoomIds: row.blockedRooms.map((entry) => entry.roomId)
    }));
}

function rangesOverlap(startA, endA, startB, endB) {
    return startA < endB && endA > startB;
}

async function hasBlockingPeriod(selectedRoomIds, checkin, checkout, ignoreBlockId = null) {
    await ensureInitialized();
    const roomIds = [...new Set((selectedRoomIds || []).map(Number))].filter(Boolean);
    if (!roomIds.length) {
        return false;
    }

    const blocks = await prisma.blockedPeriod.findMany({
        where: {
            blockedRooms: {
                some: {
                    roomId: { in: roomIds }
                }
            },
            ...(ignoreBlockId ? { id: { not: Number(ignoreBlockId) } } : {})
        }
    });

    return blocks.some((block) => {
        const blockEndExclusive = new Date(`${block.endDate}T00:00:00Z`);
        blockEndExclusive.setUTCDate(blockEndExclusive.getUTCDate() + 1);
        const endExclusive = blockEndExclusive.toISOString().slice(0, 10);

        return rangesOverlap(checkin, checkout, block.startDate, endExclusive);
    });
}

async function getBlockedRoomIds(checkin, checkout, ignoreBlockId = null) {
    await ensureInitialized();
    const rows = await prisma.blockedPeriodRoom.findMany({
        where: {
            blockedPeriod: {
                startDate: { lt: checkout },
                endDate: { gte: checkin },
                ...(ignoreBlockId ? { id: { not: Number(ignoreBlockId) } } : {})
            }
        },
        select: { roomId: true },
        distinct: ['roomId']
    });

    return rows.map((row) => row.roomId);
}

function nextDay(dateString) {
    const date = new Date(`${dateString}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().slice(0, 10);
}

async function getBookedRoomIds(checkin, checkout, ignoreBookingId = null) {
    await ensureInitialized();
    const rows = await prisma.bookingRoom.findMany({
        where: {
            booking: {
                status: { in: activeBookingStatuses },
                checkin: { lt: checkout },
                checkout: { gt: checkin },
                ...(ignoreBookingId ? { id: { not: Number(ignoreBookingId) } } : {})
            }
        },
        select: { roomId: true },
        distinct: ['roomId']
    });

    return rows.map((row) => row.roomId);
}

async function deleteExpiredBookingHolds() {
    await ensureInitialized();
    await prisma.bookingHold.deleteMany({
        where: {
            expiresAt: { lt: nowIso() },
            status: { in: ['held', 'payment_pending'] }
        }
    });
}

async function getHeldRoomIds(checkin, checkout, ignoreHoldToken = null) {
    await ensureInitialized();
    await deleteExpiredBookingHolds();

    const rows = await prisma.bookingHoldRoom.findMany({
        where: {
            hold: {
                status: { in: ['held', 'payment_pending'] },
                expiresAt: { gt: nowIso() },
                checkin: { lt: checkout },
                checkout: { gt: checkin },
                ...(ignoreHoldToken ? { holdToken: { not: ignoreHoldToken } } : {})
            }
        },
        select: { roomId: true },
        distinct: ['roomId']
    });

    return rows.map((row) => row.roomId);
}

async function getAvailableRoomIds(checkin, checkout, ignoreBookingId = null, ignoreHoldToken = null) {
    const booked = new Set(await getBookedRoomIds(checkin, checkout, ignoreBookingId));
    const held = new Set(await getHeldRoomIds(checkin, checkout, ignoreHoldToken));
    const blocked = new Set(await getBlockedRoomIds(checkin, checkout));
    const rooms = await listRooms();
    return rooms.filter((room) => !booked.has(room.id) && !held.has(room.id) && !blocked.has(room.id)).map((room) => room.id);
}

async function listRoomsWithAvailability(checkin, checkout, ignoreBookingId = null, ignoreHoldToken = null) {
    const available = new Set(await getAvailableRoomIds(checkin, checkout, ignoreBookingId, ignoreHoldToken));
    const rooms = await listRooms();
    return rooms.map((room) => ({
        ...room,
        isAvailable: available.has(room.id)
    }));
}

async function listRoomOccupancy(checkin, checkout) {
    await ensureInitialized();
    const rows = await prisma.bookingRoom.findMany({
        where: {
            booking: {
                status: { in: occupancyBookingStatuses },
                checkin: { lt: checkout },
                checkout: { gt: checkin }
            }
        },
        include: { booking: true },
        orderBy: [{ roomId: 'asc' }, { booking: { checkin: 'asc' } }]
    });

    return rows.map((row) => ({
        roomId: row.roomId,
        bookingId: row.bookingId,
        checkin: row.booking.checkin,
        checkout: row.booking.checkout,
        status: row.booking.status
    }));
}

async function listBlockedRoomOccupancy(checkin, checkout) {
    await ensureInitialized();
    const rows = await prisma.blockedPeriodRoom.findMany({
        where: {
            blockedPeriod: {
                startDate: { lt: checkout },
                endDate: { gte: checkin }
            }
        },
        include: { blockedPeriod: true },
        orderBy: [{ roomId: 'asc' }, { blockedPeriod: { startDate: 'asc' } }]
    });

    return rows.map((row) => ({
        roomId: row.roomId,
        blockedPeriodId: row.blockedPeriodId,
        checkin: row.blockedPeriod.startDate,
        checkout: nextDay(row.blockedPeriod.endDate),
        reason: row.blockedPeriod.reason,
        status: 'blocked'
    }));
}

async function listBedOccupancy(checkin, checkout) {
    await ensureInitialized();
    await deleteExpiredBookingHolds();

    const bookingRows = await prisma.booking.findMany({
        where: {
            status: { in: occupancyBookingStatuses },
            checkin: { lt: checkout },
            checkout: { gt: checkin }
        },
        select: {
            id: true,
            checkin: true,
            checkout: true,
            babyBed: true,
            extraBed: true,
            bunkBed: true,
            status: true
        }
    });
    const holdRows = await prisma.bookingHold.findMany({
        where: {
            status: { in: ['held', 'payment_pending'] },
            expiresAt: { gt: nowIso() },
            checkin: { lt: checkout },
            checkout: { gt: checkin }
        },
        select: {
            holdToken: true,
            checkin: true,
            checkout: true,
            babyBed: true,
            extraBed: true,
            bunkBed: true,
            status: true
        }
    });

    return [
        ...bookingRows.map((row) => ({
            type: 'booking',
            id: row.id,
            checkin: row.checkin,
            checkout: row.checkout,
            babyBed: Number(row.babyBed || 0),
            extraBed: Number(row.extraBed || 0),
            bunkBed: Number(row.bunkBed || 0),
            status: row.status
        })),
        ...holdRows.map((row) => ({
            type: 'hold',
            id: row.holdToken,
            checkin: row.checkin,
            checkout: row.checkout,
            babyBed: Number(row.babyBed || 0),
            extraBed: Number(row.extraBed || 0),
            bunkBed: Number(row.bunkBed || 0),
            status: row.status
        }))
    ];
}

async function getOverlappingBedUsage(checkin, checkout, { ignoreBookingId = null, ignoreHoldToken = null } = {}) {
    await ensureInitialized();
    await deleteExpiredBookingHolds();

    const bookingRows = await prisma.booking.findMany({
        where: {
            status: { in: activeBookingStatuses },
            checkin: { lt: checkout },
            checkout: { gt: checkin },
            ...(ignoreBookingId ? { id: { not: Number(ignoreBookingId) } } : {})
        },
        select: { babyBed: true, extraBed: true, bunkBed: true }
    });
    const holdRows = await prisma.bookingHold.findMany({
        where: {
            status: { in: ['held', 'payment_pending'] },
            expiresAt: { gt: nowIso() },
            checkin: { lt: checkout },
            checkout: { gt: checkin },
            ...(ignoreHoldToken ? { holdToken: { not: ignoreHoldToken } } : {})
        },
        select: { babyBed: true, extraBed: true, bunkBed: true }
    });

    return [...bookingRows, ...holdRows].reduce((usage, row) => ({
        babyBed: usage.babyBed + Number(row.babyBed || 0),
        extraBed: usage.extraBed + Number(row.extraBed || 0),
        bunkBed: usage.bunkBed + Number(row.bunkBed || 0)
    }), { babyBed: 0, extraBed: 0, bunkBed: 0 });
}

async function getOverlappingBookedRooms(checkin, checkout, ignoreBookingId = null) {
    const bookedRoomIds = await getBookedRoomIds(checkin, checkout, ignoreBookingId);
    const heldRoomIds = await getHeldRoomIds(checkin, checkout);
    const blockedRoomIds = await getBlockedRoomIds(checkin, checkout);
    return new Set([...bookedRoomIds, ...heldRoomIds, ...blockedRoomIds]).size;
}

async function isRoomAssignmentAvailable(roomIdentifier, checkin, checkout, ignoreBookingId = null) {
    await ensureInitialized();
    const room = await prisma.room.findFirst({
        where: {
            OR: [
                { id: Number(roomIdentifier) || -1 },
                { roomNumber: Number(roomIdentifier) || -1 }
            ]
        }
    });

    if (!room) {
        return false;
    }

    const bookedRoomIds = await getBookedRoomIds(checkin, checkout, ignoreBookingId);
    const blockedRoomIds = await getBlockedRoomIds(checkin, checkout);
    return !bookedRoomIds.includes(room.id) && !blockedRoomIds.includes(room.id);
}

async function getBlockedPeriodById(id) {
    await ensureInitialized();
    const row = await prisma.blockedPeriod.findUnique({
        where: { id: Number(id) },
        include: {
            blockedRooms: {
                include: { room: true },
                orderBy: { room: { roomNumber: 'asc' } }
            }
        }
    });

    if (!row) {
        return null;
    }

    return {
        id: row.id,
        start: row.startDate,
        end: row.endDate,
        reason: row.reason,
        createdAt: row.createdAt,
        selectedRooms: row.blockedRooms.map((entry) => ({
            id: entry.room.id,
            roomNumber: entry.room.roomNumber,
            name: entry.room.name,
            shortName: entry.room.shortName
        })),
        selectedRoomIds: row.blockedRooms.map((entry) => entry.roomId)
    };
}

async function assignRoomsToBooking(bookingId, roomIds) {
    await prisma.bookingRoom.deleteMany({ where: { bookingId: Number(bookingId) } });

    if (!roomIds.length) {
        return;
    }

    await prisma.bookingRoom.createMany({
        data: roomIds.map((roomId) => ({
            bookingId: Number(bookingId),
            roomId: Number(roomId),
            createdAt: nowIso()
        }))
    });
}

async function assignRoomsToHold(holdId, roomIds) {
    await prisma.bookingHoldRoom.deleteMany({ where: { holdId: Number(holdId) } });

    if (!roomIds.length) {
        return;
    }

    await prisma.bookingHoldRoom.createMany({
        data: roomIds.map((roomId) => ({
            holdId: Number(holdId),
            roomId: Number(roomId),
            createdAt: nowIso()
        }))
    });
}

async function assignRoomsToBlockedPeriod(blockedPeriodId, roomIds, createdAt = nowIso()) {
    await prisma.blockedPeriodRoom.deleteMany({ where: { blockedPeriodId: Number(blockedPeriodId) } });

    if (!roomIds.length) {
        return;
    }

    await prisma.blockedPeriodRoom.createMany({
        data: roomIds.map((roomId) => ({
            blockedPeriodId: Number(blockedPeriodId),
            roomId: Number(roomId),
            createdAt
        }))
    });
}

async function mapBookingHold(row) {
    const holdRooms = await prisma.bookingHoldRoom.findMany({
        where: { holdId: row.id },
        include: { room: true },
        orderBy: { room: { roomNumber: 'asc' } }
    });

    const priceBreakdown = buildPriceBreakdown({
        stayPriceCents: row.stayPriceCents,
        extrasPriceCents: row.extrasPriceCents,
        totalPriceCents: row.totalPriceCents
    });

    return {
        id: row.id,
        holdToken: row.holdToken,
        guestName: row.guestName,
        guestEmail: row.guestEmail,
        guestPhone: row.guestPhone,
        nifNumber: row.nifNumber,
        adultCount: row.adultCount,
        childCount: row.childCount,
        babyCount: row.babyCount,
        note: row.note,
        street: row.street,
        houseNumber: row.houseNumber,
        postalCode: row.postalCode,
        city: row.city,
        country: row.country,
        checkin: row.checkin,
        checkout: row.checkout,
        babyBed: row.babyBed,
        extraBed: row.extraBed,
        bunkBed: row.bunkBed,
        stayPriceCents: row.stayPriceCents,
        extrasPriceCents: row.extrasPriceCents,
        ...priceBreakdown,
        status: row.status,
        stripeSessionId: row.stripeSessionId,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        selectedRooms: holdRooms.map((entry) => ({
            id: entry.room.id,
            roomNumber: entry.room.roomNumber,
            name: entry.room.name,
            shortName: entry.room.shortName
        })),
        selectedRoomIds: holdRooms.map((entry) => entry.room.id)
    };
}

async function createBookingHold(data) {
    await ensureInitialized();
    await deleteExpiredBookingHolds();

    const holdToken = crypto.randomBytes(18).toString('hex');
    const timestamp = nowIso();
    const expiresAt = new Date(Date.now() + config.holdTtlMinutes * 60 * 1000).toISOString();
    const roomIds = [...new Set((data.selectedRoomIds || []).map(Number))];

    const hold = await prisma.bookingHold.create({
        data: {
            holdToken,
            guestName: data.name,
            guestEmail: data.email,
            guestPhone: data.phone,
            nifNumber: data.nifNumber || '',
            adultCount: Number(data.adultCount || 2),
            childCount: Number(data.childCount || 0),
            babyCount: Number(data.babyCount || 0),
            note: data.note || '',
            street: data.street,
            houseNumber: data.houseNumber,
            postalCode: data.postalCode,
            city: data.city,
            country: data.country,
            checkin: data.checkin,
            checkout: data.checkout,
            babyBed: Number(data.babyBed || 0),
            extraBed: Number(data.extraBed || 0),
            bunkBed: Number(data.bunkBed || 0),
            stayPriceCents: data.stayPriceCents,
            extrasPriceCents: data.extrasPriceCents,
            totalPriceCents: data.totalPriceCents,
            status: 'held',
            expiresAt,
            createdAt: timestamp,
            updatedAt: timestamp
        }
    });

    await assignRoomsToHold(hold.id, roomIds);
    return getBookingHoldByToken(holdToken);
}

async function getBookingHoldByToken(holdToken) {
    await ensureInitialized();
    await deleteExpiredBookingHolds();
    const hold = await prisma.bookingHold.findUnique({ where: { holdToken } });
    return hold ? mapBookingHold(hold) : null;
}

async function attachStripeSessionToHold(holdToken, stripeSessionId) {
    await ensureInitialized();
    await prisma.bookingHold.update({
        where: { holdToken },
        data: {
            stripeSessionId,
            status: 'payment_pending',
            updatedAt: nowIso()
        }
    });
    return getBookingHoldByToken(holdToken);
}
async function confirmBookingFromHold(holdToken, options = {}) {    await ensureInitialized();
    const hold = await prisma.bookingHold.findUnique({ where: { holdToken } });

    if (!hold) {
        return null;
    }

    if (hold.status === 'converted') {
        const existing = await prisma.booking.findFirst({
            where: {
                email: hold.guestEmail,
                checkin: hold.checkin,
                checkout: hold.checkout,
                totalPriceCents: hold.totalPriceCents
            },
            orderBy: { createdAt: 'desc' }
        });

        return existing ? getBookingById(existing.id) : null;
    }

    const fullHold = await getBookingHoldByToken(holdToken);
    const booking = await createBooking({
        name: fullHold.guestName,
        email: fullHold.guestEmail,
        phone: fullHold.guestPhone,
        nifNumber: fullHold.nifNumber,
        adultCount: fullHold.adultCount,
        childCount: fullHold.childCount,
        babyCount: fullHold.babyCount,
        note: fullHold.note,
        street: fullHold.street,
        houseNumber: fullHold.houseNumber,
        postalCode: fullHold.postalCode,
        city: fullHold.city,
        country: fullHold.country,
        checkin: fullHold.checkin,
        checkout: fullHold.checkout,
        selectedRoomIds: fullHold.selectedRoomIds,
        babyBed: fullHold.babyBed,
        extraBed: fullHold.extraBed,
        bunkBed: fullHold.bunkBed,
        stayPriceCents: fullHold.stayPriceCents,
        extrasPriceCents: fullHold.extrasPriceCents,
        totalPriceCents: fullHold.totalPriceCents
    });

    const paidBooking = await updateBooking(booking.id, {
    ...booking,
    name: booking.name,
    email: booking.email,
    phone: booking.phone,
    nifNumber: booking.nifNumber,
    adultCount: booking.adultCount,
    childCount: booking.childCount,
    babyCount: booking.babyCount,
    note: booking.note,
    street: booking.street,
    houseNumber: booking.houseNumber,
    postalCode: booking.postalCode,
    city: booking.city,
    country: booking.country,
    checkin: booking.checkin,
    checkout: booking.checkout,
    selectedRoomIds: booking.selectedRoomIds,
    babyBed: Number(booking.babyBed || 0),
    extraBed: Number(booking.extraBed || 0),
    bunkBed: Number(booking.bunkBed || 0),
    stayPriceCents: booking.stayPriceCents,
    extrasPriceCents: booking.extrasPriceCents,
    totalPriceCents: booking.totalPriceCents,

    status: 'pending',

    mailSent: booking.mailSent,
    depositPaid: options.depositPaid ?? false,
    paid: options.paid ?? true,

    checkedIn: booking.checkedIn,
    checkedOut: booking.checkedOut
});

    await prisma.bookingHold.update({
        where: { holdToken },
        data: {
            status: 'converted',
            updatedAt: nowIso()
        }
    });

    return paidBooking;
}

async function listActiveBookingHolds() {
    await ensureInitialized();
    await deleteExpiredBookingHolds();
    const holds = await prisma.bookingHold.findMany({
        where: {
            status: { in: ['held', 'payment_pending'] },
            expiresAt: { gt: nowIso() }
        },
        orderBy: { checkin: 'asc' }
    });

    return Promise.all(holds.map(mapBookingHold));
}

async function createBooking(data) {
    await ensureInitialized();
    const timestamp = nowIso();
    const roomIds = [...new Set((data.selectedRoomIds || []).map(Number))];
    const firstRoom = roomIds.length ? await getRoomById(roomIds[0]) : null;

    const booking = await prisma.booking.create({
        data: {
            referenceCode: generateReferenceCode(),
            name: data.name,
            email: data.email,
            phone: data.phone,
            nifNumber: data.nifNumber || '',
            adultCount: Number(data.adultCount || 2),
            childCount: Number(data.childCount || 0),
            babyCount: Number(data.babyCount || 0),
            note: data.note,
            street: data.street,
            houseNumber: data.houseNumber,
            postalCode: data.postalCode,
            city: data.city,
            country: data.country,
            checkin: data.checkin,
            checkout: data.checkout,
            babyBed: Number(data.babyBed || 0),
            extraBed: Number(data.extraBed || 0),
            bunkBed: Number(data.bunkBed || 0),
            roomsRequested: roomIds.length,
            assignedRoom: firstRoom ? firstRoom.roomNumber : null,
            stayPriceCents: data.stayPriceCents,
            extrasPriceCents: data.extrasPriceCents,
            totalPriceCents: data.totalPriceCents,
            status: 'pending',
            createdAt: timestamp,
            updatedAt: timestamp
        }
    });

    await assignRoomsToBooking(booking.id, roomIds);
    return getBookingById(booking.id);
}

async function updateBooking(id, data) {
    await ensureInitialized();
    const roomIds = [...new Set((data.selectedRoomIds || []).map(Number))];
    const firstRoom = roomIds.length ? await getRoomById(roomIds[0]) : null;

    await prisma.booking.update({
        where: { id: Number(id) },
        data: {
            name: data.name,
            email: data.email,
            phone: data.phone,
            nifNumber: data.nifNumber || '',
            adultCount: Number(data.adultCount || 2),
            childCount: Number(data.childCount || 0),
            babyCount: Number(data.babyCount || 0),
            note: data.note,
            street: data.street,
            houseNumber: data.houseNumber,
            postalCode: data.postalCode,
            city: data.city,
            country: data.country,
            checkin: data.checkin,
            checkout: data.checkout,
            babyBed: data.babyBed === undefined ? undefined : Number(data.babyBed || 0),
            extraBed: Number(data.extraBed || 0),
            bunkBed: Number(data.bunkBed || 0),
            roomsRequested: roomIds.length,
            assignedRoom: firstRoom ? firstRoom.roomNumber : null,
            stayPriceCents: data.stayPriceCents,
            extrasPriceCents: data.extrasPriceCents,
            totalPriceCents: data.totalPriceCents,
            status: data.status,
            mailSent: data.mailSent ? 1 : 0,
            depositPaid: data.depositPaid ? 1 : 0,
            paid: data.paid ? 1 : 0,
            checkedIn: data.checkedIn ? 1 : 0,
            checkedOut: data.checkedOut ? 1 : 0,
            updatedAt: nowIso()
        }
    });

    await assignRoomsToBooking(id, roomIds);
    return getBookingById(id);
}

async function deleteBooking(id) {
    await ensureInitialized();
    await prisma.booking.delete({ where: { id: Number(id) } });
}

async function createBlockedPeriod(start, end, reason, selectedRoomIds) {
    await ensureInitialized();
    const roomIds = [...new Set((selectedRoomIds || []).map(Number))].filter(Boolean);
    const timestamp = nowIso();
    const row = await prisma.blockedPeriod.create({
        data: {
            startDate: start,
            endDate: end,
            reason,
            createdAt: timestamp
        }
    });

    await prisma.blockedPeriodRoom.createMany({
        data: roomIds.map((roomId) => ({
            blockedPeriodId: row.id,
            roomId,
            createdAt: timestamp
        }))
    });

    return getBlockedPeriodById(row.id);
}

async function updateBlockedPeriod(id, { start, end, reason, selectedRoomIds }) {
    await ensureInitialized();
    const blockId = Number(id);
    const roomIds = [...new Set((selectedRoomIds || []).map(Number))].filter(Boolean);
    const existing = await prisma.blockedPeriod.findUnique({ where: { id: blockId } });

    if (!existing) {
        return null;
    }

    await prisma.blockedPeriod.update({
        where: { id: blockId },
        data: {
            startDate: start,
            endDate: end,
            reason
        }
    });

    await assignRoomsToBlockedPeriod(blockId, roomIds, existing.createdAt);
    return getBlockedPeriodById(blockId);
}

async function deleteBlockedPeriod(id) {
    await ensureInitialized();
    await prisma.blockedPeriod.delete({ where: { id: Number(id) } });
}

async function updatePricing({ low, mid, high, totalRooms }) {
    await upsertSetting('price_low_cents', low);
    await upsertSetting('price_mid_cents', mid);
    await upsertSetting('price_high_cents', high);

    const currentRooms = await prisma.room.count({ where: { isActive: 1 } });
    if (Number(totalRooms) > currentRooms) {
        const timestamp = nowIso();
        for (let roomNumber = currentRooms + 1; roomNumber <= Number(totalRooms); roomNumber += 1) {
            await prisma.room.create({
                data: {
                    roomNumber,
                    name: `Kamer ${roomNumber}`,
                    shortName: `K${roomNumber}`,
                    isActive: 1,
                    createdAt: timestamp,
                    updatedAt: timestamp
                }
            });
        }
    }

    await syncTotalRoomsSetting();
}

async function createAdminUser({ username, email, passwordHash, passwordSalt, mustChangePassword = false }) {
    await ensureInitialized();
    const row = await prisma.adminUser.create({
        data: {
            username: normalizeUsername(username),
            email: email.toLowerCase(),
            passwordHash,
            passwordSalt,
            mustChangePassword: mustChangePassword ? 1 : 0,
            role: 'admin',
            createdAt: nowIso(),
            updatedAt: nowIso()
        }
    });

    return row.id;
}

async function findAdminUserByUsername(username) {
    await ensureInitialized();
    return prisma.adminUser.findFirst({
        where: { username: normalizeUsername(username) }
    });
}

async function findAdminUserByEmail(email) {
    await ensureInitialized();
    return prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
}

async function findAdminUserByIdentifier(identifier) {
    await ensureInitialized();
    const normalizedIdentifier = String(identifier || '').trim().toLowerCase();
    return prisma.adminUser.findFirst({
        where: {
            OR: [
                { username: normalizedIdentifier },
                { email: normalizedIdentifier }
            ]
        }
    });
}

async function upsertAdminLogin({ username, email, passwordHash, passwordSalt, mustChangePassword = false }) {
    await ensureInitialized();
    const normalizedUsername = normalizeUsername(username);
    const normalizedEmail = email.toLowerCase();
    const existing = await findAdminUserByUsername(normalizedUsername) || await findAdminUserByEmail(normalizedEmail);

    if (existing) {
        await prisma.adminUser.update({
            where: { id: existing.id },
            data: {
                username: normalizedUsername,
                email: normalizedEmail,
                passwordHash,
                passwordSalt,
                mustChangePassword: mustChangePassword ? 1 : 0,
                updatedAt: nowIso()
            }
        });
        return existing.id;
    }

    return createAdminUser({
        username: normalizedUsername,
        email: normalizedEmail,
        passwordHash,
        passwordSalt,
        mustChangePassword
    });
}

async function getAdminUserById(id) {
    await ensureInitialized();
    return prisma.adminUser.findUnique({
        where: { id: Number(id) },
        select: {
            id: true,
            username: true,
            email: true,
            mustChangePassword: true,
            role: true,
            createdAt: true,
            updatedAt: true
        }
    });
}

async function updateAdminPassword(id, { passwordHash, passwordSalt, mustChangePassword = false }) {
    await ensureInitialized();
    await prisma.adminUser.update({
        where: { id: Number(id) },
        data: {
            passwordHash,
            passwordSalt,
            mustChangePassword: mustChangePassword ? 1 : 0,
            updatedAt: nowIso()
        }
    });
}

async function storeSession({ userId, tokenHash, expiresAt }) {
    await ensureInitialized();
    await prisma.session.create({
        data: {
            userId,
            tokenHash,
            expiresAt,
            createdAt: nowIso()
        }
    });
}

async function getSessionByTokenHash(tokenHash) {
    await ensureInitialized();
    const session = await prisma.session.findUnique({
        where: { tokenHash },
        include: { user: true }
    });

    if (!session) {
        return null;
    }

    return {
        user_id: session.userId,
        expires_at: session.expiresAt,
        username: session.user.username,
        email: session.user.email,
        must_change_password: Boolean(session.user.mustChangePassword),
        role: session.user.role
    };
}

async function deleteSessionByTokenHash(tokenHash) {
    await ensureInitialized();
    await prisma.session.deleteMany({ where: { tokenHash } });
}

async function deleteSessionsByUserId(userId) {
    await ensureInitialized();
    await prisma.session.deleteMany({ where: { userId: Number(userId) } });
}

async function deleteExpiredSessions() {
    await ensureInitialized();
    await prisma.session.deleteMany({
        where: { expiresAt: { lt: nowIso() } }
    });
}

async function adminUserCount() {
    await ensureInitialized();
    return prisma.adminUser.count();
}

module.exports = {
    prisma,
    initialize: ensureInitialized,
    getSettings,
    getPricingSettings,
    getPaymentSettings,
    getBedSettings,
    listRooms,
    listAllRooms,
    getRoomById,
    createRoom,
    updateRoom,
    listPricingRules,
    upsertPricingRule,
    deletePricingRule,
    listBookings,
    getBookingById,
    listBlockedPeriods,
    hasBlockingPeriod,
    getOverlappingBookedRooms,
    getAvailableRoomIds,
    listRoomsWithAvailability,
    listRoomOccupancy,
    listBlockedRoomOccupancy,
    listBedOccupancy,
    listActiveBookingHolds,
    getOverlappingBedUsage,
    isRoomAssignmentAvailable,
    createBooking,
    createBookingHold,
    getBookingHoldByToken,
    attachStripeSessionToHold,
    confirmBookingFromHold,
    deleteExpiredBookingHolds,
    updateBooking,
    deleteBooking,
    createBlockedPeriod,
    updateBlockedPeriod,
    deleteBlockedPeriod,
    updatePricing,
    updatePaymentSettings,
    updateBedSettings,
    createAdminUser,
    findAdminUserByUsername,
    findAdminUserByEmail,
    findAdminUserByIdentifier,
    upsertAdminLogin,
    getAdminUserById,
    updateAdminPassword,
    storeSession,
    getSessionByTokenHash,
    deleteSessionByTokenHash,
    deleteSessionsByUserId,
    deleteExpiredSessions,
    adminUserCount
};