const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const pinoHttp = require('pino-http');
const { z } = require('zod');

const { config } = require('./config');
const db = require('./db');
const {
    calculateQuote,
    calculateMultiRoomQuote,
    getNightlyPriceCents,
    addVatToPriceCents,
    parseIsoDate,
    addUtcDays,
    formatIsoDate
} = require('./services/pricing');
const { hashPassword, verifyPassword, createSessionToken, hashToken } = require('./security');
const {
    isStripeConfigured,
    createStripeCheckoutSession,
    retrieveStripeCheckoutSession
} = require('./services/payments');

const MAX_STAY_NIGHTS = 90;

const booleanishSchema = z.preprocess((value) => {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
    }

    return Boolean(value);
}, z.boolean());

const emailSchema = z.string().trim().toLowerCase().email().max(320);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const roomIdsSchema = z.array(z.coerce.number().int().positive()).min(1).max(20);
const countSchema = z.coerce.number().int().min(0).max(20).default(0);
const adultCountSchema = z.coerce.number().int().min(1).max(20).default(2);
const bedCountSchema = z.preprocess((value) => {
    if (typeof value === 'boolean') {
        return value ? 1 : 0;
    }

    if (typeof value === 'string' && ['true', 'yes', 'on'].includes(value.toLowerCase())) {
        return 1;
    }

    return value;
}, countSchema);
const occupancySchema = {
    adultCount: adultCountSchema,
    childCount: countSchema,
    babyCount: countSchema,
    babyBed: bedCountSchema,
    extraBed: bedCountSchema,
    bunkBed: bedCountSchema
};
const addressSchema = {
    street: z.string().trim().min(2).max(120),
    houseNumber: z.string().trim().min(1).max(24),
    postalCode: z.string().trim().min(2).max(24),
    city: z.string().trim().min(2).max(120),
    country: z.string().trim().min(2).max(120)
};

const quoteRequestSchema = z.object({
    checkin: isoDateSchema,
    checkout: isoDateSchema,
    selectedRoomIds: roomIdsSchema,
    ...occupancySchema
});

const holdRequestSchema = z.object({
    name: z.string().trim().min(2).max(120),
    email: emailSchema,
    phone: z.string().trim().min(6).max(40),
    nifNumber: z.string().trim().max(32).optional().default(''),
    note: z.string().trim().max(1000).optional().default(''),
    ...addressSchema,
    checkin: isoDateSchema,
    checkout: isoDateSchema,
    selectedRoomIds: roomIdsSchema,
    ...occupancySchema
});

const directBookingRequestSchema = holdRequestSchema;

const loginSchema = z.object({
    identifier: z.string().trim().min(3).max(80),
    password: z.string().min(10).max(128)
});

const priceSchema = z.object({
    low: z.coerce.number().int().min(0).max(1000000),
    mid: z.coerce.number().int().min(0).max(1000000),
    high: z.coerce.number().int().min(0).max(1000000),
    totalRooms: z.coerce.number().int().min(1).max(20)
});

const roomCreateSchema = z.object({
    name: z.string().trim().min(2).max(120),
    shortName: z.string().trim().max(24).optional().default(''),
    basePriceCents: z.union([z.coerce.number().int().min(0).max(1000000), z.null()]).optional().default(null)
});

const roomUpdateSchema = z.object({
    name: z.string().trim().min(2).max(120),
    shortName: z.string().trim().max(24).optional().default(''),
    basePriceCents: z.union([z.coerce.number().int().min(0).max(1000000), z.null()]).optional().default(null),
    isActive: booleanishSchema
});

const pricingRuleSchema = z.object({
    roomId: z.coerce.number().int().positive(),
    start: isoDateSchema,
    end: isoDateSchema,
    nightlyPriceCents: z.coerce.number().int().min(0).max(1000000),
    label: z.string().trim().max(120).optional().default('')
});

const blockedPeriodSchema = z.object({
    start: isoDateSchema,
    end: isoDateSchema,
    selectedRoomIds: roomIdsSchema,
    reason: z.string().trim().max(200).optional().default('')
});

const bookingUpdateSchema = z.object({
    name: z.string().trim().min(2).max(120),
    email: emailSchema,
    phone: z.string().trim().max(40).optional(),
    nifNumber: z.string().trim().max(32).optional().default(''),
    note: z.string().trim().max(1000).optional().default(''),
    street: z.string().trim().max(120).optional(),
    houseNumber: z.string().trim().max(24).optional(),
    postalCode: z.string().trim().max(24).optional(),
    city: z.string().trim().max(120).optional(),
    country: z.string().trim().max(120).optional(),
    checkin: isoDateSchema,
    checkout: isoDateSchema,
    selectedRoomIds: roomIdsSchema.optional(),
    assignedRoom: z.union([z.coerce.number().int().min(1).max(20), z.null()]).optional(),
    ...occupancySchema,
    stayPriceCents: z.coerce.number().int().min(0).max(100000000),
    extrasPriceCents: z.coerce.number().int().min(0).max(100000000),
    totalPriceCents: z.coerce.number().int().min(0).max(100000000),
    status: z.enum(['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled']),
    mailSent: booleanishSchema,
    depositPaid: booleanishSchema,
    paid: booleanishSchema,
    checkedIn: booleanishSchema,
    checkedOut: booleanishSchema
});

const completePaymentSchema = z.object({
    sessionId: z.string().trim().min(3)
});

const holdTokenRequestSchema = z.object({
    holdToken: z.string().trim().regex(/^[a-f0-9]{36}$/)
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(10).max(128)
});

