(function () {
    const i18n = window.CSLI18N;
    const currentMonthKey = formatMonthKey(new Date());

    const state = {
        settings: null,
        checkin: '',
        checkout: '',
        babyBed: false,
        extraBed: false,
        availability: [],
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
        babyBed: document.getElementById('babyBed'),
        extraBed: document.getElementById('extraBed'),
        availabilityStatus: document.getElementById('availabilityStatus'),
        roomGrid: document.getElementById('roomGrid'),
        roomSelectionError: document.getElementById('roomSelectionError'),
        roomsMeta: document.getElementById('roomsMeta'),
        guestName: document.getElementById('guestName'),
        guestEmail: document.getElementById('guestEmail'),
        guestPhone: document.getElementById('guestPhone'),
        guestStreet: document.getElementById('guestStreet'),
        guestHouseNumber: document.getElementById('guestHouseNumber'),
        guestPostalCode: document.getElementById('guestPostalCode'),
        guestCity: document.getElementById('guestCity'),
        guestCountry: document.getElementById('guestCountry'),
        guestNote: document.getElementById('guestNote'),
        guestNameError: document.getElementById('guestNameError'),
        guestEmailError: document.getElementById('guestEmailError'),
        guestPhoneError: document.getElementById('guestPhoneError'),
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
        summaryStayPrice: document.getElementById('summaryStayPrice'),
        summaryExtras: document.getElementById('summaryExtras'),
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
        void loadInitialData();
    });

    window.addEventListener('csl:languagechange', () => {
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
                    void refreshAvailability();
                    void loadCalendar();
                }
            }
        });

        updateDatePickerPresentation();
    }

    function wireEvents() {
        elements.babyBed.addEventListener('change', () => {
            state.babyBed = elements.babyBed.checked;
            renderSummary();
        });

        elements.extraBed.addEventListener('change', () => {
            state.extraBed = elements.extraBed.checked;
            if (state.checkin && state.checkout) {
                void refreshAvailability();
            }
            renderSummary();
        });

        [elements.guestName, elements.guestCity, elements.guestPhone].forEach((input) => {
            input.addEventListener('input', () => renderSummary());
        });

        elements.bookingForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!validateForm()) {
                return;
            }

            const payload = {
                name: elements.guestName.value.trim(),
                email: elements.guestEmail.value.trim(),
                phone: elements.guestPhone.value.trim(),
                note: elements.guestNote.value.trim(),
                street: elements.guestStreet.value.trim(),
                houseNumber: elements.guestHouseNumber.value.trim(),
                postalCode: elements.guestPostalCode.value.trim(),
                city: elements.guestCity.value.trim(),
                country: elements.guestCountry.value.trim(),
                checkin: state.checkin,
                checkout: state.checkout,
                selectedRoomIds: [...state.selectedRoomIds],
                babyBed: state.babyBed,
                extraBed: state.extraBed
            };

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
                    checkoutUrl: data.checkoutUrl || null
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
            await loadCalendar();
            renderAvailability();
            renderSummary();
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
                extraBed: String(state.extraBed)
            });
            const response = await fetch(`/api/public/availability?${params.toString()}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(extractError(data, 'booking.errors.unavailable'));
            }

            state.availability = data.rooms;
            const availableIds = new Set(data.rooms.filter((room) => room.isAvailable).map((room) => room.id));
            state.selectedRoomIds = new Set([...state.selectedRoomIds].filter((roomId) => availableIds.has(roomId)));
            hideStatus(elements.availabilityStatus);
        } catch (error) {
            state.availability = [];
            state.selectedRoomIds.clear();
            showStatus(elements.availabilityStatus, error.message || i18n.t('booking.errors.generic'), true);
        } finally {
            state.loadingAvailability = false;
            renderAvailability();
            renderSummary();
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
                    <span>${i18n.t(room.isAvailable ? 'booking.roomAvailable' : 'booking.roomUnavailable')}</span>
                    <strong>${i18n.formatCurrency(room.totalPriceCents)}</strong>
                </span>
                <span class="room-card-bottom">
                    ${i18n.t('booking.roomNightRate', { price: i18n.formatCurrency(room.firstNightPriceCents) })}
                </span>
            `;

            card.addEventListener('click', () => {
                if (state.selectedRoomIds.has(room.id)) {
                    state.selectedRoomIds.delete(room.id);
                } else {
                    state.selectedRoomIds.add(room.id);
                }

                clearFieldError(elements.roomSelectionError);
                renderAvailability();
                renderSummary();
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

        const stayPrice = selectedRooms.reduce((sum, room) => sum + room.stayPriceCents, 0);
        const extrasPrice = selectedRooms.reduce((sum, room) => sum + room.extrasPriceCents, 0);
        const totalPrice = selectedRooms.reduce((sum, room) => sum + room.totalPriceCents, 0);
        const nights = selectedRooms[0]?.nights || 0;
        const guestSummary = [elements.guestName.value.trim(), elements.guestPhone.value.trim(), elements.guestCity.value.trim()].filter(Boolean).join(' · ');

        elements.summaryEmpty.classList.add('hidden');
        elements.summaryCard.classList.remove('hidden');
        elements.summaryStay.textContent = `${formatFriendlyDate(state.checkin)} - ${formatFriendlyDate(state.checkout)} · ${i18n.t('booking.summaryNights', { nights })}`;
        elements.summaryRooms.textContent = selectedRooms.map((room) => room.name).join(', ');
        elements.summaryGuest.textContent = guestSummary || '—';
        elements.summaryStayPrice.textContent = i18n.formatCurrency(stayPrice);
        elements.summaryExtras.textContent = i18n.formatCurrency(extrasPrice);
        elements.summaryTotal.textContent = i18n.formatCurrency(totalPrice);
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
            const cells = room.days.map((day) => `<div class="calendar-day-cell day-${day.status}" title="${escapeHtml(room.name)} ${day.date} ${i18n.formatCurrency(day.priceCents)}"></div>`).join('');
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
        clearFieldError(elements.guestNameError);
        clearFieldError(elements.guestEmailError);
        clearFieldError(elements.guestPhoneError);
        clearFieldError(elements.guestStreetError);
        clearFieldError(elements.guestHouseNumberError);
        clearFieldError(elements.guestPostalCodeError);
        clearFieldError(elements.guestCityError);
        clearFieldError(elements.guestCountryError);
        clearFieldError(elements.guestNoteError);

        if (!state.checkin || !state.checkout) {
            showFieldError(elements.stayRangeError, i18n.t('booking.validation.stayRequired'));
            valid = false;
        }

        if (!state.selectedRoomIds.size) {
            showFieldError(elements.roomSelectionError, i18n.t('booking.validation.roomsRequired'));
            valid = false;
        }

        if (elements.guestName.value.trim().length < 2) {
            showFieldError(elements.guestNameError, i18n.t('booking.validation.nameRequired'));
            valid = false;
        }

        const email = elements.guestEmail.value.trim();
        if (!email) {
            showFieldError(elements.guestEmailError, i18n.t('booking.validation.emailRequired'));
            valid = false;
        } else if (!/^\S+@\S+\.\S+$/.test(email)) {
            showFieldError(elements.guestEmailError, i18n.t('booking.validation.emailInvalid'));
            valid = false;
        }

        const phone = elements.guestPhone.value.trim();
        if (!phone) {
            showFieldError(elements.guestPhoneError, i18n.t('booking.validation.phoneRequired'));
            valid = false;
        } else if (!/^[+\d][\d\s()/-]{5,}$/.test(phone)) {
            showFieldError(elements.guestPhoneError, i18n.t('booking.validation.phoneInvalid'));
            valid = false;
        }

        if (elements.guestStreet.value.trim().length < 2) {
            showFieldError(elements.guestStreetError, i18n.t('booking.validation.streetRequired'));
            valid = false;
        }

        if (!elements.guestHouseNumber.value.trim()) {
            showFieldError(elements.guestHouseNumberError, i18n.t('booking.validation.houseNumberRequired'));
            valid = false;
        }

        if (elements.guestPostalCode.value.trim().length < 2) {
            showFieldError(elements.guestPostalCodeError, i18n.t('booking.validation.postalCodeRequired'));
            valid = false;
        }

        if (elements.guestCity.value.trim().length < 2) {
            showFieldError(elements.guestCityError, i18n.t('booking.validation.cityRequired'));
            valid = false;
        }

        if (elements.guestCountry.value.trim().length < 2) {
            showFieldError(elements.guestCountryError, i18n.t('booking.validation.countryRequired'));
            valid = false;
        }

        if (elements.guestNote.value.trim().length > 1000) {
            showFieldError(elements.guestNoteError, i18n.t('booking.validation.noteLong'));
            valid = false;
        }

        return valid;
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

    function showFieldError(element, message) {
        element.textContent = message;
        element.classList.remove('hidden');
    }

    function clearFieldError(element) {
        element.textContent = '';
        element.classList.add('hidden');
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