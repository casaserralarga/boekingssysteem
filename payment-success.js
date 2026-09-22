(function () {
    const i18n = window.CSLI18N;
    const sessionId = readSessionId();

    const elements = {
        successEyebrow: document.querySelector('[data-i18n="paymentSuccess.eyebrow"]'),
        successText: document.querySelector('[data-i18n="paymentSuccess.text"]'),
        successTotalLabel: document.querySelector('[data-i18n="paymentSuccess.totalLabel"]'),
        successSummary: document.getElementById('successSummary'),
        successReference: document.getElementById('successReference'),
        successSubtotal: document.getElementById('successSubtotal'),
        successVat: document.getElementById('successVat'),
        successTotal: document.getElementById('successTotal'),
        successRooms: document.getElementById('successRooms'),
        successStatus: document.getElementById('successStatus')
    };

    document.addEventListener('DOMContentLoaded', () => {
        void confirmPayment();
    });

    async function confirmPayment() {
        if (!sessionId) {
            const cachedBooking = window.sessionStorage.getItem('csl-confirmed-booking');
            if (cachedBooking) {
                elements.successEyebrow.textContent = i18n.t('paymentSuccess.reservationEyebrow');
                elements.successText.textContent = i18n.t('paymentSuccess.reservationText');
                elements.successTotalLabel.textContent = i18n.t('paymentSuccess.totalReservedLabel');
                renderBooking(JSON.parse(cachedBooking));
                showStatus(i18n.t('paymentSuccess.statusReserved'));
                return;
            }

            showStatus(i18n.t('paymentSuccess.error'), true);
            return;
        }

        try {
            showStatus(i18n.t('paymentSuccess.loading'));

            const response = await fetch('/api/public/complete-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || i18n.t('paymentSuccess.error'));
            }

            window.sessionStorage.removeItem('csl-booking-draft');
            window.sessionStorage.removeItem('csl-current-hold-token');
            renderBooking(data.booking);
            showStatus(i18n.t('paymentSuccess.statusPaid'));
        } catch (error) {
            showStatus(error.message || i18n.t('paymentSuccess.error'), true);
        }
    }

    function renderBooking(booking) {
        const subtotalPriceCents = booking.subtotalPriceCents ?? (Number(booking.stayPriceCents || 0) + Number(booking.extrasPriceCents || 0));
        const vatPriceCents = booking.vatPriceCents ?? Math.max(Number(booking.totalPriceCents || 0) - subtotalPriceCents, 0);

        elements.successSummary.classList.remove('hidden');
        elements.successReference.textContent = booking.referenceCode;
        elements.successSubtotal.textContent = i18n.formatCurrency(subtotalPriceCents);
        elements.successVat.textContent = i18n.formatCurrency(vatPriceCents);
        elements.successTotal.textContent = i18n.formatCurrency(booking.totalPriceCents);
        elements.successRooms.textContent = booking.selectedRooms.map((room) => room.name).join(', ');
    }

    function showStatus(message, isError = false) {
        elements.successStatus.textContent = message;
        elements.successStatus.classList.remove('hidden', 'is-error');
        elements.successStatus.classList.toggle('is-error', isError);
    }

    function readSessionId() {
        const value = new URLSearchParams(window.location.hash.slice(1)).get('session_id');
        if (value) {
            window.history.replaceState(null, '', window.location.pathname);
        }
        return value;
    }
})();