const paymentSettingsSchema = z.object({
    stripeSecretKey: z.string().trim().max(255).optional().default('')
});

const bedSettingsSchema = z.object({
    extraBedCapacity: z.coerce.number().int().min(0).max(50),
    babyBedCapacity: z.coerce.number().int().min(0).max(50),
    bunkBedCapacity: z.coerce.number().int().min(0).max(50),
    extraBedPriceCents: z.coerce.number().int().min(0).max(1000000),
    babyBedPriceCents: z.coerce.number().int().min(0).max(1000000),
    bunkBedPriceCents: z.coerce.number().int().min(0).max(1000000)
});

function createApp() {
    const app = express();

    if (config.trustProxy) {
        app.set('trust proxy', config.trustProxy);
    }

    void db.deleteExpiredSessions();
    void db.deleteExpiredBookingHolds();

    app.disable('x-powered-by');
    app.use(pinoHttp({
        serializers: {
            req(req) {
                return {
                    method: req.method,
                    path: sanitizeRequestPath(req.url),
                    remoteAddress: req.remoteAddress,
                    remotePort: req.remotePort
                };
            },
            res(res) {
                return {
                    statusCode: res.statusCode
                };
            }
        }
    }));
    app.use(helmet({
        crossOriginResourcePolicy: { policy: 'same-origin' }
    }));
    app.use(compression());
    app.use(express.json({ limit: '200kb' }));
    app.use(cookieParser());

    app.use('/api', rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 200,
        standardHeaders: true,
        legacyHeaders: false
    }));

    app.use('/api/admin/login', rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 10,
        standardHeaders: true,
        legacyHeaders: false
    }));

    app.use('/api/admin', (req, res, next) => {
        res.setHeader('Cache-Control', 'no-store, private, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        next();
    });

    app.get('/styles.css', serveFile('styles.css', 'text/css; charset=utf-8', true));
    app.get('/site.js', serveFile('site.js', 'application/javascript; charset=utf-8', true));
    app.get('/script.js', serveFile('script.js', 'application/javascript; charset=utf-8', true));
    app.get('/admin.js', serveFile('admin.js', 'application/javascript; charset=utf-8', false));
    app.get('/payment.js', serveFile('payment.js', 'application/javascript; charset=utf-8', true));
    app.get('/payment-success.js', serveFile('payment-success.js', 'application/javascript; charset=utf-8', true));
    app.get('/flatpickr.js', (req, res) => res.sendFile(path.join(config.rootDir, 'node_modules', 'flatpickr', 'dist', 'flatpickr.js')));
    app.get('/flatpickr.css', (req, res) => res.sendFile(path.join(config.rootDir, 'node_modules', 'flatpickr', 'dist', 'flatpickr.css')));
    app.get('/logo.png', (req, res) => res.sendFile(path.join(config.rootDir, 'logo.png')));

    app.get('/', (req, res) => res.sendFile(path.join(config.rootDir, 'index.html')));
    app.get('/index.html', (req, res) => res.redirect('/'));
    app.get('/home', (req, res) => res.sendFile(path.join(config.rootDir, 'home.html')));
    app.get('/home.html', (req, res) => res.redirect('/home'));
    app.get('/admin', (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.sendFile(path.join(config.rootDir, 'admin.html'));
    });
    app.get('/admin.html', (req, res) => res.redirect('/admin'));
    app.get('/payment', (req, res) => res.sendFile(path.join(config.rootDir, 'payment.html')));
    app.get('/payment-success', (req, res) => res.sendFile(path.join(config.rootDir, 'payment-success.html')));

    app.get('/api/health', async (req, res) => {
        res.json({ ok: true, adminUsers: await db.adminUserCount() });
    });

    app.get('/api/public/settings', async (req, res) => {
        const pricing = await db.getPricingSettings();
        const settings = await db.getSettings();
        const bedSettings = await db.getBedSettings();
        const rooms = await db.listRooms();

        res.json({
            propertyName: settings.property_name,
            totalRooms: pricing.totalRooms,
            bedSettings,
            stripeConfigured: await isStripeConfigured(),
            holdMinutes: config.holdTtlMinutes,
            pricing: {
                low: pricing.low,
                mid: pricing.mid,
                high: pricing.high
            },
            rooms
        });
    });

    app.get('/api/public/calendar', async (req, res, next) => {
        try {
            const monthParam = String(req.query.month || '').trim();
            if (!/^\d{4}-\d{2}$/.test(monthParam)) {
                return res.status(400).json({ message: 'Gebruik maandformaat YYYY-MM.' });
            }

            const requestedMonthStart = parseIsoDate(`${monthParam}-01`);
            const monthStart = requestedMonthStart;
            const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
            const monthStartIso = formatIsoDate(monthStart);
            const monthEndIso = formatIsoDate(monthEnd);
            const rooms = await db.listRooms();
            const pricing = await db.getPricingSettings();
            const pricingRules = await db.listPricingRules();
            const occupancy = await db.listRoomOccupancy(monthStartIso, monthEndIso);
            const blockedOccupancy = await db.listBlockedRoomOccupancy(monthStartIso, monthEndIso);
            const bedSettings = await db.getBedSettings();
            const bedOccupancy = await db.listBedOccupancy(monthStartIso, monthEndIso);
            const activeHolds = await db.listActiveBookingHolds();

            const holdOccupancy = activeHolds.flatMap((hold) => hold.selectedRoomIds.map((roomId) => ({
                roomId,
                checkin: hold.checkin,
                checkout: hold.checkout,
                status: 'held'
            })));

            const days = [];
            for (let day = new Date(monthStart); day < monthEnd; day = addUtcDays(day, 1)) {
                days.push(formatIsoDate(day));
            }

            res.json({
                month: formatIsoDate(monthStart).slice(0, 7),
                days,
                beds: buildBedCalendar(days, bedSettings, bedOccupancy),
                rooms: rooms.map((room) => ({
                    ...room,
                    days: days.map((date) => {
                        const nextDate = formatIsoDate(addUtcDays(parseIsoDate(date), 1));
                        const bookingCell = occupancy.find((entry) => entry.roomId === room.id && entry.checkin < nextDate && entry.checkout > date);
                        const blockedCell = blockedOccupancy.find((entry) => entry.roomId === room.id && entry.checkin < nextDate && entry.checkout > date);
                        const holdCell = holdOccupancy.find((entry) => entry.roomId === room.id && entry.checkin < nextDate && entry.checkout > date);
                        return {
                            date,
                            status: holdCell ? 'held' : (bookingCell || blockedCell) ? 'booked' : 'available',
                            detail: blockedCell ? (blockedCell.reason || 'Geblokkeerd') : bookingCell ? 'Geboekt' : holdCell ? 'Tijdelijk vastgelegd' : 'Vrij',
                            priceCents: getNightlyPriceCents({
                                roomId: room.id,
                                date,
                                pricingRules,
                                roomBasePriceCents: room.basePriceCents,
                                seasonPricing: pricing
                            }),
                            priceInclVatCents: addVatToPriceCents(getNightlyPriceCents({
                                roomId: room.id,
                                date,
                                pricingRules,
                                roomBasePriceCents: room.basePriceCents,
                                seasonPricing: pricing
                            }))
                        };
                    })
                }))
            });
        } catch (error) {
            next(error);
        }
    });

    app.get('/api/public/availability', async (req, res, next) => {
        try {
            const querySchema = z.object({
                checkin: isoDateSchema,
                checkout: isoDateSchema,
                extraBed: booleanishSchema.optional().default(false)
            });
            const data = querySchema.parse(req.query);
            validateDateRange(data.checkin, data.checkout);

            const roomOptions = await buildRoomOptions(data.checkin, data.checkout, data.extraBed);
            return res.json({ rooms: roomOptions });
        } catch (error) {
            next(error);
        }
    });

    app.post('/api/public/quote', async (req, res, next) => {
        try {
            const data = quoteRequestSchema.parse(req.body);
            validateDateRange(data.checkin, data.checkout);
            validateOccupancyForRooms(data, data.selectedRoomIds);

            const pricing = await db.getPricingSettings();
            const bedSettings = await db.getBedSettings();
            const pricingRules = await db.listPricingRules();
            const rooms = await db.listRooms();
            await assertRoomsAvailable(data.selectedRoomIds, data.checkin, data.checkout);
            await assertBedsAvailable(data, data.checkin, data.checkout);

            const quote = calculateMultiRoomQuote({
                selectedRoomIds: data.selectedRoomIds,
                checkin: data.checkin,
                checkout: data.checkout,
                adultCount: data.adultCount,
                childCount: data.childCount,
                babyCount: data.babyCount,
                babyBedCount: data.babyBed,
                extraBedCount: data.extraBed,
                bunkBedCount: data.bunkBed,
                prices: pricing,
                pricingRules,
                rooms,
                bedPrices: bedSettings
            });

            return res.json({
                ...quote,
                selectedRooms: rooms.filter((room) => data.selectedRoomIds.includes(room.id))
            });
        } catch (error) {
            next(error);
        }
    });

    app.post('/api/public/bookings', async (req, res, next) => {
        try {
            const data = directBookingRequestSchema.parse(req.body);
            validateDateRange(data.checkin, data.checkout);
            validateOccupancyForRooms(data, data.selectedRoomIds);

            const pricing = await db.getPricingSettings();
            const bedSettings = await db.getBedSettings();
            const pricingRules = await db.listPricingRules();
            const rooms = await db.listRooms();
            await assertRoomsAvailable(data.selectedRoomIds, data.checkin, data.checkout);
            await assertBedsAvailable(data, data.checkin, data.checkout);

            const quote = calculateMultiRoomQuote({
                selectedRoomIds: data.selectedRoomIds,
                checkin: data.checkin,
                checkout: data.checkout,
                adultCount: data.adultCount,
                childCount: data.childCount,
                babyCount: data.babyCount,
                babyBedCount: data.babyBed,
                extraBedCount: data.extraBed,
                bunkBedCount: data.bunkBed,
                prices: pricing,
                pricingRules,
                rooms,
                bedPrices: bedSettings
            });

            const booking = await db.createBooking({
                ...data,
                selectedRoomIds: data.selectedRoomIds,
                stayPriceCents: quote.stayPriceCents,
                extrasPriceCents: quote.extrasPriceCents,
                totalPriceCents: quote.totalPriceCents
            });

            return res.status(201).json({ booking });
        } catch (error) {
            next(error);
        }
    });

    app.post('/api/public/hold', async (req, res, next) => {
        try {
            const data = holdRequestSchema.parse(req.body);
            validateDateRange(data.checkin, data.checkout);
            validateOccupancyForRooms(data, data.selectedRoomIds);

            const pricing = await db.getPricingSettings();
            const bedSettings = await db.getBedSettings();
            const pricingRules = await db.listPricingRules();
            const rooms = await db.listRooms();
            await assertRoomsAvailable(data.selectedRoomIds, data.checkin, data.checkout);
            await assertBedsAvailable(data, data.checkin, data.checkout);

            const quote = calculateMultiRoomQuote({
                selectedRoomIds: data.selectedRoomIds,
                checkin: data.checkin,
                checkout: data.checkout,
                adultCount: data.adultCount,
                childCount: data.childCount,
                babyCount: data.babyCount,
                babyBedCount: data.babyBed,
                extraBedCount: data.extraBed,
                bunkBedCount: data.bunkBed,
                prices: pricing,
                pricingRules,
                rooms,
                bedPrices: bedSettings
            });

            let hold = await db.createBookingHold({
                ...data,
                selectedRoomIds: data.selectedRoomIds,
                stayPriceCents: quote.stayPriceCents,
                extrasPriceCents: quote.extrasPriceCents,
                totalPriceCents: quote.totalPriceCents
            });

            let checkoutUrl = null;
            if (await isStripeConfigured()) {
                const roomName = hold.selectedRooms.map((room) => room.name).join(', ');
                const session = await createStripeCheckoutSession({ hold, roomName });
                hold = await db.attachStripeSessionToHold(hold.holdToken, session.id);
                checkoutUrl = session.url;
            }

            return res.status(201).json({
                hold: toPublicHold(hold),
                holdToken: hold.holdToken,
                checkoutUrl,
                stripeConfigured: await isStripeConfigured()
            });
        } catch (error) {
            next(error);
        }
    });

    app.post('/api/public/hold-details', async (req, res, next) => {
        try {
            const { holdToken } = holdTokenRequestSchema.parse(req.body);
            const hold = await db.getBookingHoldByToken(holdToken);
            if (!hold) {
                return res.status(404).json({ message: 'Hold niet gevonden of verlopen.' });
            }

            return res.json({ hold: toPublicHold(hold), stripeConfigured: await isStripeConfigured() });
        } catch (error) {
            next(error);
        }
    });

    app.post('/api/public/checkout-session', async (req, res, next) => {
        try {
            const { holdToken } = holdTokenRequestSchema.parse(req.body);
            const hold = await db.getBookingHoldByToken(holdToken);
            if (!hold) {
                return res.status(404).json({ message: 'Hold niet gevonden of verlopen.' });
            }

            if (!await isStripeConfigured()) {
                return res.status(503).json({ message: 'Stripe is nog niet geconfigureerd.' });
            }

            const roomName = hold.selectedRooms.map((room) => room.name).join(', ');
            const session = await createStripeCheckoutSession({ hold, roomName });
            await db.attachStripeSessionToHold(hold.holdToken, session.id);
            return res.json({ checkoutUrl: session.url, sessionId: session.id });
        } catch (error) {
            next(error);
        }
    });
    
    app.post('/api/public/confirm-hold', async (req, res, next) => {
        try {
            const { holdToken } = holdTokenRequestSchema.parse(req.body);
            const hold = await db.getBookingHoldByToken(holdToken);

            if (!hold) {
                return res.status(404).json({ message: 'Hold niet gevonden of verlopen.' });
            }

            await assertBedsAvailable(hold, hold.checkin, hold.checkout, null, holdToken);

            const booking = await db.confirmBookingFromHold(holdToken, {
                paid: false,
                depositPaid: false
            });
            if (!booking) {
                return res.status(409).json({ message: 'Kon booking niet bevestigen.' });
            }

            return res.json({ booking });
        } catch (error) {
            next(error);
        }
    });
    
    app.post('/api/public/complete-payment', async (req, res, next) => {
        try {
            const data = completePaymentSchema.parse(req.body);
            const session = await retrieveStripeCheckoutSession(data.sessionId);

            const holdToken = session?.metadata?.holdToken;
            if (!holdToken) {
                return res.status(400).json({ message: 'Geen geldige hold gekoppeld aan deze betaling.' });
            }

            const hold = await db.getBookingHoldByToken(holdToken);
            validatePaidStripeSession(session, hold);

            await assertBedsAvailable(hold, hold.checkin, hold.checkout, null, holdToken);

            const booking = await db.confirmBookingFromHold(holdToken);
            if (!booking) {
                return res.status(404).json({ message: 'Hold niet meer beschikbaar.' });
            }

            return res.json({ booking });
        } catch (error) {
            next(error);
        }
    });

    app.post('/api/admin/login', requireSameOrigin, async (req, res, next) => {
        try {
            const data = loginSchema.parse(req.body);
            const user = await db.findAdminUserByIdentifier(data.identifier);

            if (!user || !verifyPassword(data.password, user.passwordSalt, user.passwordHash)) {
                return res.status(401).json({ message: 'Gebruikersnaam of wachtwoord klopt niet.' });
            }

            const token = createSessionToken();
            const expiresAt = new Date(Date.now() + config.sessionTtlDays * 24 * 60 * 60 * 1000).toISOString();

            await db.storeSession({
                userId: user.id,
                tokenHash: hashToken(token),
                expiresAt
            });

            res.cookie('csl_admin_session', token, {
                httpOnly: true,
                sameSite: 'strict',
                secure: config.isProduction,
                maxAge: config.sessionTtlDays * 24 * 60 * 60 * 1000,
                path: '/'
            });

            return res.json({
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    mustChangePassword: Boolean(user.mustChangePassword),
                    role: user.role
                }
            });
        } catch (error) {
            return next(error);
        }
    });

    app.post('/api/admin/logout', requireAdmin, async (req, res) => {
        const token = req.cookies.csl_admin_session;
        await db.deleteSessionByTokenHash(hashToken(token));
        res.clearCookie('csl_admin_session', { path: '/' });
        res.status(204).send();
    });

    app.get('/api/admin/session', requireAdmin, (req, res) => {
        res.json({ user: req.adminUser });
    });

    app.get('/api/admin/bootstrap', requireAdmin, async (req, res) => {
        const paymentSettings = await db.getPaymentSettings();
        res.json({
            user: req.adminUser,
            pricing: await db.getPricingSettings(),
            bedSettings: await db.getBedSettings(),
            rooms: await db.listAllRooms(),
            pricingRules: await db.listPricingRules(),
            bookings: await db.listBookings(),
            blocks: await db.listBlockedPeriods(),
            activeHolds: await db.listActiveBookingHolds(),
            paymentSettings: {
                stripeConfigured: Boolean(paymentSettings.stripeSecretKey || config.stripeSecretKey),
                stripeSecretKeyMasked: maskSecret(paymentSettings.stripeSecretKey || config.stripeSecretKey)
            }
        });
    });

    app.get('/api/admin/payment-settings', requireAdmin, async (req, res) => {
        const paymentSettings = await db.getPaymentSettings();
        const stripeSecretKey = paymentSettings.stripeSecretKey || config.stripeSecretKey;
        res.json({
            paymentSettings: {
                stripeConfigured: Boolean(stripeSecretKey),
                stripeSecretKeyMasked: maskSecret(stripeSecretKey)
            }
        });
    });

    app.put('/api/admin/payment-settings', requireAdmin, requireSameOrigin, async (req, res, next) => {
        try {
            const data = paymentSettingsSchema.parse(req.body);
            const paymentSettings = await db.updatePaymentSettings(data);
            res.json({
                paymentSettings: {
                    stripeConfigured: Boolean(paymentSettings.stripeSecretKey),
                    stripeSecretKeyMasked: maskSecret(paymentSettings.stripeSecretKey)
                }
            });
        } catch (error) {
            next(error);
        }
    });

    app.get('/api/admin/bed-settings', requireAdmin, async (req, res) => {
        res.json({ bedSettings: await db.getBedSettings() });
    });

    app.put('/api/admin/bed-settings', requireAdmin, requireSameOrigin, async (req, res, next) => {
        try {
            const data = bedSettingsSchema.parse(req.body);
            const bedSettings = await db.updateBedSettings(data);
            res.json({ bedSettings });
        } catch (error) {
            next(error);
        }
    });

    app.post('/api/admin/change-password', requireAdmin, requireSameOrigin, async (req, res, next) => {
        try {
            const data = changePasswordSchema.parse(req.body);
            const user = await db.findAdminUserByIdentifier(req.adminUser.email);

            if (!user || !verifyPassword(data.currentPassword, user.passwordSalt, user.passwordHash)) {
                return res.status(401).json({ message: 'Het huidige wachtwoord klopt niet.' });
            }

            const { salt, hash } = hashPassword(data.newPassword);
            await db.updateAdminPassword(user.id, {
                passwordHash: hash,
                passwordSalt: salt,
                mustChangePassword: false
            });

            await db.deleteSessionsByUserId(user.id);
            res.clearCookie('csl_admin_session', {
                httpOnly: true,
                sameSite: 'strict',
                secure: config.isProduction,
                path: '/'
            });

            return res.status(204).send();
        } catch (error) {
            next(error);
        }
    });

    app.post('/api/admin/rooms', requireAdmin, requireSameOrigin, async (req, res, next) => {
        try {
            const data = roomCreateSchema.parse(req.body);
            const room = await db.createRoom(data);
            return res.status(201).json({ room, rooms: await db.listAllRooms() });
        } catch (error) {
            next(error);
        }
    });

    app.put('/api/admin/rooms/:id', requireAdmin, requireSameOrigin, async (req, res, next) => {
        try {
            const room = await db.updateRoom(Number(req.params.id), roomUpdateSchema.parse(req.body));

            if (!room) {
                return res.status(404).json({ message: 'Kamer niet gevonden.' });
            }

            return res.json({
                room,
                rooms: await db.listAllRooms(),
                pricing: await db.getPricingSettings()
            });
        } catch (error) {
            next(error);
        }
    });

    app.put('/api/admin/pricing', requireAdmin, requireSameOrigin, async (req, res, next) => {
        try {
            const data = priceSchema.parse(req.body);
            await db.updatePricing(data);
            res.json({ pricing: await db.getPricingSettings(), rooms: await db.listAllRooms() });
        } catch (error) {
            next(error);
        }
    });

    app.get('/api/admin/pricing-rules', requireAdmin, async (req, res) => {
        res.json({ pricingRules: await db.listPricingRules() });
    });

    app.post('/api/admin/pricing-rules', requireAdmin, requireSameOrigin, async (req, res, next) => {
        try {
            const data = pricingRuleSchema.parse(req.body);
            validateInclusiveDateRange(data.start, data.end);
            const pricingRule = await db.upsertPricingRule(data);
            res.status(201).json({ pricingRule });
        } catch (error) {
            next(error);
        }
    });

    app.put('/api/admin/pricing-rules/:id', requireAdmin, requireSameOrigin, async (req, res, next) => {
        try {
            const data = pricingRuleSchema.parse(req.body);
            validateInclusiveDateRange(data.start, data.end);
            const pricingRule = await db.upsertPricingRule({ ...data, id: Number(req.params.id) });
            res.json({ pricingRule });
        } catch (error) {
            next(error);
        }
    });

    app.delete('/api/admin/pricing-rules/:id', requireAdmin, requireSameOrigin, async (req, res) => {
        await db.deletePricingRule(Number(req.params.id));
        res.status(204).send();
    });

    app.post('/api/admin/blocks', requireAdmin, requireSameOrigin, async (req, res, next) => {
        try {
            const data = blockedPeriodSchema.parse(req.body);
            validateInclusiveDateRange(data.start, data.end);

            if (await db.hasBlockingPeriod(data.selectedRoomIds, data.start, nextDay(data.end))) {
                return res.status(409).json({ message: 'Deze blokkade overlapt een bestaande blokkade.' });
            }

            const block = await db.createBlockedPeriod(data.start, data.end, data.reason || '', data.selectedRoomIds);
            return res.status(201).json({ block });
        } catch (error) {
            next(error);
        }
    });

    app.put('/api/admin/blocks/:id', requireAdmin, requireSameOrigin, async (req, res, next) => {
        try {
            const blockId = Number(req.params.id);
            const data = blockedPeriodSchema.parse(req.body);
            validateInclusiveDateRange(data.start, data.end);

            if (await db.hasBlockingPeriod(data.selectedRoomIds, data.start, nextDay(data.end), blockId)) {
                return res.status(409).json({ message: 'Deze blokkade overlapt een bestaande blokkade.' });
            }

            const block = await db.updateBlockedPeriod(blockId, data);
            if (!block) {
                return res.status(404).json({ message: 'Blokkade niet gevonden.' });
            }

            return res.json({ block });
        } catch (error) {
            next(error);
        }
    });

    app.delete('/api/admin/blocks/:id', requireAdmin, requireSameOrigin, async (req, res) => {
        await db.deleteBlockedPeriod(Number(req.params.id));
        res.status(204).send();
    });

    app.put('/api/admin/bookings/:id', requireAdmin, requireSameOrigin, async (req, res, next) => {
        try {
            const bookingId = Number(req.params.id);
            const existing = await db.getBookingById(bookingId);

            if (!existing) {
                return res.status(404).json({ message: 'Boeking niet gevonden.' });
            }

            const data = bookingUpdateSchema.parse(req.body);
            validateDateRange(data.checkin, data.checkout);

            const selectedRoomIds = data.selectedRoomIds || (data.assignedRoom ? [Number(data.assignedRoom)] : existing.selectedRoomIds);
            await assertRoomsAvailable(selectedRoomIds, data.checkin, data.checkout, bookingId);
            validateOccupancyForRooms(data, selectedRoomIds);
            await assertBedsAvailable(data, data.checkin, data.checkout, bookingId);

            const booking = await db.updateBooking(bookingId, {
                ...data,
                selectedRoomIds
            });
            return res.json({ booking });
        } catch (error) {
            next(error);
        }
    });

    app.delete('/api/admin/bookings/:id', requireAdmin, requireSameOrigin, async (req, res) => {
        await db.deleteBooking(Number(req.params.id));
        res.status(204).send();
    });

    app.use((req, res) => {
        res.status(404).json({ message: 'Niet gevonden.' });
    });

    app.use((error, req, res, next) => {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                message: 'Validatiefout.',
                errors: error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }))
            });
        }

        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }

        req.log.error(error);
        return res.status(500).json({ message: 'Interne serverfout.' });
    });

    return app;
}

