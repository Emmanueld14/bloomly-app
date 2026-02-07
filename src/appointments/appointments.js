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
        bookings: [],
        selectedDate: null,
        selectedTime: null,
        loading: false,
        crisisLocked: false
    };

    const elements = {
        dates: container,
        slots: document.querySelector('[data-appointments-slots]'),
        status: document.querySelector('[data-appointments-status]'),
        price: document.querySelector('[data-appointments-price]'),
        summary: document.querySelector('[data-appointments-summary]'),
        form: document.querySelector('[data-appointments-form]'),
        purpose: document.querySelector('[data-appointments-purpose]'),
        consentGroup: document.querySelector('[data-appointments-consent]'),
        consentCheckboxes: Array.from(document.querySelectorAll('[data-appointments-consent-checkbox]')),
        crisisAlert: document.querySelector('[data-appointments-crisis]'),
        crisisLink: document.querySelector('[data-appointments-crisis-link]'),
        message: document.querySelector('[data-appointments-message]'),
        submit: document.querySelector('[data-appointments-submit]')
    };

    const MAX_LOOKAHEAD_DAYS = 30;
    const DATE_OPTIONS = { weekday: 'short', month: 'short', day: 'numeric' };
    const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const CONSENT_KEYS = [
        'friendToFriend',
        'noGuarantees',
        'responsibility',
        'noProfessionalSupport',
        'termsAccepted'
    ];
    const CRISIS_REDIRECT_URL = '/appointments/crisis';
    const CRISIS_PATTERNS = [
        /\b(suicid|suicide|suicidal)\b/i,
        /\bself[-\s]?harm\b/i,
        /\bkill myself\b/i,
        /\bend my life\b/i,
        /\bwant to die\b/i,
        /\boverdose\b/i,
        /\bcrisis\b/i,
        /\bemergency\b/i,
        /\bimmediate help\b/i,
        /\burgent help\b/i,
        /\bcan'?t keep myself safe\b/i,
        /\bhurt myself\b/i
    ];
    const PROFESSIONAL_SEEKING_PATTERNS = [
        /\b(need|looking for|seek|seeking|want|require|request|would like)\b/i,
        /\b(therap(y|ist)|counsell(or|ing)|counsel(or|ing)|psychiatrist|psychologist|professional help|professional support|mental health support|medical help|medical advice|doctor|clinical support|emergency help)\b/i
    ];

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

    function getConsentState() {
        const consents = {};
        if (!elements.consentCheckboxes.length) return consents;
        elements.consentCheckboxes.forEach((checkbox) => {
            const key = checkbox.dataset.consentKey;
            if (key) {
                consents[key] = checkbox.checked;
            }
        });
        return consents;
    }

    function areConsentsAccepted(consents) {
        if (!elements.consentCheckboxes.length) return false;
        return CONSENT_KEYS.every((key) => Boolean(consents[key]));
    }

    function resetConsents() {
        if (!elements.consentCheckboxes.length) return;
        elements.consentCheckboxes.forEach((checkbox) => {
            checkbox.checked = false;
        });
    }

    function detectCrisisReason(text) {
        const value = String(text || '');
        if (!value) return null;
        const hasCrisisLanguage = CRISIS_PATTERNS.some((pattern) => pattern.test(value));
        if (hasCrisisLanguage) return 'crisis';
        const hasSeekingLanguage = PROFESSIONAL_SEEKING_PATTERNS.every((pattern) => pattern.test(value));
        if (hasSeekingLanguage) return 'professional';
        return null;
    }

    function lockForCrisis() {
        if (state.crisisLocked) return;
        state.crisisLocked = true;
        setLoading(false);
        if (elements.form) {
            elements.form.classList.add('is-blocked');
            const fields = elements.form.querySelectorAll('input, textarea, button, select');
            fields.forEach((field) => {
                field.disabled = true;
            });
        }
        if (elements.crisisAlert) {
            elements.crisisAlert.hidden = false;
        }
        if (elements.crisisLink) {
            window.setTimeout(() => {
                elements.crisisLink.focus();
            }, 0);
        }
        setMessage('', null);
        renderDates();
        renderSlots();
        updateSummary();
        updateSubmitState();
        window.setTimeout(() => {
            window.location.href = CRISIS_REDIRECT_URL;
        }, 1200);
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
        const consentsAccepted = areConsentsAccepted(getConsentState());
        const ready = Boolean(
            !state.loading &&
            state.settings?.bookingEnabled &&
            state.selectedDate &&
            state.selectedTime &&
            consentsAccepted &&
            !state.crisisLocked
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

    function getSlotsForDate(dateKey) {
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
        if (!state.settings?.availableDays?.includes(getDayKey(dateKey))) return false;
        if (isBlackout(dateKey)) return false;
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
            if (!available || state.crisisLocked) {
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

        if (state.crisisLocked) {
            elements.slots.textContent = 'Booking is unavailable for crisis or professional support.';
            return;
        }

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
        if (state.crisisLocked) {
            elements.summary.textContent = 'This booking cannot continue because the request indicates a need for crisis or professional support.';
            updateSubmitState();
            return;
        }
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
        resetConsents();
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
        if (state.crisisLocked) {
            lockForCrisis();
            return;
        }
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
        const consents = getConsentState();

        if (!name || !email || !purpose) {
            setMessage('Please complete all required fields.', 'error');
            return;
        }
        if (!areConsentsAccepted(consents)) {
            setMessage('Please confirm each required checkbox before continuing.', 'error');
            updateSubmitState();
            return;
        }

        if (detectCrisisReason(purpose)) {
            lockForCrisis();
            return;
        }

        setLoading(true);
        setMessage('Redirecting to secure payment...', null);

        try {
            const response = await fetch('/api/appointments-book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    purpose,
                    date: state.selectedDate,
                    time: state.selectedTime,
                    consents
                })
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (result?.crisis || result?.redirectUrl) {
                    lockForCrisis();
                    if (result.redirectUrl) {
                        window.location.href = result.redirectUrl;
                    }
                    return;
                }
                throw new Error(result.error || 'Unable to start booking.');
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
                resetConsents();
                updateSubmitState();
            } else {
                setMessage('Payment confirmed. We will email your Charla details shortly.', 'success');
                resetConsents();
                updateSubmitState();
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
            resetConsents();
            updateSubmitState();
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
    if (elements.purpose) {
        elements.purpose.addEventListener('input', (event) => {
            if (state.crisisLocked) return;
            if (detectCrisisReason(event.target.value)) {
                lockForCrisis();
            }
        });
    }
    if (elements.consentCheckboxes.length) {
        elements.consentCheckboxes.forEach((checkbox) => {
            checkbox.addEventListener('change', updateSubmitState);
        });
    }
    window.addEventListener('pageshow', () => {
        resetConsents();
        updateSubmitState();
    });

    updatePriceLabel();
    fetchAvailability();
    handleReturnParams();
})();
