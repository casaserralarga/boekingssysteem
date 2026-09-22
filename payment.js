(function () {
    const i18n = window.CSLI18N;
    const BOOKING_DRAFT_KEY = 'csl-booking-draft';
    const CURRENT_HOLD_TOKEN_KEY = 'csl-current-hold-token';
    const holdToken = readHoldToken();

    const elements = {
        paymentSummary: document.getElementById('paymentSummary'),
        paymentRooms: document.getElementById('paymentRooms'),
        paymentStay: document.getElementById('paymentStay'),
        paymentGuest: document.getElementById('paymentGuest'),
        paymentSubtotal: document.getElementById('paymentSubtotal'),
        paymentVat: document.getElementById('paymentVat'),
        paymentTotal: document.getElementById('paymentTotal'),
        holdCountdown: document.getElementById('holdCountdown'),
        payNowButton: document.getElementById('payNowButton'),
        bookWithoutPayment: document.getElementById('bookWithoutPayment'),
        paymentActions: document.querySelector('.payment-actions'),
        expiredActions: document.getElementById('expiredActions'),
        paymentStatus: document.getElementById('paymentStatus')
    };

    let hold = null;
    let checkoutUrl = null;
    let countdownTimer = null;
    let isExpired = false;

    document.addEventListener('DOMContentLoaded', () => {
        elements.payNowButton.addEventListener('click', () => void startCheckout());
        elements.bookWithoutPayment.addEventListener('click', () => void confirmWithoutPayment());
        window.addEventListener('csl:languagechange', () => {
            if (isExpired) {
                showExpiredReservation();
                return;
            }

            render();
        });
        void loadHold();
    });

    async function loadHold() {
        if (!holdToken) {
            showExpiredReservation();
            return;
        }

        try {
            const cached = window.sessionStorage.getItem(`csl-hold:${holdToken}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                hold = parsed.hold;
                checkoutUrl = parsed.checkoutUrl || null;
                saveDraftFromHold(hold, parsed.draft);
            }

            const response = await fetch('/api/public/hold-details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ holdToken })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || i18n.t('payment.holdExpired'));
            }

            hold = data.hold;
            saveDraftFromHold(hold);
            render();
            startCountdown();
        } catch (error) {
            if (hold) {
                saveDraftFromHold(hold);
                render();
            }
            showExpiredReservation();
        }
    }

    async function startCheckout() {
        if (!holdToken) {
            return;
        }

        try {
            elements.payNowButton.disabled = true;
            elements.payNowButton.textContent = i18n.t('payment.redirecting');
            showStatus(i18n.t('payment.redirecting'));

            if (!checkoutUrl) {
                const response = await fetch('/api/public/checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ holdToken })
                });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || i18n.t('payment.noStripe'));
                }

                checkoutUrl = data.checkoutUrl;
            }

            window.location.href = checkoutUrl;
        } catch (error) {
            showStatus(error.message || i18n.t('payment.noStripe'), true);
            elements.payNowButton.disabled = false;
            elements.payNowButton.textContent = i18n.t('payment.payNow');
        }
    }

    async function confirmWithoutPayment() {
        if (!holdToken) {
            return;
        }

        try {
            elements.bookWithoutPayment.disabled = true;
            const response = await fetch('/api/public/confirm-hold', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ holdToken })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Fout bij boeken');
            }

            window.sessionStorage.setItem('csl-confirmed-booking', JSON.stringify(data.booking));
            clearBookingDraft();
            window.location.href = '/payment-success';
        } catch (error) {
            elements.bookWithoutPayment.disabled = false;
            showStatus(error.message || i18n.t('payment.holdExpired'), true);
        }
    }

    function render() {
        if (!hold) {
            return;
        }

        elements.paymentSummary.classList.remove('hidden');
        elements.paymentRooms.textContent = hold.selectedRooms.map((room) => room.name).join(', ');
        elements.paymentStay.textContent = `${formatFriendlyDate(hold.checkin)} - ${formatFriendlyDate(hold.checkout)}`;
        elements.paymentGuest.textContent = `${hold.guestName} · ${hold.guestEmail}`;
        elements.paymentSubtotal.textContent = i18n.formatCurrency(getSubtotalPriceCents(hold));
        elements.paymentVat.textContent = i18n.formatCurrency(getVatPriceCents(hold));
        elements.paymentTotal.textContent = i18n.formatCurrency(hold.totalPriceCents);
        elements.payNowButton.textContent = i18n.t('payment.payNow');
        if (isExpired) {
            showExpiredReservation();
        }
    }

    function getSubtotalPriceCents(booking) {
        return booking.subtotalPriceCents ?? (Number(booking.stayPriceCents || 0) + Number(booking.extrasPriceCents || 0));
    }

    function getVatPriceCents(booking) {
        return booking.vatPriceCents ?? Math.max(Number(booking.totalPriceCents || 0) - getSubtotalPriceCents(booking), 0);
    }

    function startCountdown() {
        clearInterval(countdownTimer);

        const tick = () => {
            const remainingMs = new Date(hold.expiresAt).getTime() - Date.now();
            if (remainingMs <= 0) {
                clearInterval(countdownTimer);
                saveDraftFromHold(hold);
                showExpiredReservation();
                return;
            }

            const minutes = Math.floor(remainingMs / 60000);
            const seconds = Math.floor((remainingMs % 60000) / 1000);
            elements.holdCountdown.classList.remove('hidden');
            elements.holdCountdown.textContent = i18n.t('payment.countdownLabel', {
                time: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
            });
        };

        tick();
        countdownTimer = setInterval(tick, 1000);
    }

    function showExpiredReservation() {
        isExpired = true;
        elements.holdCountdown.classList.add('hidden');
        elements.paymentActions.classList.add('hidden');
        elements.expiredActions.classList.remove('hidden');
        elements.payNowButton.disabled = true;
        elements.bookWithoutPayment.disabled = true;
        showStatus(i18n.t('payment.holdExpired'), true);
    }

    function showStatus(message, isError = false) {
        elements.paymentStatus.textContent = message;
        elements.paymentStatus.classList.remove('hidden', 'is-error');
        elements.paymentStatus.classList.toggle('is-error', isError);
    }

    function saveDraftFromHold(holdData, fallbackDraft = null) {
        if (!holdData && !fallbackDraft) {
            return;
        }

        const draft = fallbackDraft || {
            name: holdData.guestName || '',
            email: holdData.guestEmail || '',
            phone: holdData.guestPhone || '',
            nifNumber: holdData.nifNumber || '',
            note: holdData.note || '',
            street: holdData.street || '',
            houseNumber: holdData.houseNumber || '',
            postalCode: holdData.postalCode || '',
            city: holdData.city || '',
            country: holdData.country || '',
            checkin: holdData.checkin || '',
            checkout: holdData.checkout || '',
            selectedRoomIds: holdData.selectedRoomIds || (holdData.selectedRooms || []).map((room) => room.id),
            adultCount: holdData.adultCount || 2,
            childCount: holdData.childCount || 0,
            babyCount: holdData.babyCount || 0,
            babyBed: holdData.babyBed || 0,
            extraBed: holdData.extraBed || 0,
            bunkBed: holdData.bunkBed || 0
        };

        try {
            window.sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify({
                ...draft,
                savedAt: new Date().toISOString()
            }));
        } catch {
            // Session storage can be unavailable in private browsing modes.
        }
    }

    function clearBookingDraft() {
        try {
            window.sessionStorage.removeItem(BOOKING_DRAFT_KEY);
            if (holdToken) {
                window.sessionStorage.removeItem(`csl-hold:${holdToken}`);
            }
            window.sessionStorage.removeItem(CURRENT_HOLD_TOKEN_KEY);
        } catch {
            // Ignore storage cleanup failures.
        }
    }

    function readHoldToken() {
        const urlToken = new URLSearchParams(window.location.hash.slice(1)).get('hold')
            || new URLSearchParams(window.location.search).get('hold');
        if (urlToken) {
            window.sessionStorage.setItem(CURRENT_HOLD_TOKEN_KEY, urlToken);
            window.history.replaceState(null, '', window.location.pathname);
            return urlToken;
        }

        return window.sessionStorage.getItem(CURRENT_HOLD_TOKEN_KEY);
    }

    function formatFriendlyDate(value) {
        return new Intl.DateTimeFormat(i18n.getLocale(), {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(new Date(`${value}T00:00:00Z`));
    }
})();