(function () {
    const i18n = window.CSLI18N;
    const holdToken = new URLSearchParams(window.location.search).get('hold');

    const elements = {
        paymentSummary: document.getElementById('paymentSummary'),
        paymentRooms: document.getElementById('paymentRooms'),
        paymentStay: document.getElementById('paymentStay'),
        paymentGuest: document.getElementById('paymentGuest'),
        paymentTotal: document.getElementById('paymentTotal'),
        holdCountdown: document.getElementById('holdCountdown'),
        payNowButton: document.getElementById('payNowButton'),
        paymentStatus: document.getElementById('paymentStatus')
    };

    let hold = null;
    let checkoutUrl = null;
    let countdownTimer = null;

    document.addEventListener('DOMContentLoaded', () => {
        elements.payNowButton.addEventListener('click', () => void startCheckout());
const bookBtn = document.getElementById('bookWithoutPayment');

if (bookBtn) {
    bookBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(`/api/public/holds/${encodeURIComponent(holdToken)}/confirm`, {
                method: 'POST'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Fout bij boeken');
            }

            // 👇 doorgaan naar success pagina
            window.location.href = '/payment-success';
        } catch (error) {
            alert(error.message);
        }
    });
}
        window.addEventListener('csl:languagechange', render);
        void loadHold();
    });

    async function loadHold() {
        if (!holdToken) {
            showStatus(i18n.t('payment.holdExpired'), true);
            return;
        }

        try {
            const cached = window.sessionStorage.getItem(`csl-hold:${holdToken}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                hold = parsed.hold;
                checkoutUrl = parsed.checkoutUrl || null;
            }

            const response = await fetch(`/api/public/holds/${encodeURIComponent(holdToken)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || i18n.t('payment.holdExpired'));
            }

            hold = data.hold;
            render();
            startCountdown();
        } catch (error) {
            showStatus(error.message || i18n.t('payment.holdExpired'), true);
            elements.payNowButton.disabled = true;
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
                const response = await fetch(`/api/public/holds/${encodeURIComponent(holdToken)}/checkout-session`, {
                    method: 'POST'
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

    function render() {
        if (!hold) {
            return;
        }

        elements.paymentSummary.classList.remove('hidden');
        elements.paymentRooms.textContent = hold.selectedRooms.map((room) => room.name).join(', ');
        elements.paymentStay.textContent = `${formatFriendlyDate(hold.checkin)} - ${formatFriendlyDate(hold.checkout)}`;
        elements.paymentGuest.textContent = `${hold.guestName} · ${hold.guestEmail}`;
        elements.paymentTotal.textContent = i18n.formatCurrency(hold.totalPriceCents);
        elements.payNowButton.textContent = i18n.t('payment.payNow');
    }

    function startCountdown() {
        clearInterval(countdownTimer);

        const tick = () => {
            const remainingMs = new Date(hold.expiresAt).getTime() - Date.now();
            if (remainingMs <= 0) {
                clearInterval(countdownTimer);
                elements.holdCountdown.classList.remove('hidden');
                elements.holdCountdown.textContent = i18n.t('payment.holdExpired');
                elements.payNowButton.disabled = true;
                showStatus(i18n.t('payment.holdExpired'), true);
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

    function showStatus(message, isError = false) {
        elements.paymentStatus.textContent = message;
        elements.paymentStatus.classList.remove('hidden', 'is-error');
        elements.paymentStatus.classList.toggle('is-error', isError);
    }

    function formatFriendlyDate(value) {
        return new Intl.DateTimeFormat(i18n.getLocale(), {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(new Date(`${value}T00:00:00Z`));
    }
})();