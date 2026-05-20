const Stripe = require('stripe');

const { config } = require('../config');
const db = require('../db');

let stripeClient = null;
let stripeClientKey = null;

async function getStripeSecretKey() {
    const paymentSettings = await db.getPaymentSettings();
    return paymentSettings.stripeSecretKey || config.stripeSecretKey || '';
}

async function getStripeClient() {
    const stripeSecretKey = await getStripeSecretKey();
    if (!stripeSecretKey) {
        return null;
    }

    if (!stripeClient || stripeClientKey !== stripeSecretKey) {
        stripeClient = new Stripe(stripeSecretKey);
        stripeClientKey = stripeSecretKey;
    }

    return stripeClient;
}

async function isStripeConfigured() {
    return Boolean(await getStripeSecretKey());
}

async function createStripeCheckoutSession({ hold, roomName }) {
    const stripe = await getStripeClient();

    if (!stripe) {
        const error = new Error('Stripe is nog niet geconfigureerd.');
        error.statusCode = 503;
        throw error;
    }

    return stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: `${config.appOrigin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.appOrigin}/payment?hold=${encodeURIComponent(hold.holdToken)}`,
        customer_email: hold.guestEmail,
        metadata: {
            holdToken: hold.holdToken,
            roomIds: hold.selectedRoomIds.join(',')
        },
        line_items: [
            {
                quantity: 1,
                price_data: {
                    currency: 'eur',
                    unit_amount: hold.totalPriceCents,
                    product_data: {
                        name: `Verblijf ${roomName}`,
                        description: `${hold.checkin} tot ${hold.checkout}`
                    }
                }
            }
        ]
    });
}

async function retrieveStripeCheckoutSession(sessionId) {
    const stripe = await getStripeClient();

    if (!stripe) {
        const error = new Error('Stripe is nog niet geconfigureerd.');
        error.statusCode = 503;
        throw error;
    }

    return stripe.checkout.sessions.retrieve(sessionId);
}

module.exports = {
    isStripeConfigured,
    createStripeCheckoutSession,
    retrieveStripeCheckoutSession
};