function buildBedCalendar(days, bedSettings, bedOccupancy) {
    return [
        buildBedCalendarRow({
            name: 'Kinderbedden',
            field: 'extraBed',
            capacity: bedSettings.extraBedCapacity,
            days,
            bedOccupancy
        }),
        buildBedCalendarRow({
            name: 'Stapelbedden',
            field: 'bunkBed',
            capacity: bedSettings.bunkBedCapacity,
            days,
            bedOccupancy
        }),
        buildBedCalendarRow({
            name: 'Babybedden',
            field: 'babyBed',
            capacity: bedSettings.babyBedCapacity,
            days,
            bedOccupancy
        })
    ];
}

function buildBedCalendarRow({ name, field, capacity, days, bedOccupancy }) {
    const totalCapacity = Number(capacity || 0);
    return {
        name,
        capacity: totalCapacity,
        days: days.map((date) => {
            const nextDate = formatIsoDate(addUtcDays(parseIsoDate(date), 1));
            const overlapping = bedOccupancy.filter((entry) => entry.checkin < nextDate && entry.checkout > date);
            const used = overlapping.reduce((sum, entry) => sum + Number(entry[field] || 0), 0);
            const held = overlapping
                .filter((entry) => entry.type === 'hold')
                .reduce((sum, entry) => sum + Number(entry[field] || 0), 0);
            const available = Math.max(totalCapacity - used, 0);
            const status = available <= 0 ? 'booked' : used > 0 || held > 0 ? 'held' : 'available';

            return {
                date,
                status,
                used,
                held,
                available,
                capacity: totalCapacity,
                detail: `${used} van ${totalCapacity} gebruikt · ${available} beschikbaar`
            };
        })
    };
}

