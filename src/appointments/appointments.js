/**
 * Bloomly Appointments - Booking Experience
 */
(function() {
    'use strict';

    const container = document.querySelector('[data-appointments-dates]');
    if (!container) return;

    const appointmentsConfig = window.APPOINTMENTS_PUBLIC_CONFIG || window.APPOINTMENTS_CONFIG || {};
    const apiBase = String(appointmentsConfig.apiBase || '/api').replace(/\/$/, '');

    const state = {
        settings: null,
        blackouts: [],
        dateOverrides: {},
        bookings: [],
        selectedDate: null,
        selectedTime: null,
        loading: false
    };

    const elements = {
        dates: container,
        slots: document.querySelector('[data-appointments-slots]'),
        status: document.querySelector('[data-appointments-status]'),
        price: document.querySelector('[data-appointments-price]'),
        summary: document.querySelector('[data-appointments-summary]'),
        form: document.querySelector('[data-appointments-form]'),
        message: document.querySelector('[data-appointments-message]'),
        submit: document.querySelector('[data-appointments-submit]')
    };

    const MAX_LOOKAHEAD_DAYS = 30;
    const DATE_OPTIONS = { weekday: 'short', month: 'short', day: 'numeric' };
    const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    function buildApiUrl(path) {
        const normalizedPath = String(path || '').replace(/^\/+/, '');
        return `${apiBase}/${normalizedPath}`;
    }

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

    function hasAvailableSlots(dateKey) {
        if (!state.settings?.bookingEnabled) return false;
        if (isBlackout(dateKey)) return false;

        const override = getDateOverride(dateKey);
        if (!override && !state.settings?.availableDays?.includes(getDayKey(dateKey))) {
            return false;
        }

        const slots = getSlotsForDate(dateKey);
        if (!slots.length) return false;
        const booked = new Set(getBookedSlots(dateKey));
        return slots.some((slot) => !booked.has(slot));
    }

    function renderDates() {
        if (!elements.dates) return;
        elements.dates.innerHTML = '';

        const today = new Date();
        const fragment = document.createDocumentFragment();

        for (let i = 0; i < MAX_LOOKAHEAD_DAYS; i += 1) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateKey = toDateKey(date);

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'appointments-date-button';
            button.dataset.date = dateKey;
            button.textContent = date.toLocaleDateString(undefined, DATE_OPTIONS);

            const available = hasAvailableSlots(dateKey);
            if (!available) {
                button.classList.add('is-disabled');
                button.disabled = true;
            }

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

            const response = await fetch(
                `${buildApiUrl('appointments-availability')}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
            );
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
            const response = await fetch(buildApiUrl('appointments-book'), {
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
            if (result.booking) {
                const dateLabel = parseDateKey(result.booking.date).toLocaleDateString(undefined, DATE_OPTIONS);
                setMessage(
                    result.message || `Charla session confirmed for ${dateLabel} at ${result.booking.time}.`,
                    'success'
                );
                state.selectedDate = result.booking.date;
                state.selectedTime = result.booking.time;
                updateSummary();
                await fetchAvailability({ preserveSelection: true });
                setLoading(false);
                if (elements.form && typeof elements.form.reset === 'function') {
                    elements.form.reset();
                }
                return;
            }

            throw new Error('Booking response was incomplete.');
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
            const response = await fetch(buildApiUrl('appointments-confirm'), {
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

    if (elements.form) {
        elements.form.addEventListener('submit', handleBooking);
    }

    updatePriceLabel();
    fetchAvailability();
    handleReturnParams();
})();
