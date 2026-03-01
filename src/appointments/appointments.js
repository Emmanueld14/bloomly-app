/**
 * Bloomly Appointments - Booking Experience
 */
(function() {
    'use strict';

    const container = document.querySelector('[data-appointments-dates]');
    if (!container) return;

    const state = {
        settings: null,
        blackouts: [],
        dateOverrides: {},
        bookings: [],
        selectedDate: null,
        selectedTime: null,
        loading: false,
        weekOffset: 0
    };

    const elements = {
        dates: container,
        slots: document.querySelector('[data-appointments-slots]'),
        status: document.querySelector('[data-appointments-status]'),
        weekLabel: document.querySelector('[data-appointments-week-label]'),
        weekPrev: document.querySelector('[data-appointments-week-prev]'),
        weekNext: document.querySelector('[data-appointments-week-next]'),
        price: document.querySelector('[data-appointments-price]'),
        summary: document.querySelector('[data-appointments-summary]'),
        form: document.querySelector('[data-appointments-form]'),
        message: document.querySelector('[data-appointments-message]'),
        submit: document.querySelector('[data-appointments-submit]')
    };

    const MAX_WEEKS_AHEAD = 8;
    const MAX_LOOKAHEAD_DAYS = (MAX_WEEKS_AHEAD + 1) * 7;
    const DATE_OPTIONS = { weekday: 'short', month: 'short', day: 'numeric' };
    const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    function toDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function parseDateKey(key) {
        const [year, month, day] = key.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    function startOfDay(date) {
        const copy = new Date(date);
        copy.setHours(0, 0, 0, 0);
        return copy;
    }

    function addDays(date, days) {
        const copy = new Date(date);
        copy.setDate(copy.getDate() + days);
        return copy;
    }

    function startOfWeek(date) {
        const day = date.getDay();
        const offset = (day + 6) % 7; // Monday-first week
        return startOfDay(addDays(date, -offset));
    }

    function isPastDate(dateKey) {
        const today = startOfDay(new Date());
        return startOfDay(parseDateKey(dateKey)) < today;
    }

    function getVisibleWeekStart() {
        const today = startOfDay(new Date());
        const firstWeek = startOfWeek(today);
        return addDays(firstWeek, state.weekOffset * 7);
    }

    function getVisibleWeekDates() {
        const weekStart = getVisibleWeekStart();
        return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
    }

    function formatWeekRangeLabel(weekStart) {
        const weekEnd = addDays(weekStart, 6);
        const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
        const sameYear = weekStart.getFullYear() === weekEnd.getFullYear();

        if (sameMonth && sameYear) {
            const monthLabel = weekStart.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
            return `${monthLabel} ${weekStart.getDate()} - ${weekEnd.getDate()}`;
        }

        const startLabel = weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const endLabel = weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        return `${startLabel} - ${endLabel}`;
    }

    function formatCurrency(amountCents, currency) {
        const amount = Number(amountCents || 0) / 100;
        const code = currency || 'USD';
        try {
            return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(amount);
        } catch (error) {
            return `${amount.toFixed(2)} ${code}`;
        }
    }

    function setMessage(text, type) {
        if (!elements.message) return;
        elements.message.textContent = text || '';
        elements.message.classList.remove('is-error', 'is-success');
        if (type === 'error') {
            elements.message.classList.add('is-error');
        }
        if (type === 'success') {
            elements.message.classList.add('is-success');
        }
    }

    function setStatus(text) {
        if (!elements.status) return;
        elements.status.textContent = text || '';
    }

    function setLoading(isLoading) {
        state.loading = isLoading;
        if (elements.submit) {
            elements.submit.textContent = isLoading ? 'Processing...' : 'Pay booking fee';
        }
        if (elements.message && isLoading) {
            setMessage('Preparing your booking...', null);
        }
        updateSubmitState();
    }

    function updateSubmitState() {
        if (!elements.submit) return;
        const ready = Boolean(
            !state.loading &&
            state.settings?.bookingEnabled &&
            state.selectedDate &&
            state.selectedTime
        );
        elements.submit.disabled = !ready;
    }

    function updatePriceLabel() {
        if (!elements.price) return;
        if (!state.settings) {
            elements.price.textContent = 'Loading price...';
            return;
        }
        const formatted = formatCurrency(state.settings.priceCents, state.settings.currency);
        elements.price.textContent = `Booking fee: ${formatted}`;
    }

    function getDayKey(dateKey) {
        const date = parseDateKey(dateKey);
        return DAY_KEYS[date.getDay()];
    }

    function isBlackout(dateKey) {
        return state.blackouts.includes(dateKey);
    }

    function getDateOverride(dateKey) {
        return state.dateOverrides?.[dateKey] || null;
    }

    function getSlotsForDate(dateKey) {
        const override = getDateOverride(dateKey);
        if (override) {
            return (override.timeSlots || []).filter(Boolean);
        }
        const dayKey = getDayKey(dateKey);
        const slots = state.settings?.timeSlots?.[dayKey] || [];
        return slots.filter(Boolean);
    }

    function getBookedSlots(dateKey) {
        return state.bookings
            .filter((booking) => booking.date === dateKey)
            .map((booking) => booking.time);
    }

    function getOpenSlots(dateKey) {
        const slots = getSlotsForDate(dateKey);
        if (!slots.length) return [];
        const booked = new Set(getBookedSlots(dateKey));
        return slots.filter((slot) => !booked.has(slot));
    }

    function hasAvailableSlots(dateKey) {
        if (!state.settings?.bookingEnabled) return false;
        if (isPastDate(dateKey)) return false;
        if (isBlackout(dateKey)) return false;

        const override = getDateOverride(dateKey);
        if (!override && !state.settings?.availableDays?.includes(getDayKey(dateKey))) {
            return false;
        }

        return getOpenSlots(dateKey).length > 0;
    }

    function renderDates() {
        if (!elements.dates) return;
        elements.dates.innerHTML = '';
        const fragment = document.createDocumentFragment();
        const weekStart = getVisibleWeekStart();
        const weekDates = getVisibleWeekDates();

        if (elements.weekLabel) {
            elements.weekLabel.textContent = formatWeekRangeLabel(weekStart);
        }
        if (elements.weekPrev) {
            elements.weekPrev.disabled = state.weekOffset <= 0;
        }
        if (elements.weekNext) {
            elements.weekNext.disabled = state.weekOffset >= MAX_WEEKS_AHEAD;
        }

        const availableDateKeys = [];
        weekDates.forEach((date) => {
            const dateKey = toDateKey(date);
            if (!hasAvailableSlots(dateKey)) return;
            const openSlots = getOpenSlots(dateKey);
            availableDateKeys.push(dateKey);

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'appointments-date-button';
            button.dataset.date = dateKey;
            button.innerHTML = `
                <span class="appointments-date-day">${date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                <span class="appointments-date-number">${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                <span class="appointments-date-meta">${openSlots.length} slot${openSlots.length === 1 ? '' : 's'} available</span>
            `;

            if (state.selectedDate === dateKey) {
                button.classList.add('is-active');
            }

            button.addEventListener('click', () => {
                state.selectedDate = dateKey;
                state.selectedTime = null;
                renderDates();
                renderSlots();
                updateSummary();
            });

            fragment.appendChild(button);
        });

        if (state.selectedDate && !availableDateKeys.includes(state.selectedDate)) {
            state.selectedDate = null;
            state.selectedTime = null;
        }

        if (!availableDateKeys.length) {
            const emptyState = document.createElement('div');
            emptyState.className = 'appointments-date-empty';
            emptyState.textContent = 'No available dates this week. Try next week.';
            fragment.appendChild(emptyState);
        }

        elements.dates.appendChild(fragment);
    }

    function renderSlots() {
        if (!elements.slots) return;
        elements.slots.innerHTML = '';

        if (!state.selectedDate) {
            elements.slots.textContent = 'Select a date to see time slots.';
            return;
        }

        const slots = getSlotsForDate(state.selectedDate);
        if (!slots.length) {
            elements.slots.textContent = 'No slots available for this day.';
            return;
        }

        const booked = new Set(getBookedSlots(state.selectedDate));
        const fragment = document.createDocumentFragment();

        slots.forEach((slot) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'appointments-slot-button';
            button.dataset.time = slot;
            button.textContent = slot;

            if (booked.has(slot) || !state.settings?.bookingEnabled) {
                button.classList.add('is-disabled');
                button.disabled = true;
            }

            if (state.selectedTime === slot) {
                button.classList.add('is-active');
            }

            button.addEventListener('click', () => {
                state.selectedTime = slot;
                renderSlots();
                updateSummary();
            });

            fragment.appendChild(button);
        });

        elements.slots.appendChild(fragment);
    }

    function updateSummary() {
        if (!elements.summary) return;
        if (!state.settings?.bookingEnabled) {
            elements.summary.textContent = 'Charla sessions are currently closed. Please check back soon.';
            updateSubmitState();
            return;
        }
        if (!state.selectedDate || !state.selectedTime) {
            elements.summary.textContent = 'Select a date and time to continue.';
            updateSubmitState();
            return;
        }
        const dateLabel = parseDateKey(state.selectedDate).toLocaleDateString(undefined, DATE_OPTIONS);
        const price = formatCurrency(state.settings.priceCents, state.settings.currency);
        elements.summary.textContent = `Selected: ${dateLabel} at ${state.selectedTime}. Booking fee: ${price}.`;
        updateSubmitState();
    }

    function clearSelections() {
        state.selectedDate = null;
        state.selectedTime = null;
    }

    async function fetchAvailability(options = {}) {
        setStatus('Loading availability...');
        try {
            const start = toDateKey(new Date());
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + MAX_LOOKAHEAD_DAYS);
            const end = toDateKey(endDate);

            const response = await fetch(`/api/appointments-availability?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
            if (!response.ok) {
                throw new Error('Unable to load Charla availability.');
            }
            const payload = await response.json();
            state.settings = payload.settings;
            state.blackouts = payload.blackouts || [];
            state.dateOverrides = Array.isArray(payload.dateOverrides)
                ? payload.dateOverrides.reduce((map, entry) => {
                    const date = String(entry?.date || '').trim();
                    if (!date) return map;
                    const rawSlots = entry?.timeSlots ?? entry?.time_slots ?? [];
                    const slots = Array.isArray(rawSlots)
                        ? rawSlots.filter(Boolean)
                        : [];
                    map[date] = { date, timeSlots: slots };
                    return map;
                }, {})
                : {};
            state.bookings = payload.bookings || [];
            updatePriceLabel();

            if (!state.settings?.bookingEnabled) {
                setStatus('Charla sessions are currently closed.');
            } else {
                setStatus('Choose a date that works for you.');
            }

            if (!options.preserveSelection) {
                clearSelections();
            }
            renderDates();
            renderSlots();
            updateSummary();
        } catch (error) {
            console.error('Charla availability error', error);
            setStatus('Charla sessions are currently unavailable. Please try again soon.');
            updateSubmitState();
        }
    }

    async function handleBooking(event) {
        event.preventDefault();
        if (!state.settings?.bookingEnabled) {
            setMessage('Charla sessions are currently closed.', 'error');
            return;
        }
        if (!state.selectedDate || !state.selectedTime) {
            setMessage('Please select a date and time.', 'error');
            return;
        }

        const formData = new FormData(event.target);
        const name = String(formData.get('name') || '').trim();
        const email = String(formData.get('email') || '').trim();
        const purpose = String(formData.get('purpose') || '').trim();

        if (!name || !email || !purpose) {
            setMessage('Please complete all required fields.', 'error');
            return;
        }

        setLoading(true);
        setMessage('Preparing your Charla booking...', null);

        try {
            const response = await fetch('/api/appointments-book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    purpose,
                    date: state.selectedDate,
                    time: state.selectedTime
                })
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.error || 'Unable to start booking.');
            }

            if (result.paymentUrl) {
                window.location.href = result.paymentUrl;
                return;
            }

            if (result.checkoutUrl) {
                window.location.href = result.checkoutUrl;
                return;
            }

            throw new Error('Payment session could not be created.');
        } catch (error) {
            console.error('Booking error', error);
            setMessage(error.message || 'Unable to start booking. Please try again.', 'error');
            setLoading(false);
        }
    }

    async function confirmBooking(sessionId) {
        if (!sessionId) return;
        setLoading(true);
        setMessage('Confirming your payment...', null);
        try {
            const response = await fetch('/api/appointments-confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.error || 'Unable to confirm Charla.');
            }

            if (result.booking) {
                const dateLabel = parseDateKey(result.booking.date).toLocaleDateString(undefined, DATE_OPTIONS);
                setMessage(`Charla session confirmed for ${dateLabel} at ${result.booking.time}.`, 'success');
                state.selectedDate = result.booking.date;
                state.selectedTime = result.booking.time;
                updateSummary();
                await fetchAvailability({ preserveSelection: true });
            } else {
                setMessage('Payment confirmed. We will email your Charla details shortly.', 'success');
            }
        } catch (error) {
            console.error('Payment confirmation error', error);
            setMessage(error.message || 'Payment confirmation failed. Please contact support.', 'error');
        } finally {
            setLoading(false);
        }
    }

    function handleReturnParams() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('canceled') === '1') {
            setMessage('Payment was canceled. Your slot was not booked.', 'error');
        }
        const success = params.get('success') === '1';
        const sessionId = params.get('session_id');
        if (success && sessionId) {
            confirmBooking(sessionId);
        }
    }

    function changeWeek(delta) {
        const next = state.weekOffset + delta;
        if (next < 0 || next > MAX_WEEKS_AHEAD) return;
        state.weekOffset = next;
        renderDates();
        renderSlots();
        updateSummary();
    }

    if (elements.weekPrev) {
        elements.weekPrev.addEventListener('click', () => changeWeek(-1));
    }
    if (elements.weekNext) {
        elements.weekNext.addEventListener('click', () => changeWeek(1));
    }

    if (elements.form) {
        elements.form.addEventListener('submit', handleBooking);
    }

    updatePriceLabel();
    fetchAvailability();
    handleReturnParams();
})();