async function buildRoomOptions(checkin, checkout, extraBed, ignoreHoldToken = null) {
    const pricing = await db.getPricingSettings();
    const pricingRules = await db.listPricingRules();
    const rooms = await db.listRoomsWithAvailability(checkin, checkout, null, ignoreHoldToken);

    return rooms.map((room) => {
        const quote = calculateQuote({
            roomId: room.id,
            checkin,
            checkout,
            extraBed: false,
            roomsRequested: 1,
            prices: pricing,
            pricingRules,
            roomBasePriceCents: room.basePriceCents
        });

        return {
            ...room,
            nights: quote.nights,
            stayPriceCents: quote.stayPriceCents,
            extrasPriceCents: quote.extrasPriceCents,
            subtotalPriceCents: quote.subtotalPriceCents,
            vatRatePercent: quote.vatRatePercent,
            vatPriceCents: quote.vatPriceCents,
            totalPriceCents: quote.totalPriceCents,
            firstNightPriceCents: addVatToPriceCents(getNightlyPriceCents({
                roomId: room.id,
                date: checkin,
                pricingRules,
                roomBasePriceCents: room.basePriceCents,
                seasonPricing: pricing
            }))
        };
    });
}

function validateOccupancyForRooms(data, selectedRoomIds) {
    const roomCount = selectedRoomIds.length;
    const adultCount = Number(data.adultCount || 0);
    const childCount = Number(data.childCount || 0);
    const babyCount = Number(data.babyCount || 0);
    const extraBedCount = Number(data.extraBed || 0);
    const babyBedCount = Number(data.babyBed || 0);
    const bunkBedCount = Number(data.bunkBed || 0);
    const payingGuests = adultCount + childCount;
    const childExtraPlaces = extraBedCount + (bunkBedCount * 2);

    if (adultCount < 1) {
        const error = new Error('Er moet minimaal één volwassene meereizen.');
        error.statusCode = 400;
        throw error;
    }

    if (extraBedCount + bunkBedCount > childCount) {
        const error = new Error('Kinderbedden en stapelbedden kunnen alleen voor kinderen worden gebruikt.');
        error.statusCode = 400;
        throw error;
    }

    if (extraBedCount + bunkBedCount > roomCount) {
        const error = new Error('Er kan per kamer maximaal één kinderbed of stapelbed worden geplaatst.');
        error.statusCode = 400;
        throw error;
    }

    if (babyBedCount > babyCount) {
        const error = new Error('Babybedjes kunnen alleen voor baby’s worden gebruikt.');
        error.statusCode = 400;
        throw error;
    }

    if (babyBedCount > roomCount) {
        const error = new Error('Er kan maximaal één babybedje per kamer worden geplaatst.');
        error.statusCode = 400;
        throw error;
    }

    if (payingGuests > (roomCount * 2) + childExtraPlaces) {
        const error = new Error('Selecteer meer kamers of voeg een extra kinderbed toe voor dit aantal gasten.');
        error.statusCode = 409;
        throw error;
    }
}

