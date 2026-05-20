(function () {
    const i18n = window.CSLI18N;
    const sessionId = new URLSearchParams(window.location.search).get('session_id');

    const elements = {
        successSummary: document.getElementById('successSummary'),
        successReference: document.getElementById('successReference'),
        successTotal: document.getElementById('successTotal'),
        successRooms: document.getElementById('successRooms'),
        successStatus: document.getElementById('successStatus')
    };

    document.addEventListener('DOMContentLoaded', () => {
        void confirmPayment();
    });

    async function confirmPayment() {
        if (!sessionId) {
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

            const booking = data.booking;
            elements.successSummary.classList.remove('hidden');
            elements.successReference.textContent = booking.referenceCode;
            elements.successTotal.textContent = i18n.formatCurrency(booking.totalPriceCents);
            elements.successRooms.textContent = booking.selectedRooms.map((room) => room.name).join(', ');
            showStatus(i18n.t('paymentSuccess.statusPaid'));
        } catch (error) {
            showStatus(error.message || i18n.t('paymentSuccess.error'), true);
        }
    }

    function showStatus(message, isError = false) {
        elements.successStatus.textContent = message;
        elements.successStatus.classList.remove('hidden', 'is-error');
        elements.successStatus.classList.toggle('is-error', isError);
    }
})();