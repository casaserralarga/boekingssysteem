(function () {
    const state = {
        user: null,
        pricing: null,
        paymentSettings: {
            stripeConfigured: false,
            stripeSecretKeyMasked: ''
        },
        rooms: [],
        bookings: [],
        pricingRules: [],
        activeHolds: [],
        activeView: 'dashboard',
        editingBookingId: null,
        editingPricingRuleId: null,
        editingBlockId: null,
        plannerMonth: monthKey(new Date()),
        bookingFilters: defaultBookingFilters()
    };

    const elements = {
        loginCard: document.getElementById('loginCard'),
        adminApp: document.getElementById('adminApp'),
        loginForm: document.getElementById('loginForm'),
        loginIdentifier: document.getElementById('loginIdentifier'),
        loginPassword: document.getElementById('loginPassword'),
        loginError: document.getElementById('loginError'),
        loginIdentifierError: document.getElementById('loginIdentifierError'),
        loginPasswordError: document.getElementById('loginPasswordError'),
        adminIdentity: document.getElementById('adminIdentity'),
        adminStatus: document.getElementById('adminStatus'),
        adminNav: document.querySelector('.admin-nav'),
        dashboardBookingsBtn: document.getElementById('dashboardBookingsBtn'),
        logoutBtn: document.getElementById('logoutBtn'),
        dashboardStats: document.getElementById('dashboardStats'),
        dashboardPending: document.getElementById('dashboardPending'),
        dashboardUpcoming: document.getElementById('dashboardUpcoming'),
        dashboardHolds: document.getElementById('dashboardHolds'),
        bookingSearch: document.getElementById('bookingSearch'),
        bookingStatusFilter: document.getElementById('bookingStatusFilter'),
        bookingPaymentFilter: document.getElementById('bookingPaymentFilter'),
        bookingFrom: document.getElementById('bookingFrom'),
        bookingTo: document.getElementById('bookingTo'),
        bookingSort: document.getElementById('bookingSort'),
        bookingResetFilters: document.getElementById('bookingResetFilters'),
        bookingTimeline: document.getElementById('bookingTimeline'),
        roomCreateForm: document.getElementById('roomCreateForm'),
        newRoomName: document.getElementById('newRoomName'),
        newRoomBasePrice: document.getElementById('newRoomBasePrice'),
        roomList: document.getElementById('roomList'),
        roomPriceOverview: document.getElementById('roomPriceOverview'),
        pricingRuleForm: document.getElementById('pricingRuleForm'),
        ruleRoom: document.getElementById('ruleRoom'),
        ruleNightly: document.getElementById('ruleNightly'),
        ruleStart: document.getElementById('ruleStart'),
        ruleEnd: document.getElementById('ruleEnd'),
        ruleLabel: document.getElementById('ruleLabel'),
        saveRuleBtn: document.getElementById('saveRuleBtn'),
        cancelRuleEditBtn: document.getElementById('cancelRuleEditBtn'),
        pricingRulesList: document.getElementById('pricingRulesList'),
        blockForm: document.getElementById('blockForm'),
        blockFormTitle: document.getElementById('blockFormTitle'),
        blockStart: document.getElementById('blockStart'),
        blockEnd: document.getElementById('blockEnd'),
        blockRoomSelector: document.getElementById('blockRoomSelector'),
        blockReason: document.getElementById('blockReason'),
        blockBtn: document.getElementById('blockBtn'),
        cancelBlockEditBtn: document.getElementById('cancelBlockEditBtn'),
        blockList: document.getElementById('blockList'),
        prevYear: document.getElementById('prevYear'),
        prevMonth: document.getElementById('prevMonth'),
        plannerMonthPicker: document.getElementById('plannerMonthPicker'),
        plannerToday: document.getElementById('plannerToday'),
        nextMonth: document.getElementById('nextMonth'),
        nextYear: document.getElementById('nextYear'),
        plannerMonth: document.getElementById('plannerMonth'),
        planner: document.getElementById('planner'),
        passwordForm: document.getElementById('passwordForm'),
        currentPassword: document.getElementById('currentPassword'),
        newPassword: document.getElementById('newPassword'),
        confirmPassword: document.getElementById('confirmPassword'),
        paymentSettingsStatus: document.getElementById('paymentSettingsStatus'),
        paymentSettingsForm: document.getElementById('paymentSettingsForm'),
        stripeSecretKey: document.getElementById('stripeSecretKey'),
        popup: document.getElementById('popup'),
        bookingModalTitle: document.getElementById('bookingModalTitle'),
        bookingMetaSummary: document.getElementById('bookingMetaSummary'),
        editName: document.getElementById('editName'),
        editEmail: document.getElementById('editEmail'),
        editNifNumber: document.getElementById('editNifNumber'),
        editStreet: document.getElementById('editStreet'),
        editHouseNumber: document.getElementById('editHouseNumber'),
        editPostalCode: document.getElementById('editPostalCode'),
        editCity: document.getElementById('editCity'),
        editCountry: document.getElementById('editCountry'),
        editNote: document.getElementById('editNote'),
        editCheckin: document.getElementById('editCheckin'),
        editCheckout: document.getElementById('editCheckout'),
        editRoomSelector: document.getElementById('editRoomSelector'),
        editAdultCount: document.getElementById('editAdultCount'),
        editChildCount: document.getElementById('editChildCount'),
        editBabyCount: document.getElementById('editBabyCount'),
        editBabyBed: document.getElementById('editBabyBed'),
        editExtraBed: document.getElementById('editExtraBed'),
        editStatus: document.getElementById('editStatus'),
        editStayPrice: document.getElementById('editStayPrice'),
        editExtras: document.getElementById('editExtras'),
        editMail: document.getElementById('editMail'),
        editDeposit: document.getElementById('editDeposit'),
        editPaid: document.getElementById('editPaid'),
        editCheckinStatus: document.getElementById('editCheckinStatus'),
        editCheckoutStatus: document.getElementById('editCheckoutStatus'),
        priceSummary: document.getElementById('priceSummary'),
        saveBtn: document.getElementById('saveBtn'),
        deleteBtn: document.getElementById('deleteBtn'),
        closeBtn: document.getElementById('closeBtn')
    };

    let selectedRoomInputs = [];

    document.addEventListener('DOMContentLoaded', () => {
        wireGlobalErrorHandlers();
        wireEvents();
        void checkSession();
    });

    function wireGlobalErrorHandlers() {
        window.addEventListener('error', (event) => {
            reportFatalError(event.error || event.message || 'Onbekende fout in de beheerpagina.');
        });

        window.addEventListener('unhandledrejection', (event) => {
            reportFatalError(event.reason || 'Onbekende asynchrone fout in de beheerpagina.');
        });
    }

    function wireEvents() {
        elements.loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            void login();
        });

        elements.logoutBtn.addEventListener('click', () => void logout());
        elements.dashboardBookingsBtn.addEventListener('click', () => {
            resetBookingFilters();
            setActiveView('bookings');
            renderBookings();
        });

        elements.adminNav.addEventListener('click', (event) => {
            const button = event.target.closest('[data-view]');
            if (!button) {
                return;
            }

            setActiveView(button.dataset.view);
        });

        elements.dashboardStats.addEventListener('click', (event) => {
            const button = event.target.closest('[data-dashboard-action]');
            if (!button) {
                return;
            }

            handleDashboardAction(button.dataset.dashboardAction);
        });

        [elements.dashboardPending, elements.dashboardUpcoming, elements.bookingTimeline].forEach((container) => {
            container.addEventListener('click', (event) => {
                const bookingButton = event.target.closest('[data-booking-id]');
                if (!bookingButton) {
                    return;
                }

                openBookingPopup(Number(bookingButton.dataset.bookingId));
            });
        });

        elements.dashboardHolds.addEventListener('click', (event) => {
            const jumpButton = event.target.closest('[data-view-jump]');
            if (!jumpButton) {
                return;
            }

            setActiveView(jumpButton.dataset.viewJump);
        });

        document.querySelectorAll('[data-dashboard-action]').forEach((button) => {
            button.addEventListener('click', () => handleDashboardAction(button.dataset.dashboardAction));
        });

        document.querySelectorAll('[data-view-jump]').forEach((button) => {
            button.addEventListener('click', () => setActiveView(button.dataset.viewJump));
        });

        [
            elements.bookingSearch,
            elements.bookingStatusFilter,
            elements.bookingPaymentFilter,
            elements.bookingFrom,
            elements.bookingTo,
            elements.bookingSort
        ].forEach((input) => {
            input.addEventListener('input', syncBookingFiltersFromInputs);
            input.addEventListener('change', syncBookingFiltersFromInputs);
        });

        elements.bookingResetFilters.addEventListener('click', () => {
            resetBookingFilters();
            syncBookingFilterInputs();
            renderBookings();
        });

        elements.roomCreateForm.addEventListener('submit', (event) => {
            event.preventDefault();
            void createRoom();
        });

        elements.roomList.addEventListener('submit', (event) => {
            const form = event.target.closest('form[data-room-id]');
            if (!form) {
                return;
            }

            event.preventDefault();
            void saveRoom(Number(form.dataset.roomId));
        });

        elements.pricingRuleForm.addEventListener('submit', (event) => {
            event.preventDefault();
            void savePricingRule();
        });

        elements.cancelRuleEditBtn.addEventListener('click', () => resetPricingRuleForm());

        elements.pricingRulesList.addEventListener('click', (event) => {
            const actionButton = event.target.closest('[data-pricing-rule-action]');
            if (!actionButton) {
                return;
            }

            const ruleId = Number(actionButton.dataset.ruleId);
            if (actionButton.dataset.pricingRuleAction === 'edit') {
                beginPricingRuleEdit(ruleId);
                return;
            }

            void deletePricingRule(ruleId);
        });

        elements.blockForm.addEventListener('submit', (event) => {
            event.preventDefault();
            void saveBlock();
        });

        elements.cancelBlockEditBtn.addEventListener('click', () => resetBlockForm());

        elements.blockList.addEventListener('click', (event) => {
            const button = event.target.closest('[data-block-id]');
            if (!button) {
                return;
            }

            const blockId = Number(button.dataset.blockId);
            if (button.dataset.blockAction === 'edit') {
                beginBlockEdit(blockId);
                return;
            }

            void deleteBlock(blockId);
        });

        elements.prevYear.addEventListener('click', () => {
            state.plannerMonth = shiftMonth(state.plannerMonth, -12);
            void loadPlanner();
        });

        elements.prevMonth.addEventListener('click', () => {
            state.plannerMonth = shiftMonth(state.plannerMonth, -1);
            void loadPlanner();
        });

        elements.plannerMonthPicker.addEventListener('change', () => {
            if (!elements.plannerMonthPicker.value) {
                return;
            }

            state.plannerMonth = elements.plannerMonthPicker.value;
            void loadPlanner();
        });

        elements.plannerToday.addEventListener('click', () => {
            state.plannerMonth = monthKey(new Date());
            void loadPlanner();
        });

        elements.nextMonth.addEventListener('click', () => {
            state.plannerMonth = shiftMonth(state.plannerMonth, 1);
            void loadPlanner();
        });

        elements.nextYear.addEventListener('click', () => {
            state.plannerMonth = shiftMonth(state.plannerMonth, 12);
            void loadPlanner();
        });

        elements.passwordForm.addEventListener('submit', (event) => {
            event.preventDefault();
            void changePassword();
        });

        elements.paymentSettingsForm.addEventListener('submit', (event) => {
            event.preventDefault();
            void savePaymentSettings();
        });

        [elements.editStayPrice, elements.editExtras].forEach((input) => {
            input.addEventListener('input', updateBookingSummary);
        });

        elements.closeBtn.addEventListener('click', closeBookingPopup);
        elements.saveBtn.addEventListener('click', () => void saveBooking());
        elements.deleteBtn.addEventListener('click', () => void deleteBooking());
        elements.popup.addEventListener('click', (event) => {
            if (event.target === elements.popup) {
                closeBookingPopup();
            }
        });
    }

    async function checkSession() {
        try {
            const response = await fetch('/api/admin/session');
            if (!response.ok) {
                showLogin();
                return;
            }

            await loadBootstrap();
        } catch (error) {
            showLogin();
            showLoginMessage('De beheerpagina kon niet volledig laden. Herlaad de pagina.');
        }
    }

    async function login() {
        clearLoginErrors();
        const identifier = elements.loginIdentifier.value.trim();
        const password = elements.loginPassword.value;
        let valid = true;

        if (!identifier) {
            elements.loginIdentifierError.textContent = 'Vul een gebruikersnaam in.';
            elements.loginIdentifierError.classList.remove('hidden');
            valid = false;
        }

        if (!password) {
            elements.loginPasswordError.textContent = 'Vul een wachtwoord in.';
            elements.loginPasswordError.classList.remove('hidden');
            valid = false;
        }

        if (!valid) {
            return;
        }

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Inloggen is mislukt.');
            }

            await loadBootstrap();
            elements.loginPassword.value = '';
        } catch (error) {
            elements.loginError.textContent = error.message;
            elements.loginError.classList.remove('hidden');
            elements.loginError.classList.add('is-error');
        }
    }

    async function logout() {
        try {
            await fetch('/api/admin/logout', { method: 'POST' });
        } finally {
            showLogin();
        }
    }

    async function loadBootstrap() {
        const response = await fetch('/api/admin/bootstrap');
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Admingegevens konden niet worden geladen.');
        }

        state.user = data.user;
        state.pricing = data.pricing;
        state.paymentSettings = data.paymentSettings || {
            stripeConfigured: false,
            stripeSecretKeyMasked: ''
        };
        state.rooms = data.rooms;
        state.bookings = data.bookings;
        state.blocks = data.blocks;
        state.pricingRules = data.pricingRules;
        state.activeHolds = data.activeHolds;

        try {
            showAdmin();
            renderAll();
            await loadPlanner();
        } catch (error) {
            reportFatalError(error);
            throw error;
        }
    }

    function renderAll() {
        syncBookingFilterInputs();
        renderPricingOverview();
        syncRuleRoomOptions();
        renderDashboard();
        renderBookings();
        renderRooms();
        renderPricingRules();
        renderBlockRoomSelector();
        renderBlocks();
        renderPaymentSettings();
        setActiveView(state.activeView);
    }

    function renderPaymentSettings() {
        const { stripeConfigured, stripeSecretKeyMasked } = state.paymentSettings;
        elements.paymentSettingsStatus.innerHTML = `
            <div class="booking-actions">
                <div>
                    <h3>Stripe status</h3>
                    <p>${stripeConfigured ? 'Stripe is geconfigureerd voor checkout.' : 'Stripe is nog niet ingesteld.'}</p>
                </div>
                <span class="admin-badge ${stripeConfigured ? 'badge-success' : 'badge-warning'}">${stripeConfigured ? 'Actief' : 'Ontbreekt'}</span>
            </div>
            <div class="booking-meta">
                <div><strong>Opgeslagen sleutel</strong><br>${escapeHtml(stripeSecretKeyMasked || 'Nog geen sleutel opgeslagen')}</div>
                <div><strong>Gebruik</strong><br>Checkout en betaalafronding</div>
            </div>
        `;

        elements.stripeSecretKey.value = '';
    }

    function renderDashboard() {
        const today = todayIso();
        const upcoming = state.bookings.filter((booking) => booking.checkin >= today && booking.status !== 'cancelled');
        const pending = state.bookings.filter((booking) => booking.status === 'pending');
        const unpaid = state.bookings.filter((booking) => booking.status !== 'cancelled' && !booking.paid);
        const revenueCents = state.bookings
            .filter((booking) => booking.status !== 'cancelled')
            .reduce((sum, booking) => sum + Number(booking.totalPriceCents || 0), 0);

        const statCards = [
            { label: 'Boekingen', value: String(state.bookings.length), note: 'Alle reserveringen', action: 'show-all-bookings' },
            { label: 'Nieuwe aanvragen', value: String(pending.length), note: 'Nog niet bevestigd', action: 'show-pending' },
            { label: 'Komende check-ins', value: String(upcoming.length), note: 'Vanaf vandaag', action: 'show-upcoming' },
            { label: 'Open betalingen', value: String(unpaid.length), note: 'Nog niet volledig betaald', action: 'show-unpaid' },
            { label: 'Actieve holds', value: String(state.activeHolds.length), note: 'Tijdelijk vastgelegd', action: 'show-planning' },
            { label: 'Omzet', value: formatMoney(revenueCents), note: 'Totaal geboekt bedrag incl. btw', action: 'show-all-bookings' }
        ];

        elements.dashboardStats.innerHTML = statCards.map((card) => `
            <button type="button" class="dashboard-stat-card" data-dashboard-action="${card.action}">
                <span class="dashboard-stat-label">${escapeHtml(card.label)}</span>
                <strong class="dashboard-stat-value">${escapeHtml(card.value)}</strong>
                <span class="dashboard-stat-note">${escapeHtml(card.note)}</span>
            </button>
        `).join('');

        renderCompactBookingList(elements.dashboardPending, pending.slice(0, 8), 'Geen nieuwe aanvragen.');
        renderCompactBookingList(
            elements.dashboardUpcoming,
            upcoming.slice().sort((left, right) => left.checkin.localeCompare(right.checkin)).slice(0, 8),
            'Geen komende check-ins.'
        );

        if (!state.activeHolds.length) {
            elements.dashboardHolds.innerHTML = '<div class="dashboard-empty">Geen actieve holds.</div>';
            return;
        }

        elements.dashboardHolds.innerHTML = state.activeHolds
            .slice()
            .sort((left, right) => left.expiresAt.localeCompare(right.expiresAt))
            .map((hold) => `
                <article class="dashboard-hold-card">
                    <div class="dashboard-hold-head">
                        <div class="dashboard-hold-main">
                            <h3>${escapeHtml(hold.guestName)}</h3>
                            <p>${escapeHtml(hold.guestEmail)}</p>
                        </div>
                        <span class="admin-badge badge-warning hold-time-pill">${escapeHtml(formatTimeUntil(hold.expiresAt))}</span>
                    </div>
                    <div class="dashboard-hold-meta-grid">
                        <div><strong>Kamers</strong>${escapeHtml(joinRoomNames(hold.selectedRooms))}</div>
                        <div><strong>Gasten</strong>${escapeHtml(guestCountLabel(hold))}</div>
                        <div><strong>Periode</strong>${escapeHtml(formatDateRange(hold.checkin, hold.checkout))}</div>
                        <div><strong>Verloopt</strong>${escapeHtml(formatDateTime(hold.expiresAt))}</div>
                        ${hold.nifNumber ? `<div><strong>NIF</strong>${escapeHtml(hold.nifNumber)}</div>` : ''}
                        <div><strong>Totaal</strong>${escapeHtml(formatMoney(hold.totalPriceCents))}</div>
                    </div>
                    <button type="button" class="secondary-button" data-view-jump="planning">Open planning</button>
                </article>
            `).join('');
    }

    function renderCompactBookingList(container, bookings, emptyText) {
        if (!bookings.length) {
            container.innerHTML = `<div class="dashboard-empty">${escapeHtml(emptyText)}</div>`;
            return;
        }

        container.innerHTML = bookings.map((booking) => `
            <article class="dashboard-list-item">
                <div class="dashboard-list-main">
                    <div class="dashboard-list-title-row">
                        <h3>${escapeHtml(booking.name)}</h3>
                        <span class="admin-badge ${statusBadgeClass(booking.status)}">${escapeHtml(statusLabel(booking.status))}</span>
                    </div>
                    <p class="dashboard-list-subline">${escapeHtml(joinRoomNames(booking.selectedRooms))}</p>
                    <div class="dashboard-list-meta">
                        <span>${escapeHtml(formatDateRange(booking.checkin, booking.checkout))}</span>
                        <span class="admin-badge ${paymentBadgeClass(booking)}">${escapeHtml(paymentLabel(booking))}</span>
                        <span>${escapeHtml(guestCountLabel(booking))}</span>
                        <span>${escapeHtml(formatMoney(booking.totalPriceCents))}</span>
                    </div>
                </div>
                <button type="button" class="dashboard-list-action" data-booking-id="${booking.id}">Open</button>
            </article>
        `).join('');
    }

    function renderBookings() {
        const bookings = getFilteredBookings();
        if (!bookings.length) {
            elements.bookingTimeline.innerHTML = '<div class="dashboard-card">Geen boekingen gevonden voor de huidige filters.</div>';
            return;
        }

        const grouped = new Map();
        bookings.forEach((booking) => {
            const key = booking.checkin.slice(0, 7);
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push(booking);
        });

        elements.bookingTimeline.innerHTML = `
            <div class="booking-results-head admin-panel-surface">
                <strong>${bookings.length} boekingen</strong>
                <span>Gesorteerd op ${escapeHtml(sortLabel(state.bookingFilters.sort))}</span>
            </div>
            ${Array.from(grouped.entries()).map(([month, monthBookings]) => renderBookingMonth(month, monthBookings)).join('')}
        `;
    }

    function renderBookingMonth(month, bookings) {
        const monthTitle = new Date(`${month}-01T00:00:00Z`).toLocaleDateString('nl-NL', {
            month: 'long',
            year: 'numeric'
        });

        return `
            <section class="admin-section booking-month-section">
                <div class="section-head compact-head">
                    <div>
                        <h3>${escapeHtml(capitalize(monthTitle))}</h3>
                        <p>${bookings.length} boeking${bookings.length === 1 ? '' : 'en'}</p>
                    </div>
                </div>
                <div class="booking-list-grid">
                    ${bookings.map((booking) => renderBookingCard(booking)).join('')}
                </div>
            </section>
        `;
    }

    function renderBookingCard(booking) {
        return `
            <article class="booking-card booking-card-wide">
                <div class="booking-actions">
                    <div>
                        <h3>${escapeHtml(booking.name)}</h3>
                        <p>${escapeHtml(booking.email)}</p>
                    </div>
                    <button type="button" data-booking-id="${booking.id}">Details</button>
                </div>
                <div class="booking-meta booking-meta-wide">
                    <div><strong>Referentie</strong><br>${escapeHtml(booking.referenceCode)}</div>
                    ${booking.nifNumber ? `<div><strong>NIF</strong><br>${escapeHtml(booking.nifNumber)}</div>` : ''}
                    <div><strong>Gasten</strong><br>${escapeHtml(guestCountLabel(booking))}</div>
                    <div><strong>Periode</strong><br>${escapeHtml(formatDateRange(booking.checkin, booking.checkout))}</div>
                    <div><strong>Kamers</strong><br>${escapeHtml(joinRoomNames(booking.selectedRooms))}</div>
                    <div><strong>Status</strong><br><span class="admin-badge ${statusBadgeClass(booking.status)}">${escapeHtml(statusLabel(booking.status))}</span></div>
                    <div><strong>Betaling</strong><br><span class="admin-badge ${paymentBadgeClass(booking)}">${escapeHtml(paymentLabel(booking))}</span></div>
                    <div><strong>Btw 6%</strong><br>${escapeHtml(formatMoney(booking.vatPriceCents))}</div>
                    <div><strong>Totaal incl. btw</strong><br>${escapeHtml(formatMoney(booking.totalPriceCents))}</div>
                    <div><strong>Aangemaakt</strong><br>${escapeHtml(formatDateTime(booking.createdAt))}</div>
                </div>
            </article>
        `;
    }

    function renderRooms() {
        if (!state.rooms.length) {
            elements.roomList.innerHTML = '<div class="dashboard-card">Er zijn nog geen kamers beschikbaar.</div>';
            return;
        }

        elements.roomList.innerHTML = state.rooms.map((room) => {
            const activity = roomActivity(room.id);
            const exceptionCount = state.pricingRules.filter((rule) => Number(rule.roomId) === Number(room.id)).length;
            return `
                <form class="room-admin-card" data-room-id="${room.id}">
                    <div class="room-admin-card-head">
                        <div>
                            <h3>${escapeHtml(room.name)}</h3>
                            <p>Kamer ${room.roomNumber} · ${escapeHtml(activity)} · ${exceptionCount} prijsuitzondering${exceptionCount === 1 ? '' : 'en'}</p>
                        </div>
                        <span class="admin-badge ${room.isActive ? 'badge-success' : 'badge-muted'}">${room.isActive ? 'Actief' : 'Inactief'}</span>
                    </div>
                    <div class="field-grid">
                        <label class="field">
                            <span>Naam</span>
                            <input name="name" type="text" value="${escapeHtml(room.name)}" required>
                        </label>
                        <label class="field">
                            <span>Vaste prijs per nacht excl. btw (€)</span>
                            <input name="basePrice" type="number" min="0" step="0.01" value="${room.basePriceCents == null ? '' : escapeHtml(String(room.basePriceCents / 100))}" required>
                        </label>
                        <label class="checkbox-field room-active-toggle">
                            <input name="isActive" type="checkbox" ${room.isActive ? 'checked' : ''}>
                            <span><strong>Boekbaar</strong><small>Schakel uit om deze kamer niet meer aan te bieden</small></span>
                        </label>
                    </div>
                    <div class="button-row-inline admin-align-end">
                        <button type="submit">Kamer opslaan</button>
                    </div>
                </form>
            `;
        }).join('');
    }

    function renderPricingOverview() {
        const activeRooms = getActiveRooms();
        if (!activeRooms.length) {
            elements.roomPriceOverview.innerHTML = '<div class="dashboard-card">Er zijn nog geen actieve kamers.</div>';
            return;
        }

        elements.roomPriceOverview.innerHTML = activeRooms.map((room) => {
            const exceptionCount = state.pricingRules.filter((rule) => Number(rule.roomId) === Number(room.id)).length;
            return `
                <article class="dashboard-card">
                    <div class="booking-actions">
                        <div>
                            <h3>${escapeHtml(room.name)}</h3>
                            <p>Kamer ${room.roomNumber}</p>
                        </div>
                        <span class="admin-badge ${room.basePriceCents == null ? 'badge-warning' : 'badge-success'}">${room.basePriceCents == null ? 'Controle nodig' : 'Vaste prijs ingesteld'}</span>
                    </div>
                    <div class="booking-meta">
                        <div><strong>Vaste prijs excl. btw</strong><br>${room.basePriceCents == null ? 'Niet ingevuld' : escapeHtml(formatMoney(room.basePriceCents))} per nacht</div>
                        <div><strong>Uitzonderingen</strong><br>${exceptionCount}</div>
                    </div>
                </article>
            `;
        }).join('');
    }

    function renderPricingRules() {
        syncRuleRoomOptions();
        if (!state.pricingRules.length) {
            elements.pricingRulesList.innerHTML = '<div class="dashboard-card">Nog geen prijsregels ingesteld.</div>';
            return;
        }

        elements.pricingRulesList.innerHTML = state.pricingRules
            .slice()
            .sort((left, right) => left.start.localeCompare(right.start) || left.roomId - right.roomId)
            .map((rule) => {
                const room = state.rooms.find((item) => item.id === rule.roomId);
                return `
                    <article class="pricing-rule-card">
                        <div class="booking-actions">
                            <div>
                                <h3>${escapeHtml(room ? room.name : `Kamer ${rule.roomId}`)}</h3>
                                <p>${escapeHtml(rule.label || 'Geen label')}</p>
                            </div>
                            <div class="button-row-inline">
                                <button type="button" class="secondary-button" data-pricing-rule-action="edit" data-rule-id="${rule.id}">Bewerken</button>
                                <button type="button" class="danger-button" data-pricing-rule-action="delete" data-rule-id="${rule.id}">Verwijderen</button>
                            </div>
                        </div>
                        <div class="booking-meta">
                            <div><strong>Periode</strong><br>${escapeHtml(`${rule.start} t/m ${rule.end}`)}</div>
                            <div><strong>Prijs excl. btw</strong><br>${escapeHtml(formatMoney(rule.nightlyPriceCents))} per nacht</div>
                        </div>
                    </article>
                `;
            }).join('');
    }

    function renderBlocks() {
        if (!state.blocks.length) {
            elements.blockList.innerHTML = '<div class="dashboard-card">Nog geen geblokkeerde periodes.</div>';
            return;
        }

        elements.blockList.innerHTML = state.blocks
            .slice()
            .sort((left, right) => left.start.localeCompare(right.start))
            .map((block) => `
                <article class="block-card">
                    <div>
                        <strong>${escapeHtml(`${block.start} t/m ${block.end}`)}</strong>
                        <p>${escapeHtml(roomNamesForIds(block.selectedRoomIds))}</p>
                        <p>${escapeHtml(block.reason || 'Geen reden ingevuld')}</p>
                    </div>
                    <div class="button-row-inline">
                        <button type="button" class="secondary-button" data-block-id="${block.id}" data-block-action="edit">Bewerken</button>
                        <button type="button" class="danger-button" data-block-id="${block.id}" data-block-action="delete">Verwijderen</button>
                    </div>
                </article>
            `).join('');
    }

    function renderBlockRoomSelector() {
        const editingBlock = state.editingBlockId ? state.blocks.find((item) => item.id === state.editingBlockId) : null;
        const availableRooms = state.rooms.filter((room) => room.isActive || editingBlock?.selectedRoomIds?.includes(room.id));
        if (!availableRooms.length) {
            elements.blockRoomSelector.innerHTML = '<div class="dashboard-card">Er zijn geen actieve kamers om te blokkeren.</div>';
            return;
        }

        elements.blockRoomSelector.innerHTML = availableRooms.map((room) => `
            <label class="checkbox-field">
                <input type="checkbox" value="${room.id}" data-block-room-id="${room.id}">
                <span>
                    <strong>${escapeHtml(room.name)}</strong>
                    <small>Kamer ${escapeHtml(String(room.roomNumber))}${room.isActive ? '' : ' · momenteel inactief'}</small>
                </span>
            </label>
        `).join('');

        if (state.editingBlockId) {
            const block = state.blocks.find((item) => item.id === state.editingBlockId);
            if (block) {
                setSelectedBlockRoomIds(block.selectedRoomIds);
            }
        }
    }

    async function loadPlanner() {
        const response = await fetch(`/api/public/calendar?month=${encodeURIComponent(state.plannerMonth)}`);
        const data = await response.json();

        if (!response.ok) {
            showAdminStatus(data.message || 'Planning kon niet worden geladen.', true);
            return;
        }

        elements.plannerMonthPicker.value = state.plannerMonth;
        elements.plannerMonth.textContent = capitalize(new Date(`${state.plannerMonth}-01T00:00:00Z`).toLocaleDateString('nl-NL', {
            month: 'long',
            year: 'numeric'
        }));
        renderPlanner(data);
    }

    function renderPlanner(data) {
        elements.planner.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'planner-grid';

        const header = document.createElement('div');
        header.className = 'planner-row';
        header.innerHTML = `<div class="planner-room">Kamer</div>${data.days.map((day) => `<div class="planner-cell planner-cell-head">${day.slice(-2)}</div>`).join('')}`;
        grid.appendChild(header);

        data.rooms.forEach((room) => {
            const row = document.createElement('div');
            row.className = 'planner-row';
            row.innerHTML = `<div class="planner-room">${escapeHtml(room.name)}</div>${room.days.map((day) => `<div class="planner-cell ${day.status === 'available' ? 'free' : day.status}" title="${escapeHtml(`${room.name} ${day.date} · ${day.detail || 'Vrij'} · ${formatMoney(day.priceInclVatCents || day.priceCents)} incl. btw`)}"></div>`).join('')}`;
            grid.appendChild(row);
        });

        elements.planner.appendChild(grid);
    }

    async function createRoom() {
        const payload = {
            name: elements.newRoomName.value.trim(),
            basePriceCents: elements.newRoomBasePrice.value.trim() ? eurosToCents(elements.newRoomBasePrice.value) : null
        };

        const response = await fetch('/api/admin/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (!response.ok) {
            showAdminStatus(data.message || 'Kamer kon niet worden toegevoegd.', true);
            return;
        }

        state.rooms = data.rooms;
        state.pricing.totalRooms = getActiveRooms().length;
        elements.roomCreateForm.reset();
        renderRooms();
        renderPricingOverview();
        renderBlockRoomSelector();
        syncRuleRoomOptions();
        showAdminStatus('Kamer toegevoegd.');
    }

    async function saveRoom(roomId) {
        const form = elements.roomList.querySelector(`form[data-room-id="${roomId}"]`);
        if (!form) {
            return;
        }

        const payload = {
            name: form.elements.name.value.trim(),
            basePriceCents: form.elements.basePrice.value.trim() ? eurosToCents(form.elements.basePrice.value) : null,
            isActive: form.elements.isActive.checked
        };

        const response = await fetch(`/api/admin/rooms/${roomId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (!response.ok) {
            showAdminStatus(data.message || 'Kamer kon niet worden opgeslagen.', true);
            return;
        }

        state.rooms = data.rooms;
        state.pricing = data.pricing;
        renderRooms();
        renderPricingOverview();
        renderBlockRoomSelector();
        syncRuleRoomOptions();
        renderBookings();
        renderBlocks();
        showAdminStatus('Kamer bijgewerkt.');
    }

    function syncRuleRoomOptions() {
        const selectedValue = state.editingPricingRuleId
            ? String(state.pricingRules.find((rule) => rule.id === state.editingPricingRuleId)?.roomId || '')
            : elements.ruleRoom.value;

        elements.ruleRoom.innerHTML = '<option value="">Kies kamer</option>' + getActiveRooms().map((room) => (
            `<option value="${room.id}">${escapeHtml(room.name)}</option>`
        )).join('');

        if (selectedValue) {
            elements.ruleRoom.value = selectedValue;
        }
    }

    async function savePricingRule() {
        const isEditing = Boolean(state.editingPricingRuleId);
        const payload = {
            roomId: Number(elements.ruleRoom.value),
            start: elements.ruleStart.value,
            end: elements.ruleEnd.value,
            nightlyPriceCents: eurosToCents(elements.ruleNightly.value),
            label: elements.ruleLabel.value.trim()
        };
        const url = state.editingPricingRuleId
            ? `/api/admin/pricing-rules/${state.editingPricingRuleId}`
            : '/api/admin/pricing-rules';
        const method = state.editingPricingRuleId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (!response.ok) {
            showAdminStatus(data.message || 'Prijsregel kon niet worden opgeslagen.', true);
            return;
        }

        if (isEditing) {
            state.pricingRules = state.pricingRules.map((rule) => rule.id === data.pricingRule.id ? data.pricingRule : rule);
        } else {
            state.pricingRules = [...state.pricingRules, data.pricingRule];
        }

        resetPricingRuleForm();
        renderPricingRules();
        showAdminStatus(isEditing ? 'Prijsregel bijgewerkt.' : 'Prijsregel opgeslagen.');
        await loadPlanner();
    }

    function beginPricingRuleEdit(ruleId) {
        const rule = state.pricingRules.find((item) => item.id === ruleId);
        if (!rule) {
            return;
        }

        state.editingPricingRuleId = ruleId;
        syncRuleRoomOptions();
        elements.ruleRoom.value = String(rule.roomId);
        elements.ruleNightly.value = String((rule.nightlyPriceCents || 0) / 100);
        elements.ruleStart.value = rule.start;
        elements.ruleEnd.value = rule.end;
        elements.ruleLabel.value = rule.label || '';
        elements.saveRuleBtn.textContent = 'Prijsregel bijwerken';
        elements.cancelRuleEditBtn.classList.remove('hidden');
        setActiveView('pricing');
    }

    function resetPricingRuleForm() {
        state.editingPricingRuleId = null;
        elements.pricingRuleForm.reset();
        syncRuleRoomOptions();
        elements.saveRuleBtn.textContent = 'Prijsregel opslaan';
        elements.cancelRuleEditBtn.classList.add('hidden');
    }

    async function deletePricingRule(ruleId) {
        if (!window.confirm('Deze prijsregel verwijderen?')) {
            return;
        }

        const response = await fetch(`/api/admin/pricing-rules/${ruleId}`, { method: 'DELETE' });
        if (!response.ok) {
            showAdminStatus('Prijsregel kon niet worden verwijderd.', true);
            return;
        }

        state.pricingRules = state.pricingRules.filter((rule) => rule.id !== ruleId);
        if (state.editingPricingRuleId === ruleId) {
            resetPricingRuleForm();
        }
        renderPricingRules();
        showAdminStatus('Prijsregel verwijderd.');
        await loadPlanner();
    }

    async function saveBlock() {
        const selectedRoomIds = getSelectedBlockRoomIds();
        if (!selectedRoomIds.length) {
            showAdminStatus('Selecteer minimaal een kamer om te blokkeren.', true);
            return;
        }

        const payload = {
            start: elements.blockStart.value,
            end: elements.blockEnd.value,
            selectedRoomIds,
            reason: elements.blockReason.value.trim()
        };

        const isEditing = Boolean(state.editingBlockId);
        const url = isEditing ? `/api/admin/blocks/${state.editingBlockId}` : '/api/admin/blocks';
        const method = isEditing ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (!response.ok) {
            showAdminStatus(data.message || 'Blokkade kon niet worden opgeslagen.', true);
            return;
        }

        if (isEditing) {
            state.blocks = state.blocks.map((block) => block.id === data.block.id ? data.block : block);
        } else {
            state.blocks = [...state.blocks, data.block];
        }

        resetBlockForm();
        renderBlocks();
        showAdminStatus(isEditing ? 'Blokkade bijgewerkt.' : 'Periode geblokkeerd.');
        await loadPlanner();
    }

    function beginBlockEdit(blockId) {
        const block = state.blocks.find((item) => item.id === blockId);
        if (!block) {
            return;
        }

        state.editingBlockId = blockId;
        elements.blockFormTitle.textContent = 'Blokkade bewerken';
        elements.blockStart.value = block.start;
        elements.blockEnd.value = block.end;
        elements.blockReason.value = block.reason || '';
        elements.blockBtn.textContent = 'Blokkade opslaan';
        elements.cancelBlockEditBtn.classList.remove('hidden');
        setSelectedBlockRoomIds(block.selectedRoomIds);
        setActiveView('planning');
    }

    function resetBlockForm() {
        state.editingBlockId = null;
        elements.blockForm.reset();
        elements.blockFormTitle.textContent = 'Periode blokkeren';
        elements.blockBtn.textContent = 'Periode blokkeren';
        elements.cancelBlockEditBtn.classList.add('hidden');
        renderBlockRoomSelector();
    }

    async function deleteBlock(blockId) {
        if (!window.confirm('Deze blokkade verwijderen?')) {
            return;
        }

        const response = await fetch(`/api/admin/blocks/${blockId}`, { method: 'DELETE' });
        if (!response.ok) {
            showAdminStatus('Blokkade kon niet worden verwijderd.', true);
            return;
        }

        state.blocks = state.blocks.filter((block) => block.id !== blockId);
        if (state.editingBlockId === blockId) {
            resetBlockForm();
        }
        renderBlocks();
        showAdminStatus('Blokkade verwijderd.');
        await loadPlanner();
    }

    async function changePassword() {
        const currentPassword = elements.currentPassword.value;
        const newPassword = elements.newPassword.value;
        const confirmPassword = elements.confirmPassword.value;

        if (newPassword.length < 10) {
            showAdminStatus('Het nieuwe wachtwoord moet minimaal 10 tekens hebben.', true);
            return;
        }

        if (newPassword !== confirmPassword) {
            showAdminStatus('De nieuwe wachtwoorden zijn niet gelijk.', true);
            return;
        }

        const response = await fetch('/api/admin/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        if (!response.ok) {
            const data = await response.json();
            showAdminStatus(data.message || 'Wachtwoord kon niet worden gewijzigd.', true);
            return;
        }

        elements.passwordForm.reset();
        showLogin();
        showLoginMessage('Adminwachtwoord gewijzigd. Log opnieuw in.');
    }

    async function savePaymentSettings() {
        const payload = {
            stripeSecretKey: elements.stripeSecretKey.value.trim()
        };

        const response = await fetch('/api/admin/payment-settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (!response.ok) {
            showAdminStatus(data.message || 'Stripe sleutel kon niet worden opgeslagen.', true);
            return;
        }

        state.paymentSettings = data.paymentSettings;
        renderPaymentSettings();
        showAdminStatus(state.paymentSettings.stripeConfigured ? 'Stripe sleutel opgeslagen.' : 'Stripe sleutel verwijderd.');
    }

    function openBookingPopup(bookingId) {
        const booking = state.bookings.find((item) => item.id === bookingId);
        if (!booking) {
            return;
        }

        state.editingBookingId = bookingId;
        elements.bookingModalTitle.textContent = booking.referenceCode;
        elements.bookingMetaSummary.textContent = [booking.name, booking.email, booking.nifNumber ? `NIF ${booking.nifNumber}` : ''].filter(Boolean).join(' · ');
        elements.editName.value = booking.name;
        elements.editEmail.value = booking.email;
        elements.editNifNumber.value = booking.nifNumber || '';
        elements.editStreet.value = booking.street || '';
        elements.editHouseNumber.value = booking.houseNumber || '';
        elements.editPostalCode.value = booking.postalCode || '';
        elements.editCity.value = booking.city || '';
        elements.editCountry.value = booking.country || '';
        elements.editNote.value = booking.note || '';
        elements.editCheckin.value = booking.checkin;
        elements.editCheckout.value = booking.checkout;
        elements.editAdultCount.value = String(booking.adultCount || 2);
        elements.editChildCount.value = String(booking.childCount || 0);
        elements.editBabyCount.value = String(booking.babyCount || 0);
        elements.editBabyBed.checked = Boolean(booking.babyBed);
        elements.editExtraBed.checked = Boolean(booking.extraBed);
        elements.editStatus.value = booking.status;
        elements.editStayPrice.value = String((booking.stayPriceCents || 0) / 100);
        elements.editExtras.value = String((booking.extrasPriceCents || 0) / 100);
        elements.editMail.checked = booking.mailSent;
        elements.editDeposit.checked = booking.depositPaid;
        elements.editPaid.checked = booking.paid;
        elements.editCheckinStatus.checked = booking.checkedIn;
        elements.editCheckoutStatus.checked = booking.checkedOut;
        renderSelectedRoomInputs(booking.selectedRoomIds);
        updateBookingSummary();
        elements.popup.classList.remove('hidden');
    }

    function renderSelectedRoomInputs(selectedIds) {
        selectedRoomInputs = [];
        elements.editRoomSelector.innerHTML = '';

        state.rooms
            .filter((room) => room.isActive || selectedIds.includes(room.id))
            .forEach((room) => {
                const label = document.createElement('label');
                label.className = 'checkbox-field';
                label.innerHTML = `
                    <input type="checkbox" value="${room.id}">
                    <span>
                        <strong>${escapeHtml(room.name)}</strong>
                        <small>Kamer ${escapeHtml(String(room.roomNumber))}${room.isActive ? '' : ' · momenteel inactief'}</small>
                    </span>
                `;
                const input = label.querySelector('input');
                input.checked = selectedIds.includes(room.id);
                selectedRoomInputs.push(input);
                elements.editRoomSelector.appendChild(label);
            });
    }

    function updateBookingSummary() {
        const booking = state.bookings.find((item) => item.id === state.editingBookingId);
        const stayPriceCents = eurosToCents(elements.editStayPrice.value);
        const extrasPriceCents = eurosToCents(elements.editExtras.value);
        const subtotalPriceCents = stayPriceCents + extrasPriceCents;
        const vatPriceCents = calculateVatCents(subtotalPriceCents);
        const totalPriceCents = subtotalPriceCents + vatPriceCents;

        elements.priceSummary.innerHTML = `
            <div class="admin-callout-grid">
                <div><strong>Subtotaal excl. btw</strong><br>${escapeHtml(formatMoney(subtotalPriceCents))}</div>
                <div><strong>Btw 6%</strong><br>${escapeHtml(formatMoney(vatPriceCents))}</div>
                <div><strong>Totaal incl. btw</strong><br>${escapeHtml(formatMoney(totalPriceCents))}</div>
                <div><strong>Aangemaakt</strong><br>${escapeHtml(booking ? formatDateTime(booking.createdAt) : '-')}</div>
                <div><strong>Laatst gewijzigd</strong><br>${escapeHtml(booking ? formatDateTime(booking.updatedAt) : '-')}</div>
            </div>
        `;
    }

    function closeBookingPopup() {
        elements.popup.classList.add('hidden');
        state.editingBookingId = null;
    }

    async function saveBooking() {
        if (!state.editingBookingId) {
            return;
        }

        const selectedRoomIds = selectedRoomInputs
            .filter((input) => input.checked)
            .map((input) => Number(input.value));

        if (!selectedRoomIds.length) {
            showAdminStatus('Selecteer minimaal één kamer voor deze boeking.', true);
            return;
        }

        const stayPriceCents = eurosToCents(elements.editStayPrice.value);
        const extrasPriceCents = eurosToCents(elements.editExtras.value);
        const subtotalPriceCents = stayPriceCents + extrasPriceCents;
        const totalPriceCents = subtotalPriceCents + calculateVatCents(subtotalPriceCents);
        const rawAdultCount = Number.parseInt(elements.editAdultCount.value, 10);
        const adultCount = readAdminCount(elements.editAdultCount, 2, 1);

        if (!Number.isFinite(rawAdultCount) || rawAdultCount < 1) {
            elements.editAdultCount.value = '1';
            showAdminStatus('Een boeking moet minimaal 1 volwassene hebben.', true);
            return;
        }

        const payload = {
            name: elements.editName.value.trim(),
            email: elements.editEmail.value.trim(),
            nifNumber: elements.editNifNumber.value.trim(),
            note: elements.editNote.value.trim(),
            street: elements.editStreet.value.trim(),
            houseNumber: elements.editHouseNumber.value.trim(),
            postalCode: elements.editPostalCode.value.trim(),
            city: elements.editCity.value.trim(),
            country: elements.editCountry.value.trim(),
            checkin: elements.editCheckin.value,
            checkout: elements.editCheckout.value,
            selectedRoomIds,
            adultCount,
            childCount: readAdminCount(elements.editChildCount, 0),
            babyCount: readAdminCount(elements.editBabyCount, 0),
            babyBed: elements.editBabyBed.checked ? 1 : 0,
            extraBed: elements.editExtraBed.checked ? 1 : 0,
            stayPriceCents,
            extrasPriceCents,
            totalPriceCents,
            status: elements.editStatus.value,
            mailSent: elements.editMail.checked,
            depositPaid: elements.editDeposit.checked,
            paid: elements.editPaid.checked,
            checkedIn: elements.editCheckinStatus.checked,
            checkedOut: elements.editCheckoutStatus.checked
        };

        const response = await fetch(`/api/admin/bookings/${state.editingBookingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (!response.ok) {
            showAdminStatus(data.message || 'Boeking kon niet worden opgeslagen.', true);
            return;
        }

        state.bookings = state.bookings.map((booking) => booking.id === data.booking.id ? data.booking : booking);
        renderDashboard();
        renderBookings();
        renderRooms();
        closeBookingPopup();
        showAdminStatus('Boeking bijgewerkt.');
        await loadPlanner();
    }

    async function deleteBooking() {
        if (!state.editingBookingId) {
            return;
        }

        if (!window.confirm('Deze boeking verwijderen?')) {
            return;
        }

        const response = await fetch(`/api/admin/bookings/${state.editingBookingId}`, { method: 'DELETE' });
        if (!response.ok) {
            showAdminStatus('Boeking kon niet worden verwijderd.', true);
            return;
        }

        state.bookings = state.bookings.filter((booking) => booking.id !== state.editingBookingId);
        renderDashboard();
        renderBookings();
        renderRooms();
        closeBookingPopup();
        showAdminStatus('Boeking verwijderd.');
        await loadPlanner();
    }

    function syncBookingFiltersFromInputs() {
        state.bookingFilters = {
            search: elements.bookingSearch.value.trim(),
            status: elements.bookingStatusFilter.value,
            payment: elements.bookingPaymentFilter.value,
            from: elements.bookingFrom.value,
            to: elements.bookingTo.value,
            sort: elements.bookingSort.value
        };
        renderBookings();
    }

    function syncBookingFilterInputs() {
        elements.bookingSearch.value = state.bookingFilters.search;
        elements.bookingStatusFilter.value = state.bookingFilters.status;
        elements.bookingPaymentFilter.value = state.bookingFilters.payment;
        elements.bookingFrom.value = state.bookingFilters.from;
        elements.bookingTo.value = state.bookingFilters.to;
        elements.bookingSort.value = state.bookingFilters.sort;
    }

    function getFilteredBookings() {
        const filters = state.bookingFilters;
        return state.bookings
            .filter((booking) => bookingMatchesFilters(booking, filters))
            .sort(sortBookings(filters.sort));
    }

    function bookingMatchesFilters(booking, filters) {
        const searchable = normalizeText([
            booking.name,
            booking.email,
            booking.nifNumber,
            guestCountLabel(booking),
            booking.referenceCode,
            joinRoomNames(booking.selectedRooms)
        ].join(' '));
        const searchValue = normalizeText(filters.search);

        if (searchValue && !searchable.includes(searchValue)) {
            return false;
        }

        if (filters.status !== 'all' && booking.status !== filters.status) {
            return false;
        }

        if (filters.payment === 'unpaid' && booking.paid) {
            return false;
        }

        if (filters.payment === 'deposit' && (!booking.depositPaid || booking.paid)) {
            return false;
        }

        if (filters.payment === 'paid' && !booking.paid) {
            return false;
        }

        if (filters.from && booking.checkin < filters.from) {
            return false;
        }

        if (filters.to && booking.checkin > filters.to) {
            return false;
        }

        return true;
    }

    function sortBookings(sort) {
        switch (sort) {
        case 'checkin-desc':
            return (left, right) => right.checkin.localeCompare(left.checkin) || right.createdAt.localeCompare(left.createdAt);
        case 'created-desc':
            return (left, right) => right.createdAt.localeCompare(left.createdAt);
        case 'created-asc':
            return (left, right) => left.createdAt.localeCompare(right.createdAt);
        case 'checkin-asc':
        default:
            return (left, right) => left.checkin.localeCompare(right.checkin) || right.createdAt.localeCompare(left.createdAt);
        }
    }

    function handleDashboardAction(action) {
        switch (action) {
        case 'show-pending':
            state.bookingFilters = { ...defaultBookingFilters(), status: 'pending' };
            break;
        case 'show-upcoming':
            state.bookingFilters = { ...defaultBookingFilters(), from: todayIso() };
            break;
        case 'show-unpaid':
            state.bookingFilters = { ...defaultBookingFilters(), payment: 'unpaid' };
            break;
        case 'show-planning':
            setActiveView('planning');
            return;
        case 'show-all-bookings':
        default:
            state.bookingFilters = defaultBookingFilters();
            break;
        }

        syncBookingFilterInputs();
        setActiveView('bookings');
        renderBookings();
    }

    function setActiveView(view) {
        state.activeView = view;
        document.querySelectorAll('.admin-view').forEach((section) => {
            section.classList.toggle('hidden', section.id !== `view-${view}`);
        });
        elements.adminNav.querySelectorAll('[data-view]').forEach((button) => {
            button.classList.toggle('is-active', button.dataset.view === view);
        });

        if (view === 'planning') {
            void loadPlanner();
        }
    }

    function showAdmin() {
        elements.loginCard.classList.add('hidden');
        elements.adminApp.classList.remove('hidden');
    }

    function showLogin() {
        elements.adminApp.classList.add('hidden');
        elements.loginCard.classList.remove('hidden');
    }

    function showAdminStatus(message, isError = false) {
        elements.adminStatus.textContent = message;
        elements.adminStatus.classList.remove('hidden', 'is-error');
        elements.adminStatus.classList.toggle('is-error', isError);
    }

    function showLoginMessage(message) {
        elements.loginError.textContent = message;
        elements.loginError.classList.remove('hidden');
        elements.loginError.classList.add('is-error');
    }

    function reportFatalError(error) {
        const message = error instanceof Error ? error.message : String(error || 'Onbekende fout.');
        showAdminStatus(`Beheerpagina fout: ${message}`, true);
        if (elements.adminApp.classList.contains('hidden')) {
            showLoginMessage(`Beheerpagina fout: ${message}`);
        }
        console.error(error);
    }

    function clearLoginErrors() {
        elements.loginError.classList.add('hidden');
        elements.loginIdentifierError.classList.add('hidden');
        elements.loginPasswordError.classList.add('hidden');
    }

    function roomActivity(roomId) {
        const upcomingBookings = state.bookings.filter((booking) => booking.status !== 'cancelled' && booking.selectedRoomIds.includes(roomId) && booking.checkout > todayIso()).length;
        const holds = state.activeHolds.filter((hold) => hold.selectedRoomIds.includes(roomId)).length;
        if (holds) {
            return `${upcomingBookings} actieve boekingen · ${holds} holds`;
        }
        return `${upcomingBookings} actieve boekingen`;
    }

    function joinRoomNames(rooms) {
        const names = (rooms || []).map((room) => room.name).filter(Boolean);
        return names.length ? names.join(', ') : 'Geen kamer gekoppeld';
    }

    function roomNamesForIds(roomIds) {
        const names = (roomIds || [])
            .map((roomId) => state.rooms.find((room) => room.id === roomId)?.name)
            .filter(Boolean);
        return names.length ? names.join(', ') : 'Alle kamers';
    }

    function statusLabel(status) {
        const labels = {
            pending: 'Nieuwe aanvraag',
            confirmed: 'Bevestigd',
            'checked-in': 'Ingecheckt',
            'checked-out': 'Uitgecheckt',
            cancelled: 'Geannuleerd'
        };
        return labels[status] || status;
    }

    function paymentLabel(booking) {
        if (booking.paid) {
            return 'Volledig betaald';
        }

        if (booking.depositPaid) {
            return 'Voorschot betaald';
        }

        return 'Open betaling';
    }

    function statusBadgeClass(status) {
        if (status === 'confirmed' || status === 'checked-in' || status === 'checked-out') {
            return 'badge-success';
        }

        if (status === 'cancelled') {
            return 'badge-danger';
        }

        return 'badge-warning';
    }

    function paymentBadgeClass(booking) {
        if (booking.paid) {
            return 'badge-success';
        }

        if (booking.depositPaid) {
            return 'badge-warning';
        }

        return 'badge-muted';
    }

    function sortLabel(sort) {
        const labels = {
            'checkin-asc': 'aankomst oplopend',
            'checkin-desc': 'aankomst aflopend',
            'created-desc': 'recent toegevoegd',
            'created-asc': 'oudst eerst'
        };
        return labels[sort] || sort;
    }

    function defaultBookingFilters() {
        return {
            search: '',
            status: 'all',
            payment: 'all',
            from: '',
            to: '',
            sort: 'checkin-asc'
        };
    }

    function resetBookingFilters() {
        state.bookingFilters = defaultBookingFilters();
    }

    function getActiveRooms() {
        return state.rooms.filter((room) => room.isActive);
    }

    function getSelectedBlockRoomIds() {
        return Array.from(elements.blockRoomSelector.querySelectorAll('input[data-block-room-id]:checked'))
            .map((input) => Number(input.value));
    }

    function setSelectedBlockRoomIds(roomIds) {
        const selectedIds = new Set((roomIds || []).map(Number));
        elements.blockRoomSelector.querySelectorAll('input[data-block-room-id]').forEach((input) => {
            input.checked = selectedIds.has(Number(input.value));
        });
    }

    function normalizeText(value) {
        return String(value || '').trim().toLowerCase();
    }

    function eurosToCents(value) {
        return Math.round(Number(value || 0) * 100);
    }

    function calculateVatCents(subtotalPriceCents) {
        return Math.round((Number(subtotalPriceCents || 0) * 6) / 100);
    }

    function readAdminCount(input, fallback, minimum = 0) {
        const value = Number.parseInt(input.value, 10);
        return Number.isFinite(value) ? Math.max(minimum, value) : fallback;
    }

    function guestCountLabel(booking) {
        return `${Number(booking.adultCount || 0)} volw. · ${Number(booking.childCount || 0)} kind. · ${Number(booking.babyCount || 0)} baby`;
    }

    function formatMoney(cents) {
        return new Intl.NumberFormat('nl-NL', {
            style: 'currency',
            currency: 'EUR'
        }).format(Number(cents || 0) / 100);
    }

    function formatDateRange(checkin, checkout) {
        return `${formatDate(checkin)} - ${formatDate(checkout)}`;
    }

    function formatDate(value) {
        if (!value) {
            return '-';
        }

        return new Date(`${value}T00:00:00Z`).toLocaleDateString('nl-NL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    function formatDateTime(value) {
        if (!value) {
            return '-';
        }

        return new Date(value).toLocaleString('nl-NL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatTimeUntil(value) {
        const remainingMs = new Date(value).getTime() - Date.now();
        if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
            return 'Verlopen';
        }

        const minutes = Math.ceil(remainingMs / 60000);
        if (minutes < 60) {
            return `${minutes} min`;
        }

        const hours = Math.floor(minutes / 60);
        const restMinutes = minutes % 60;
        return restMinutes ? `${hours}u ${restMinutes}m` : `${hours}u`;
    }

    function todayIso() {
        return new Date().toISOString().slice(0, 10);
    }

    function monthKey(date) {
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    }

    function shiftMonth(month, delta) {
        const [year, number] = month.split('-').map(Number);
        const date = new Date(Date.UTC(year, number - 1 + delta, 1));
        return monthKey(date);
    }

    function capitalize(value) {
        return String(value || '').charAt(0).toUpperCase() + String(value || '').slice(1);
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
})();