async function assertRoomsAvailable(selectedRoomIds, checkin, checkout, ignoreBookingId = null, ignoreHoldToken = null) {
    const roomIds = [...new Set(selectedRoomIds.map(Number))];
    const availableRoomIds = new Set(await db.getAvailableRoomIds(checkin, checkout, ignoreBookingId, ignoreHoldToken));
    const rooms = await db.listRooms();
    const allRoomIds = new Set(rooms.map((room) => room.id));

    if (!roomIds.every((roomId) => allRoomIds.has(roomId))) {
        const error = new Error('Een of meer geselecteerde kamers bestaan niet.');
        error.statusCode = 400;
        throw error;
    }

    if (!roomIds.every((roomId) => availableRoomIds.has(roomId))) {
        const error = new Error('Een of meer geselecteerde kamers zijn niet beschikbaar in deze periode.');
        error.statusCode = 409;
        throw error;
    }
}

async function assertBedsAvailable(data, checkin, checkout, ignoreBookingId = null, ignoreHoldToken = null) {
    if (['cancelled', 'checked-out'].includes(data.status)) {
        return;
    }

    const requestedExtraBeds = Number(data.extraBed || 0);
    const requestedBabyBeds = Number(data.babyBed || 0);
    const requestedBunkBeds = Number(data.bunkBed || 0);

    if (!requestedExtraBeds && !requestedBabyBeds && !requestedBunkBeds) {
        return;
    }

    const [bedSettings, usage] = await Promise.all([
        db.getBedSettings(),
        db.getOverlappingBedUsage(checkin, checkout, { ignoreBookingId, ignoreHoldToken })
    ]);
    const availableExtraBeds = Math.max(Number(bedSettings.extraBedCapacity || 0) - usage.extraBed, 0);
    const availableBabyBeds = Math.max(Number(bedSettings.babyBedCapacity || 0) - usage.babyBed, 0);
    const availableBunkBeds = Math.max(Number(bedSettings.bunkBedCapacity || 0) - usage.bunkBed, 0);

    if (requestedExtraBeds > availableExtraBeds) {
        const error = new Error(`Er zijn in deze periode nog ${availableExtraBeds} kinderbedden beschikbaar.`);
        error.statusCode = 409;
        throw error;
    }

    if (requestedBabyBeds > availableBabyBeds) {
        const error = new Error(`Er zijn in deze periode nog ${availableBabyBeds} babybedden beschikbaar.`);
        error.statusCode = 409;
        throw error;
    }

    if (requestedBunkBeds > availableBunkBeds) {
        const error = new Error(`Er zijn in deze periode nog ${availableBunkBeds} stapelbedden beschikbaar.`);
        error.statusCode = 409;
        throw error;
    }
}

