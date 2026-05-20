(function () {
    const i18n = window.CSLI18N;
    const BOOKING_DRAFT_KEY = 'csl-booking-draft';
    const currentMonthKey = formatMonthKey(new Date());

    const state = {
        settings: null,
        checkin: '',
        checkout: '',
        adultCount: 2,
        childCount: 0,
        babyCount: 0,
        babyBed: 0,
        extraBed: 0,
        availability: [],
        quote: null,
        selectedRoomIds: new Set(),
        calendarMonth: currentMonthKey,
        calendar: null,
        loadingAvailability: false,
        loadingCalendar: false
    };

    const elements = {
        bookingForm: document.getElementById('bookingForm'),
        stayRange: document.getElementById('stayRange'),
        stayRangeError: document.getElementById('stayRangeError'),
        adultCount: document.getElementById('adultCount'),
        childCount: document.getElementById('childCount'),
        babyCount: document.getElementById('babyCount'),
        babyBed: document.getElementById('babyBed'),
        extraBed: document.getElementById('extraBed'),
        adultCountError: document.getElementById('adultCountError'),
        childCountError: document.getElementById('childCountError'),
        babyCountError: document.getElementById('babyCountError'),
        babyBedError: document.getElementById('babyBedError'),
        extraBedError: document.getElementById('extraBedError'),
        availabilityStatus: document.getElementById('availabilityStatus'),
        roomGrid: document.getElementById('roomGrid'),
        roomSelectionError: document.getElementById('roomSelectionError'),
        roomsMeta: document.getElementById('roomsMeta'),
        guestName: document.getElementById('guestName'),
        guestEmail: document.getElementById('guestEmail'),
        guestPhone: document.getElementById('guestPhone'),
        guestNifField: document.getElementById('guestNifField'),
        guestNifNumber: document.getElementById('guestNifNumber'),
        guestStreet: document.getElementById('guestStreet'),
        guestHouseNumber: document.getElementById('guestHouseNumber'),
        guestPostalCode: document.getElementById('guestPostalCode'),
        guestCity: document.getElementById('guestCity'),
        guestCountry: document.getElementById('guestCountry'),
        guestNote: document.getElementById('guestNote'),
        guestNameError: document.getElementById('guestNameError'),
        guestEmailError: document.getElementById('guestEmailError'),
        guestPhoneError: document.getElementById('guestPhoneError'),
        guestNifNumberError: document.getElementById('guestNifNumberError'),
        guestStreetError: document.getElementById('guestStreetError'),
        guestHouseNumberError: document.getElementById('guestHouseNumberError'),
        guestPostalCodeError: document.getElementById('guestPostalCodeError'),
        guestCityError: document.getElementById('guestCityError'),
        guestCountryError: document.getElementById('guestCountryError'),
        guestNoteError: document.getElementById('guestNoteError'),
        continueButton: document.getElementById('continueButton'),
        formStatus: document.getElementById('formStatus'),
        summaryEmpty: document.getElementById('summaryEmpty'),
        summaryCard: document.getElementById('summaryCard'),
        summaryStay: document.getElementById('summaryStay'),
        summaryRooms: document.getElementById('summaryRooms'),
        summaryGuest: document.getElementById('summaryGuest'),
        summaryLineItems: document.getElementById('summaryLineItems'),
        summaryStayPrice: document.getElementById('summaryStayPrice'),
        summaryVat: document.getElementById('summaryVat'),
        summaryTotal: document.getElementById('summaryTotal'),
        calendarPrev: document.getElementById('calendarPrev'),
        calendarNext: document.getElementById('calendarNext'),
        calendarMonthSelect: document.getElementById('calendarMonthSelect'),
        calendarYearSelect: document.getElementById('calendarYearSelect'),
        calendarToday: document.getElementById('calendarToday'),
        calendarMonthLabel: document.getElementById('calendarMonthLabel'),
        calendarGrid: document.getElementById('calendarGrid'),
        calendarStatus: document.getElementById('calendarStatus')
    };

    let datePicker = null;

    document.addEventListener('DOMContentLoaded', () => {
        initDatePicker();
        wireEvents();
        restoreBookingDraft();
        syncNifVisibility();
        void loadInitialData();
    });

    window.addEventListener('csl:languagechange', () => {
        syncNifVisibility();
        translateVisibleFieldErrors();
        updateDatePickerPresentation();
        renderAvailability();
        renderSummary();
        renderCalendar();
    });

    function initDatePicker() {
        datePicker = flatpickr(elements.stayRange, {
            mode: 'range',
            minDate: 'today',
            dateFormat: 'Y-m-d',
            altInput: true,
            altFormat: 'j M Y',
            conjunction: ' - ',
            locale: getFlatpickrLocale(i18n.getLanguage()),
            onClose(selectedDates) {
                if (selectedDates.length === 2) {
                    state.checkin = toIsoDate(selectedDates[0]);
                    state.checkout = toIsoDate(selectedDates[1]);
                    state.calendarMonth = clampCalendarMonthKey(state.checkin.slice(0, 7));
                    clearFieldError(elements.stayRangeError);
                    saveBookingDraft();
                    void refreshAvailability();
                    void loadCalendar();
                }
            }
        });

        updateDatePickerPresentation();
    }

    function wireEvents() {
        [elements.adultCount, elements.childCount, elements.babyCount, elements.babyBed, elements.extraBed].forEach((input) => {
            input.addEventListener('input', () => {
                syncGuestCounts();
                updateVisibleGuestCountErrors();
                clearFieldError(elements.roomSelectionError);
                saveBookingDraft();
                void refreshQuote();
            });
        });

        [elements.guestName, elements.guestCity, elements.guestPhone].forEach((input) => {
            input.addEventListener('input', () => {
                renderSummary();
                saveBookingDraft();
            });
        });

        [
            [elements.guestName, elements.guestNameError, getGuestNameErrorKey],
            [elements.guestEmail, elements.guestEmailError, getGuestEmailErrorKey],
            [elements.guestPhone, elements.guestPhoneError, getGuestPhoneErrorKey],
            [elements.guestNifNumber, elements.guestNifNumberError, getGuestNifNumberErrorKey],
            [elements.guestStreet, elements.guestStreetError, getGuestStreetErrorKey],
            [elements.guestHouseNumber, elements.guestHouseNumberError, getGuestHouseNumberErrorKey],
            [elements.guestPostalCode, elements.guestPostalCodeError, getGuestPostalCodeErrorKey],
            [elements.guestCity, elements.guestCityError, getGuestCityErrorKey],
            [elements.guestCountry, elements.guestCountryError, getGuestCountryErrorKey],
            [elements.guestNote, elements.guestNoteError, getGuestNoteErrorKey]
        ].forEach(([input, errorElement, getErrorKey]) => {
            input.addEventListener('input', () => {
                updateVisibleFieldError(errorElement, getErrorKey());
                saveBookingDraft();
            });
        });

        elements.bookingForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!validateForm()) {
                return;
            }

            const payload = buildBookingPayload();
            saveBookingDraft(payload);

            try {
                setButtonLoading(true);
                showStatus(elements.formStatus, i18n.t('booking.continueLoading'));

                const response = await fetch('/api/public/hold', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(extractError(data, 'booking.errors.generic'));
                }

                window.sessionStorage.setItem(`csl-hold:${data.hold.holdToken}`, JSON.stringify({
                    hold: data.hold,
                    checkoutUrl: data.checkoutUrl || null,
                    draft: payload
                }));

                window.location.href = `/payment?hold=${encodeURIComponent(data.hold.holdToken)}`;
            } catch (error) {
                showStatus(elements.formStatus, error.message || i18n.t('booking.errors.generic'), true);
            } finally {
                setButtonLoading(false);
            }
        });

        elements.calendarPrev.addEventListener('click', () => {
            state.calendarMonth = clampCalendarMonthKey(shiftMonthKey(state.calendarMonth, -1));
            void loadCalendar();
        });

        elements.calendarNext.addEventListener('click', () => {
            state.calendarMonth = clampCalendarMonthKey(shiftMonthKey(state.calendarMonth, 1));
            void loadCalendar();
        });

        elements.calendarMonthSelect.addEventListener('change', handleCalendarJumpChange);
        elements.calendarYearSelect.addEventListener('change', handleCalendarJumpChange);
        elements.calendarToday.addEventListener('click', () => {
            state.calendarMonth = currentMonthKey;
            void loadCalendar();
        });
    }

    async function loadInitialData() {
        try {
            const response = await fetch('/api/public/settings');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(i18n.t('booking.errors.settings'));
            }

            state.settings = data;
            if (state.checkin && state.checkout) {
                await Promise.all([loadCalendar(), refreshAvailability()]);
            } else {
                await loadCalendar();
                renderAvailability();
                renderSummary();
            }
        } catch (error) {
            showStatus(elements.availabilityStatus, error.message || i18n.t('booking.errors.settings'), true);
        }
    }

    async function refreshAvailability() {
        if (!state.checkin || !state.checkout) {
            return;
        }

        state.loadingAvailability = true;
        showStatus(elements.availabilityStatus, i18n.t('booking.availabilityLoading'));
        renderAvailability();

        try {
            const params = new URLSearchParams({
                checkin: state.checkin,
                checkout: state.checkout,
                extraBed: 'false'
            });
            const response = await fetch(`/api/public/availability?${params.toString()}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(extractError(data, 'booking.errors.unavailable'));
            }

            state.availability = data.rooms;
            state.quote = null;
            const availableIds = new Set(data.rooms.filter((room) => room.isAvailable).map((room) => room.id));
            state.selectedRoomIds = new Set([...state.selectedRoomIds].filter((roomId) => availableIds.has(roomId)));
            saveBookingDraft();
            await refreshQuote(false);
            hideStatus(elements.availabilityStatus);
        } catch (error) {
            state.availability = [];
            state.quote = null;
            state.selectedRoomIds.clear();
            showStatus(elements.availabilityStatus, error.message || i18n.t('booking.errors.generic'), true);
        } finally {
            state.loadingAvailability = false;
            renderAvailability();
            renderSummary();
        }
    }

    async function refreshQuote(renderWhenDone = true) {
        if (!state.checkin || !state.checkout || !state.selectedRoomIds.size) {
            state.quote = null;
            if (renderWhenDone) {
                renderSummary();
            }
            return;
        }

        try {
            const response = await fetch('/api/public/quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    checkin: state.checkin,
                    checkout: state.checkout,
                    selectedRoomIds: [...state.selectedRoomIds],
                    adultCount: state.adultCount,
                    childCount: state.childCount,
                    babyCount: state.babyCount,
                    babyBed: state.babyBed,
                    extraBed: state.extraBed
                })
            });
            const data = await response.json();

            if (!response.ok) {
                state.quote = null;
                showStatus(elements.formStatus, extractError(data, 'booking.errors.generic'), true);
                return;
            }

            state.quote = data;
            hideStatus(elements.formStatus);
        } catch (error) {
            state.quote = null;
            showStatus(elements.formStatus, error.message || i18n.t('booking.errors.generic'), true);
        } finally {
            if (renderWhenDone) {
                renderSummary();
            }
        }
    }

    async function loadCalendar() {
        state.calendarMonth = clampCalendarMonthKey(state.calendarMonth);
        state.loadingCalendar = true;
        showStatus(elements.calendarStatus, i18n.t('booking.calendarLoading'));
        renderCalendar();

        try {
            const response = await fetch(`/api/public/calendar?month=${encodeURIComponent(state.calendarMonth)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(i18n.t('booking.errors.generic'));
            }

            state.calendar = data;
            hideStatus(elements.calendarStatus);
        } catch (error) {
            state.calendar = null;
            showStatus(elements.calendarStatus, error.message || i18n.t('booking.errors.generic'), true);
        } finally {
            state.loadingCalendar = false;
            renderCalendar();
        }
    }

    function renderAvailability() {
        elements.roomGrid.innerHTML = '';

        if (!state.checkin || !state.checkout) {
            elements.roomGrid.innerHTML = `<div class="empty-card">${i18n.t('booking.availabilityEmpty')}</div>`;
            elements.roomsMeta.classList.add('hidden');
            return;
        }

        if (state.loadingAvailability) {
            elements.roomGrid.innerHTML = `<div class="empty-card">${i18n.t('booking.availabilityLoading')}</div>`;
            elements.roomsMeta.classList.add('hidden');
            return;
        }

        const availableCount = state.availability.filter((room) => room.isAvailable).length;
        elements.roomsMeta.textContent = i18n.t('booking.roomsMeta', {
            available: availableCount,
            total: state.availability.length
        });
        elements.roomsMeta.classList.toggle('hidden', !state.availability.length);

        if (!state.availability.length) {
            elements.roomGrid.innerHTML = `<div class="empty-card">${i18n.t('booking.errors.unavailable')}</div>`;
            return;
        }

        state.availability.forEach((room) => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = `room-card ${room.isAvailable ? '' : 'is-unavailable'} ${state.selectedRoomIds.has(room.id) ? 'is-selected' : ''}`.trim();
            card.disabled = !room.isAvailable;
            card.innerHTML = `
                <span class="room-card-top">
                    <strong>${escapeHtml(room.name)}</strong>
                    <span class="room-occupancy">${i18n.t('booking.roomCapacity', { guests: room.maxGuests })}</span>
                </span>
                <span class="room-card-middle">
                    <span class="room-card-status">${i18n.t(room.isAvailable ? 'booking.roomAvailable' : 'booking.roomUnavailable')}</span>
                    <span class="room-card-price-wrap">
                        <strong class="room-card-price">${i18n.formatCurrency(room.totalPriceCents)}</strong>
                        <small>${i18n.t('booking.roomTotalInclVat')}</small>
                    </span>
                </span>
                <span class="room-card-bottom">
                    <span class="room-card-rate">${i18n.t('booking.roomNightRate', { price: i18n.formatCurrency(room.firstNightPriceCents) })}</span>
                </span>
            `;

            card.addEventListener('click', () => {
                if (state.selectedRoomIds.has(room.id)) {
                    state.selectedRoomIds.delete(room.id);
                } else {
                    state.selectedRoomIds.add(room.id);
                }

                clearFieldError(elements.roomSelectionError);
                saveBookingDraft();
                renderAvailability();
                void refreshQuote();
            });

            elements.roomGrid.appendChild(card);
        });
    }

    function renderSummary() {
        const selectedRooms = state.availability.filter((room) => state.selectedRoomIds.has(room.id));
        if (!state.checkin || !state.checkout || !selectedRooms.length) {
            elements.summaryEmpty.classList.remove('hidden');
            elements.summaryCard.classList.add('hidden');
            elements.summaryGuest.textContent = elements.guestName.value.trim() || '—';
            return;
        }

        const quote = state.quote;
        const stayPrice = quote?.stayPriceCents ?? selectedRooms.reduce((sum, room) => sum + room.stayPriceCents, 0);
        const extrasPrice = quote?.extrasPriceCents ?? selectedRooms.reduce((sum, room) => sum + room.extrasPriceCents, 0);
        const vatPrice = quote?.vatPriceCents ?? selectedRooms.reduce((sum, room) => sum + room.vatPriceCents, 0);
        const totalPrice = quote?.totalPriceCents ?? selectedRooms.reduce((sum, room) => sum + room.totalPriceCents, 0);
        const subtotalPrice = quote?.subtotalPriceCents ?? (stayPrice + extrasPrice);
        const nights = quote?.nights ?? selectedRooms[0]?.nights ?? 0;
        const nightsLabel = i18n.formatUnit('night', nights);
        const guestSummary = [
            elements.guestName.value.trim(),
            i18n.formatGuestCounts({ adults: state.adultCount, children: state.childCount, babies: state.babyCount }),
            elements.guestCity.value.trim()
        ].filter(Boolean).join(' · ');

        elements.summaryEmpty.classList.add('hidden');
        elements.summaryCard.classList.remove('hidden');
        elements.summaryStay.textContent = `${formatFriendlyDate(state.checkin)} - ${formatFriendlyDate(state.checkout)} · ${nightsLabel}`;
        elements.summaryRooms.textContent = selectedRooms.map((room) => room.name).join(', ');
        elements.summaryGuest.textContent = guestSummary || '—';
        elements.summaryLineItems.innerHTML = buildSummaryLineItems(selectedRooms, nights, quote).map((item) => `
            <div class="summary-item ${item.amountCents < 0 ? 'summary-item-negative' : ''}">
                <span class="summary-item-copy">
                    <span class="summary-item-title">${escapeHtml(item.label)}</span>
                    <small class="summary-item-detail">${escapeHtml(item.detail)}</small>
                </span>
                <strong>${escapeHtml(i18n.formatCurrency(item.amountCents))}</strong>
            </div>
        `).join('');
        elements.summaryStayPrice.textContent = i18n.formatCurrency(subtotalPrice);
        elements.summaryVat.textContent = i18n.formatCurrency(vatPrice);
        elements.summaryTotal.textContent = i18n.formatCurrency(totalPrice);
    }

    function buildSummaryLineItems(selectedRooms, nights, quote = null) {
        const quoteRoomLookup = new Map((quote?.roomQuotes || []).map((roomQuote) => [Number(roomQuote.roomId), roomQuote]));
        const roomItems = [];
        const nightsLabel = i18n.formatUnit('night', nights);

        selectedRooms.forEach((room) => {
            const roomQuote = quoteRoomLookup.get(Number(room.id));
            const baseAmountCents = roomQuote
                ? roomQuote.nightBreakdown.reduce((sum, night) => sum + Number(night.baseNightlyPriceCents || night.nightlyPriceCents || 0), 0)
                : room.stayPriceCents;
            const discountAmountCents = roomQuote
                ? roomQuote.nightBreakdown.reduce((sum, night) => sum + Number(night.singleOccupancyDiscountCents || 0), 0)
                : 0;

            roomItems.push({
                label: room.name,
                detail: i18n.t('booking.summaryRateDetail', {
                    nightsLabel,
                    price: i18n.formatCurrency(nights ? baseAmountCents / nights : baseAmountCents)
                }),
                amountCents: baseAmountCents
            });

            if (discountAmountCents > 0) {
                roomItems.push({
                    label: i18n.t('booking.summarySingleOccupancyDiscountTitle', {
                        room: room.name
                    }),
                    detail: i18n.t('booking.summaryRateDetail', {
                        nightsLabel,
                        price: i18n.formatCurrency(discountAmountCents / Math.max(nights, 1))
                    }),
                    amountCents: -discountAmountCents
                });
            }
        });

        const extrasPrice = quote?.extrasPriceCents ?? selectedRooms.reduce((sum, room) => sum + room.extrasPriceCents, 0);
        if (extrasPrice > 0) {
            roomItems.push({
                label: i18n.t('booking.summaryExtraBedTitle'),
                detail: i18n.t('booking.summaryRateDetail', {
                    nightsLabel,
                    price: i18n.formatCurrency(nights ? extrasPrice / nights : extrasPrice)
                }),
                amountCents: extrasPrice
            });
        }

        return roomItems;
    }

    function renderCalendar() {
        elements.calendarMonthLabel.textContent = formatMonthLabel(state.calendarMonth);
        syncCalendarControls();
        elements.calendarGrid.innerHTML = '';

        if (state.loadingCalendar) {
            elements.calendarGrid.innerHTML = `<div class="empty-card">${i18n.t('booking.calendarLoading')}</div>`;
            return;
        }

        if (!state.calendar) {
            elements.calendarGrid.innerHTML = `<div class="empty-card">${i18n.t('booking.errors.generic')}</div>`;
            return;
        }

        const table = document.createElement('div');
        table.className = 'calendar-table';

        const headRow = document.createElement('div');
        headRow.className = 'calendar-row calendar-row-head';
        headRow.innerHTML = `<div class="calendar-room-cell calendar-room-cell-head">${i18n.t('booking.roomsTitle')}</div>${state.calendar.days.map((date) => {
            const dayLabel = formatCalendarDayLabel(date);
            return `<div class="calendar-day-cell calendar-day-cell-head"><span class="calendar-day-week">${escapeHtml(dayLabel.weekday)}</span><span class="calendar-day-number">${escapeHtml(dayLabel.day)}</span></div>`;
        }).join('')}`;
        table.appendChild(headRow);

        state.calendar.rooms.forEach((room) => {
            const row = document.createElement('div');
            row.className = 'calendar-row';
            const cells = room.days.map((day) => `<div class="calendar-day-cell day-${day.status}" title="${escapeHtml(room.name)} ${day.date} ${i18n.formatCurrency(day.priceInclVatCents || day.priceCents)}"></div>`).join('');
            row.innerHTML = `<div class="calendar-room-cell"><strong>${escapeHtml(room.name)}</strong><small>${i18n.t('booking.roomCapacity', { guests: room.maxGuests })}</small></div>${cells}`;
            table.appendChild(row);
        });

        elements.calendarGrid.appendChild(table);
    }

    function handleCalendarJumpChange() {
        const selectedMonth = elements.calendarMonthSelect.value;
        const selectedYear = elements.calendarYearSelect.value;
        if (!selectedMonth || !selectedYear) {
            return;
        }

        state.calendarMonth = clampCalendarMonthKey(`${selectedYear}-${selectedMonth}`);
        void loadCalendar();
    }

    function validateForm() {
        let valid = true;

        hideStatus(elements.formStatus);
        clearFieldError(elements.stayRangeError);
        clearFieldError(elements.roomSelectionError);
        clearFieldError(elements.adultCountError);
        clearFieldError(elements.childCountError);
        clearFieldError(elements.babyCountError);
        clearFieldError(elements.babyBedError);
        clearFieldError(elements.extraBedError);
        clearFieldError(elements.guestNameError);
        clearFieldError(elements.guestEmailError);
        clearFieldError(elements.guestPhoneError);
        clearFieldError(elements.guestNifNumberError);
        clearFieldError(elements.guestStreetError);
        clearFieldError(elements.guestHouseNumberError);
        clearFieldError(elements.guestPostalCodeError);
        clearFieldError(elements.guestCityError);
        clearFieldError(elements.guestCountryError);
        clearFieldError(elements.guestNoteError);

        syncGuestCounts();

        const adultCountErrorKey = getAdultCountErrorKey();
        if (adultCountErrorKey) {
            showFieldError(elements.adultCountError, adultCountErrorKey);
            valid = false;
        }

        const extraBedErrorKey = getExtraBedErrorKey();
        if (extraBedErrorKey) {
            showFieldError(elements.extraBedError, extraBedErrorKey);
            valid = false;
        }

        const babyBedErrorKey = getBabyBedErrorKey();
        if (babyBedErrorKey) {
            showFieldError(elements.babyBedError, babyBedErrorKey);
            valid = false;
        }

        if (state.selectedRoomIds.size) {
            const roomCount = state.selectedRoomIds.size;
            const payingGuests = state.adultCount + state.childCount;
            if (state.extraBed > roomCount) {
                showFieldError(elements.extraBedError, 'booking.validation.extraBedPerRoom');
                valid = false;
            }
            if (state.babyBed > roomCount) {
                showFieldError(elements.babyBedError, 'booking.validation.babyBedPerRoom');
                valid = false;
            }
            if (payingGuests > (roomCount * 2) + state.extraBed) {
                showFieldError(elements.roomSelectionError, 'booking.validation.occupancyRoomsRequired');
                valid = false;
            }
        }

        if (!state.checkin || !state.checkout) {
            showFieldError(elements.stayRangeError, 'booking.validation.stayRequired');
            valid = false;
        }

        if (!state.selectedRoomIds.size) {
            showFieldError(elements.roomSelectionError, 'booking.validation.roomsRequired');
            valid = false;
        }

        const guestNameErrorKey = getGuestNameErrorKey();
        if (guestNameErrorKey) {
            showFieldError(elements.guestNameError, guestNameErrorKey);
            valid = false;
        }

        const guestEmailErrorKey = getGuestEmailErrorKey();
        if (guestEmailErrorKey) {
            showFieldError(elements.guestEmailError, guestEmailErrorKey);
            valid = false;
        }

        const guestPhoneErrorKey = getGuestPhoneErrorKey();
        if (guestPhoneErrorKey) {
            showFieldError(elements.guestPhoneError, guestPhoneErrorKey);
            valid = false;
        }

        const guestNifNumberErrorKey = getGuestNifNumberErrorKey();
        if (guestNifNumberErrorKey) {
            showFieldError(elements.guestNifNumberError, guestNifNumberErrorKey);
            valid = false;
        }

        const guestStreetErrorKey = getGuestStreetErrorKey();
        if (guestStreetErrorKey) {
            showFieldError(elements.guestStreetError, guestStreetErrorKey);
            valid = false;
        }

        const guestHouseNumberErrorKey = getGuestHouseNumberErrorKey();
        if (guestHouseNumberErrorKey) {
            showFieldError(elements.guestHouseNumberError, guestHouseNumberErrorKey);
            valid = false;
        }

        const guestPostalCodeErrorKey = getGuestPostalCodeErrorKey();
        if (guestPostalCodeErrorKey) {
            showFieldError(elements.guestPostalCodeError, guestPostalCodeErrorKey);
            valid = false;
        }

        const guestCityErrorKey = getGuestCityErrorKey();
        if (guestCityErrorKey) {
            showFieldError(elements.guestCityError, guestCityErrorKey);
            valid = false;
        }

        const guestCountryErrorKey = getGuestCountryErrorKey();
        if (guestCountryErrorKey) {
            showFieldError(elements.guestCountryError, guestCountryErrorKey);
            valid = false;
        }

        const guestNoteErrorKey = getGuestNoteErrorKey();
        if (guestNoteErrorKey) {
            showFieldError(elements.guestNoteError, guestNoteErrorKey);
            valid = false;
        }

        return valid;
    }

    function getAdultCountErrorKey() {
        return state.adultCount < 1 ? 'booking.validation.adultCountRequired' : '';
    }

    function getExtraBedErrorKey() {
        return state.extraBed > state.childCount ? 'booking.validation.extraBedNeedsChild' : '';
    }

    function getBabyBedErrorKey() {
        return state.babyBed > state.babyCount ? 'booking.validation.babyBedNeedsBaby' : '';
    }

    function getGuestNameErrorKey() {
        return elements.guestName.value.trim().length < 2 ? 'booking.validation.nameRequired' : '';
    }

    function getGuestEmailErrorKey() {
        const email = elements.guestEmail.value.trim();
        if (!email) {
            return 'booking.validation.emailRequired';
        }
        return !elements.guestEmail.checkValidity() || !/^\S+@\S+\.\S+$/.test(email) ? 'booking.validation.emailInvalid' : '';
    }

    function getGuestPhoneErrorKey() {
        const phone = elements.guestPhone.value.trim();
        if (!phone) {
            return 'booking.validation.phoneRequired';
        }
        return /^[+\d][\d\s()/-]{5,}$/.test(phone) ? '' : 'booking.validation.phoneInvalid';
    }

    function getGuestNifNumberErrorKey() {
        return shouldShowNifField() && elements.guestNifNumber.value.trim().length > 32 ? 'booking.validation.nifNumberLong' : '';
    }

    function getGuestStreetErrorKey() {
        return elements.guestStreet.value.trim().length < 2 ? 'booking.validation.streetRequired' : '';
    }

    function getGuestHouseNumberErrorKey() {
        return elements.guestHouseNumber.value.trim() ? '' : 'booking.validation.houseNumberRequired';
    }

    function getGuestPostalCodeErrorKey() {
        return elements.guestPostalCode.value.trim().length < 2 ? 'booking.validation.postalCodeRequired' : '';
    }

    function getGuestCityErrorKey() {
        return elements.guestCity.value.trim().length < 2 ? 'booking.validation.cityRequired' : '';
    }

    function getGuestCountryErrorKey() {
        return elements.guestCountry.value.trim().length < 2 ? 'booking.validation.countryRequired' : '';
    }

    function getGuestNoteErrorKey() {
        return elements.guestNote.value.trim().length > 1000 ? 'booking.validation.noteLong' : '';
    }

    function shouldShowNifField() {
        return i18n.getLanguage() === 'pt';
    }

    function syncGuestCounts() {
        state.adultCount = readCount(elements.adultCount, 1, 1);
        if (elements.adultCount.value !== String(state.adultCount)) {
            elements.adultCount.value = String(state.adultCount);
        }
        state.childCount = readCount(elements.childCount, 0);
        state.babyCount = readCount(elements.babyCount, 0);
        state.babyBed = elements.babyBed.checked ? 1 : 0;
        state.extraBed = elements.extraBed.checked ? 1 : 0;
    }

    function buildBookingPayload() {
        syncGuestCounts();
        return {
            name: elements.guestName.value.trim(),
            email: elements.guestEmail.value.trim(),
            phone: elements.guestPhone.value.trim(),
            nifNumber: shouldShowNifField() ? elements.guestNifNumber.value.trim() : '',
            note: elements.guestNote.value.trim(),
            street: elements.guestStreet.value.trim(),
            houseNumber: elements.guestHouseNumber.value.trim(),
            postalCode: elements.guestPostalCode.value.trim(),
            city: elements.guestCity.value.trim(),
            country: elements.guestCountry.value.trim(),
            checkin: state.checkin,
            checkout: state.checkout,
            selectedRoomIds: [...state.selectedRoomIds],
            adultCount: state.adultCount,
            childCount: state.childCount,
            babyCount: state.babyCount,
            babyBed: state.babyBed,
            extraBed: state.extraBed,
            language: i18n.getLanguage(),
            savedAt: new Date().toISOString()
        };
    }

    function saveBookingDraft(payload = buildBookingPayload()) {
        try {
            window.sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(payload));
        } catch {
            // Session storage can be unavailable in private browsing modes.
        }
    }

    function restoreBookingDraft() {
        let draft = null;
        try {
            draft = JSON.parse(window.sessionStorage.getItem(BOOKING_DRAFT_KEY) || 'null');
        } catch {
            window.sessionStorage.removeItem(BOOKING_DRAFT_KEY);
            return;
        }

        if (!draft || typeof draft !== 'object') {
            return;
        }

        elements.guestName.value = draft.name || draft.guestName || '';
        elements.guestEmail.value = draft.email || draft.guestEmail || '';
        elements.guestPhone.value = draft.phone || draft.guestPhone || '';
        elements.guestNifNumber.value = draft.nifNumber || '';
        elements.guestNote.value = draft.note || '';
        elements.guestStreet.value = draft.street || '';
        elements.guestHouseNumber.value = draft.houseNumber || '';
        elements.guestPostalCode.value = draft.postalCode || '';
        elements.guestCity.value = draft.city || '';
        elements.guestCountry.value = draft.country || '';
        elements.adultCount.value = String(readDraftCount(draft.adultCount, 2));
        elements.childCount.value = String(readDraftCount(draft.childCount, 0));
        elements.babyCount.value = String(readDraftCount(draft.babyCount, 0));
        elements.babyBed.checked = Number(draft.babyBed || 0) > 0 || draft.babyBed === true;
        elements.extraBed.checked = Number(draft.extraBed || 0) > 0 || draft.extraBed === true;

        if (isIsoDate(draft.checkin) && isIsoDate(draft.checkout)) {
            state.checkin = draft.checkin;
            state.checkout = draft.checkout;
            state.calendarMonth = clampCalendarMonthKey(state.checkin.slice(0, 7));
            datePicker?.setDate([state.checkin, state.checkout], false);
        }

        const selectedRoomIds = Array.isArray(draft.selectedRoomIds)
            ? draft.selectedRoomIds
            : Array.isArray(draft.selectedRooms)
                ? draft.selectedRooms.map((room) => room.id)
                : [];
        state.selectedRoomIds = new Set(selectedRoomIds.filter(Boolean));
        syncGuestCounts();
        renderSummary();
    }

    function readDraftCount(value, fallback) {
        const number = Number.parseInt(value, 10);
        return Number.isFinite(number) ? Math.max(0, number) : fallback;
    }

    function isIsoDate(value) {
        return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
    }

    function readCount(input, fallback, minimum = 0) {
        const value = Number.parseInt(input.value, 10);
        return Number.isFinite(value) ? Math.max(minimum, value) : fallback;
    }

    function syncNifVisibility() {
        const showNif = shouldShowNifField();
        elements.guestNifField.classList.toggle('hidden', !showNif);
        if (!showNif) {
            clearFieldError(elements.guestNifNumberError);
        }
    }

    function setButtonLoading(isLoading) {
        elements.continueButton.disabled = isLoading;
        elements.continueButton.textContent = isLoading ? i18n.t('booking.continueLoading') : i18n.t('booking.continueButton');
    }

    function showStatus(element, message, isError = false) {
        element.textContent = message;
        element.classList.remove('hidden', 'is-error');
        element.classList.toggle('is-error', isError);
    }

    function hideStatus(element) {
        element.textContent = '';
        element.classList.add('hidden');
        element.classList.remove('is-error');
    }

    function showFieldError(element, translationKey) {
        element.dataset.errorKey = translationKey;
        element.textContent = i18n.t(translationKey);
        element.classList.remove('hidden');
        const field = element.closest('.field');
        field?.classList.add('is-invalid');
        field?.querySelector('input, textarea, select')?.setAttribute('aria-invalid', 'true');
    }

    function clearFieldError(element) {
        element.textContent = '';
        delete element.dataset.errorKey;
        element.classList.add('hidden');
        const field = element.closest('.field');
        field?.classList.remove('is-invalid');
        field?.querySelector('input, textarea, select')?.removeAttribute('aria-invalid');
    }

    function updateVisibleFieldError(element, translationKey) {
        if (!translationKey) {
            clearFieldError(element);
            return;
        }

        if (!element.classList.contains('hidden')) {
            showFieldError(element, translationKey);
        }
    }

    function updateVisibleGuestCountErrors() {
        updateVisibleFieldError(elements.adultCountError, getAdultCountErrorKey());
        updateVisibleFieldError(elements.extraBedError, getExtraBedErrorKey());
        updateVisibleFieldError(elements.babyBedError, getBabyBedErrorKey());
    }

    function translateVisibleFieldErrors() {
        document.querySelectorAll('.field-error:not(.hidden)[data-error-key]').forEach((element) => {
            element.textContent = i18n.t(element.dataset.errorKey);
        });
    }

    function extractError(data, fallbackKey) {
        if (data && typeof data.message === 'string') {
            return data.message;
        }
        return i18n.t(fallbackKey);
    }

    function toIsoDate(value) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

    function formatFriendlyDate(value) {
    const [year, month, day] = value.split('-').map(Number);

    return new Intl.DateTimeFormat(i18n.getLocale(), {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(new Date(year, month - 1, day));
}

    function formatMonthKey(date) {
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    }

    function shiftMonthKey(monthKey, delta) {
        const [year, month] = monthKey.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1 + delta, 1));
        return formatMonthKey(date);
    }

    function formatMonthLabel(monthKey) {
        const [year, month] = monthKey.split('-').map(Number);
        return new Intl.DateTimeFormat(i18n.getLocale(), {
            month: 'long',
            year: 'numeric'
        }).format(new Date(Date.UTC(year, month - 1, 1)));
    }

    function syncCalendarControls() {
        const [year, month] = state.calendarMonth.split('-');
        populateCalendarMonthOptions(Number(year));
        populateCalendarYearOptions(Number(year));
        elements.calendarMonthSelect.value = month;
        elements.calendarYearSelect.value = year;
        elements.calendarToday.disabled = state.calendarMonth === currentMonthKey;
        elements.calendarPrev.disabled = state.calendarMonth === currentMonthKey;
    }

    function populateCalendarMonthOptions(selectedYear) {
        const selectedMonth = elements.calendarMonthSelect.value;
        const currentYear = new Date().getUTCFullYear();
        const currentMonth = new Date().getUTCMonth() + 1;
        const startMonth = selectedYear === currentYear ? currentMonth : 1;

        elements.calendarMonthSelect.innerHTML = Array.from({ length: 12 - startMonth + 1 }, (_, index) => {
            const monthIndex = startMonth + index;
            const value = String(monthIndex).padStart(2, '0');
            const label = new Intl.DateTimeFormat(i18n.getLocale(), { month: 'long' }).format(new Date(Date.UTC(2026, monthIndex - 1, 1)));
            return `<option value="${value}">${escapeHtml(capitalize(label))}</option>`;
        }).join('');

        if (selectedMonth && [...elements.calendarMonthSelect.options].some((option) => option.value === selectedMonth)) {
            elements.calendarMonthSelect.value = selectedMonth;
        } else {
            elements.calendarMonthSelect.value = elements.calendarMonthSelect.options[0]?.value || '';
        }
    }

    function populateCalendarYearOptions(selectedYear) {
        const currentYear = new Date().getUTCFullYear();
        const years = new Set([currentYear, currentYear + 1, currentYear + 2, selectedYear, selectedYear + 1]);
        const sortedYears = [...years].filter(Boolean).sort((left, right) => left - right);
        elements.calendarYearSelect.innerHTML = sortedYears.map((year) => `<option value="${year}">${year}</option>`).join('');
    }

    function clampCalendarMonthKey(monthKey) {
        return compareMonthKeys(monthKey, currentMonthKey) < 0 ? currentMonthKey : monthKey;
    }

    function compareMonthKeys(left, right) {
        return left.localeCompare(right);
    }

   function formatCalendarDayLabel(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
        return {
            weekday: new Intl.DateTimeFormat(i18n.getLocale(), { weekday: 'short' }).format(date).replace('.', ''),
            day: new Intl.DateTimeFormat(i18n.getLocale(), { day: '2-digit' }).format(date)
        };
    }

    function updateDatePickerPresentation() {
        if (!datePicker) {
            return;
        }

        datePicker.set('locale', getFlatpickrLocale(i18n.getLanguage()));
        if (state.checkin && state.checkout) {
            datePicker.setDate([state.checkin, state.checkout], true);
        }
        if (datePicker.altInput) {
            datePicker.altInput.placeholder = i18n.t('booking.stayRangePlaceholder');
        }
    }

    function getFlatpickrLocale(language) {
        const locales = {
            nl: {
                weekdays: { shorthand: ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'], longhand: ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'] },
                months: { shorthand: ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'], longhand: ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'] },
                firstDayOfWeek: 1,
                rangeSeparator: ' - '
            },
            en: {
                weekdays: { shorthand: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], longhand: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
                months: { shorthand: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], longhand: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] },
                firstDayOfWeek: 1,
                rangeSeparator: ' - '
            },
            pt: {
                weekdays: { shorthand: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'], longhand: ['domingo', 'segunda-feira', 'terca-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sabado'] },
                months: { shorthand: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'], longhand: ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'] },
                firstDayOfWeek: 1,
                rangeSeparator: ' - '
            },
            es: {
                weekdays: { shorthand: ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'], longhand: ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] },
                months: { shorthand: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], longhand: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'] },
                firstDayOfWeek: 1,
                rangeSeparator: ' - '
            },
            fr: {
                weekdays: { shorthand: ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'], longhand: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] },
                months: { shorthand: ['jan', 'fev', 'mar', 'avr', 'mai', 'jun', 'jul', 'aou', 'sep', 'oct', 'nov', 'dec'], longhand: ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'] },
                firstDayOfWeek: 1,
                rangeSeparator: ' - '
            },
            de: {
                weekdays: { shorthand: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'], longhand: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'] },
                months: { shorthand: ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'], longhand: ['Januar', 'Februar', 'Marz', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'] },
                firstDayOfWeek: 1,
                rangeSeparator: ' - '
            }
        };

        return locales[language] || locales.nl;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function capitalize(value) {
        return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
    }
})();