function serveFile(fileName, contentType, cacheAsset) {
    return (req, res) => {
        if (cacheAsset) {
            res.setHeader('Cache-Control', 'public, max-age=86400');
        } else {
            res.setHeader('Cache-Control', 'no-store');
        }
        res.type(contentType);
        res.sendFile(path.join(config.rootDir, fileName));
    };
}

async function requireAdmin(req, res, next) {
    const token = req.cookies.csl_admin_session;

    if (!token) {
        return res.status(401).json({ message: 'Niet ingelogd.' });
    }

    const session = await db.getSessionByTokenHash(hashToken(token));

    if (!session || new Date(session.expires_at) < new Date()) {
        if (session) {
            await db.deleteSessionByTokenHash(hashToken(token));
        }

        res.clearCookie('csl_admin_session', { path: '/' });
        return res.status(401).json({ message: 'Sessie verlopen.' });
    }

    req.adminUser = {
        id: session.user_id,
        username: session.username,
        email: session.email,
        mustChangePassword: Boolean(session.must_change_password),
        role: session.role
    };

    next();
}

function requireSameOrigin(req, res, next) {
    const origin = normalizeTrustedOrigin(req.headers.origin);
    const refererOrigin = getOriginFromReferer(req.headers.referer);
    const trustedOrigin = config.appOrigin;

    if (origin === trustedOrigin || refererOrigin === trustedOrigin) {
        return next();
    }

    if (!origin && !refererOrigin) {
        return res.status(403).json({ message: 'Origin of referer ontbreekt.' });
    }

    if (origin !== trustedOrigin && refererOrigin !== trustedOrigin) {
        return res.status(403).json({ message: 'Ongeldige origin.' });
    }

    next();
}

function normalizeTrustedOrigin(value) {
    if (!value) {
        return '';
    }

    try {
        return new URL(String(value)).origin;
    } catch {
        return '';
    }
}

function getOriginFromReferer(value) {
    if (!value) {
        return '';
    }

    try {
        return new URL(String(value)).origin;
    } catch {
        return '';
    }
}

function validateDateRange(checkin, checkout) {
    const checkinDate = parseValidIsoDate(checkin);
    const checkoutDate = parseValidIsoDate(checkout);
    const nights = (checkoutDate.getTime() - checkinDate.getTime()) / (24 * 60 * 60 * 1000);

    if (nights <= 0) {
        const error = new Error('Checkout moet na checkin liggen.');
        error.statusCode = 400;
        throw error;
    }

    if (nights > MAX_STAY_NIGHTS) {
        const error = new Error(`Een verblijf kan maximaal ${MAX_STAY_NIGHTS} nachten duren.`);
        error.statusCode = 400;
        throw error;
    }
}

function validatePaidStripeSession(session, hold) {
    if (!session || session.payment_status !== 'paid' || session.mode !== 'payment') {
        const error = new Error('Betaling is nog niet afgerond.');
        error.statusCode = 409;
        throw error;
    }

    if (!hold) {
        const error = new Error('Hold niet meer beschikbaar.');
        error.statusCode = 404;
        throw error;
    }

    if (session.id !== hold.stripeSessionId || session.currency !== 'eur') {
        const error = new Error('De betaling hoort niet bij deze reservering.');
        error.statusCode = 409;
        throw error;
    }

    if (session.amount_total == null || Number(session.amount_total) !== Number(hold.totalPriceCents)) {
        const error = new Error('Het betaalde bedrag komt niet overeen met de reservering.');
        error.statusCode = 409;
        throw error;
    }
}

function validateInclusiveDateRange(start, end) {
    parseValidIsoDate(start);
    parseValidIsoDate(end);

    if (start > end) {
        const error = new Error('Einddatum moet op of na de startdatum liggen.');
        error.statusCode = 400;
        throw error;
    }
}

function parseValidIsoDate(value) {
    const date = parseIsoDate(value);
    if (Number.isNaN(date.getTime()) || formatIsoDate(date) !== value) {
        const error = new Error('Gebruik een geldige datum in formaat YYYY-MM-DD.');
        error.statusCode = 400;
        throw error;
    }

    return date;
}

function nextDay(dateString) {
    const date = new Date(`${dateString}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().slice(0, 10);
}

function maskSecret(value) {
    const secret = String(value || '').trim();
    if (!secret) {
        return '';
    }

    if (secret.length <= 8) {
        return '********';
    }

    return `${secret.slice(0, 4)}${'*'.repeat(Math.max(4, secret.length - 8))}${secret.slice(-4)}`;
}

function toPublicHold(hold) {
    return {
        guestName: maskName(hold.guestName),
        guestEmail: maskEmail(hold.guestEmail),
        checkin: hold.checkin,
        checkout: hold.checkout,
        stayPriceCents: hold.stayPriceCents,
        extrasPriceCents: hold.extrasPriceCents,
        subtotalPriceCents: hold.subtotalPriceCents,
        vatRatePercent: hold.vatRatePercent,
        vatPriceCents: hold.vatPriceCents,
        totalPriceCents: hold.totalPriceCents,
        expiresAt: hold.expiresAt,
        selectedRooms: hold.selectedRooms.map((room) => ({ id: room.id, name: room.name }))
    };
}

function maskName(value) {
    return String(value || '').trim().split(/\s+/).filter(Boolean).map((part) => `${part.charAt(0)}***`).join(' ');
}

function maskEmail(value) {
    const [localPart = '', domain = ''] = String(value || '').split('@');
    return domain ? `${localPart.charAt(0)}***@${domain}` : '';
}

function sanitizeRequestPath(value) {
    return String(value || '')
        .split('?')[0]
        .replace(/[a-f0-9]{36,}/gi, '[REDACTED]');
}

module.exports = {
    createApp,
    validateDateRange,
    validatePaidStripeSession,
    toPublicHold,
    sanitizeRequestPath
};