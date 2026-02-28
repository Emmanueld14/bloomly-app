/**
 * Appointments Admin - Manage booking settings
 */
(function() {
    'use strict';

    const config = window.APPOINTMENTS_CONFIG || {};
    const form = document.getElementById('appointmentsSettingsForm');
    if (!form) {
        window.AppointmentsAdmin = { init: () => {} };
        return;
    }

    const elements = {
        enabled: document.getElementById('appointmentsEnabled'),
        price: document.getElementById('appointmentPrice'),
        currency: document.getElementById('appointmentCurrency'),
        adminKeyGroup: document.getElementById('appointmentsAdminKeyGroup'),
        adminKeyInput: document.getElementById('appointmentsAdminKey'),
        dateOverrideInput: document.getElementById('dateOverrideInput'),
        dateOverrideSlotsInput: document.getElementById('dateOverrideSlotsInput'),
        dateOverrideAdd: document.getElementById('addDateOverride'),
        dateOverrideList: document.querySelector('[data-date-override-list]'),
        dateOverrideMonthLabel: document.getElementById('dateOverrideMonthLabel'),
        dateOverrideCalendarGrid: document.getElementById('dateOverrideCalendarGrid'),
        dateOverridePrevMonth: document.getElementById('dateOverridePrevMonth'),
        dateOverrideNextMonth: document.getElementById('dateOverrideNextMonth'),
        diagnosticsButton: document.getElementById('runPaymentsDiagnosticsBtn'),
        diagnosticsMessage: document.getElementById('paymentsDiagnosticsMessage'),
        diagnosticsResults: document.getElementById('paymentsDiagnosticsResults'),
        blackoutInput: document.getElementById('blackoutDateInput'),
        blackoutAdd: document.getElementById('addBlackoutDate'),
        blackoutList: document.querySelector('[data-blackout-list]'),
        refreshBtn: document.getElementById('appointmentsRefreshBtn'),
        message: document.getElementById('appointmentsAdminMessage')
    };

    const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const state = {
        blackouts: [],
        dateOverrides: [],
        calendarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        selectedCalendarDate: null
    };

    function setMessage(text, type) {
        if (!elements.message) return;
        elements.message.textContent = text || '';
        elements.message.classList.remove('success', 'error');
        if (type === 'success') {
            elements.message.classList.add('success');
        }
        if (type === 'error') {
            elements.message.classList.add('error');
        }
    }

    function setDiagnosticsMessage(text, type) {
        if (!elements.diagnosticsMessage) return;
        elements.diagnosticsMessage.textContent = text || '';
        elements.diagnosticsMessage.classList.remove('success', 'error');
        if (type === 'success') {
            elements.diagnosticsMessage.classList.add('success');
        }
        if (type === 'error') {
            elements.diagnosticsMessage.classList.add('error');
        }
    }

    function toDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function parseDateKey(dateKey) {
        const [year, month, day] = String(dateKey || '').split('-').map(Number);
        if (!year || !month || !day) return null;
        return new Date(year, month - 1, day);
    }

    function getAdminKey() {
        const configured = String(config.adminKey || '').trim();
        if (configured && configured !== 'REPLACE_WITH_APPOINTMENTS_ADMIN_KEY') {
            return configured;
        }
        return elements.adminKeyInput ? elements.adminKeyInput.value.trim() : '';
    }

    function configureAdminKeyVisibility() {
        if (!elements.adminKeyGroup) return;
        const configured = String(config.adminKey || '').trim();
        const hasKey = configured && configured !== 'REPLACE_WITH_APPOINTMENTS_ADMIN_KEY';
        elements.adminKeyGroup.style.display = hasKey ? 'none' : 'block';
    }

    function normalizeTimeSlot(value) {
        const raw = String(value || '').trim();
        if (!raw) return '';

        const compact = raw.replace(/\s+/g, '');
        const noColonDigits = compact.replace(/[^\d]/g, '');
        if (!compact.includes(':') && /^\d{3,4}$/.test(noColonDigits)) {
            const padded = noColonDigits.padStart(4, '0');
            const hours = Number(padded.slice(0, 2));
            const minutes = Number(padded.slice(2));
            if (hours <= 23 && minutes <= 59) {
                return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            }
        }

        const parts = compact.split(':');
        if (parts.length !== 2) return '';
        const hours = Number(parts[0]);
        const minutes = Number(parts[1]);
        if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '';
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return '';
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    function normalizeSlots(value) {
        const source = Array.isArray(value)
            ? value
            : String(value || '')
                .split(',')
                .map((slot) => String(slot).trim());

        const normalized = source
            .map((slot) => normalizeTimeSlot(slot))
            .filter(Boolean);

        return [...new Set(normalized)].sort();
    }

    function setDaySlots(dayKey, slots) {
        const input = document.querySelector(`[data-day-slots="${dayKey}"]`);
        if (input) {
            input.value = normalizeSlots(slots).join(', ');
        }
    }

    function normalizeDateOverrides(overrides) {
        if (!Array.isArray(overrides)) return [];
        const byDate = new Map();
        overrides.forEach((entry) => {
            const date = String(entry?.date || '').trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
            const slots = normalizeSlots(entry?.timeSlots ?? entry?.time_slots ?? entry?.slots ?? []);
            if (!slots.length) return;
            byDate.set(date, { date, timeSlots: slots });
        });
        return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
    }

    function renderBlackouts() {
        if (!elements.blackoutList) return;
        elements.blackoutList.innerHTML = '';
        const fragment = document.createDocumentFragment();
        state.blackouts.forEach((date) => {
            const chip = document.createElement('span');
            chip.className = 'blackout-chip';
            chip.textContent = date;

            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = '×';
            button.addEventListener('click', () => {
                state.blackouts = state.blackouts.filter((item) => item !== date);
                renderBlackouts();
                renderDateOverrideCalendar();
            });

            chip.appendChild(button);
            fragment.appendChild(chip);
        });
        elements.blackoutList.appendChild(fragment);
    }

    function renderDateOverrides() {
        if (!elements.dateOverrideList) return;
        elements.dateOverrideList.innerHTML = '';
        const fragment = document.createDocumentFragment();

        state.dateOverrides.forEach((entry) => {
            const row = document.createElement('div');
            row.className = 'date-override-item';

            const text = document.createElement('span');
            text.className = 'date-override-item-text';
            text.textContent = `${entry.date} -> ${entry.timeSlots.join(', ')}`;
            row.appendChild(text);

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'btn-cancel date-override-remove';
            removeButton.textContent = 'Remove';
            removeButton.addEventListener('click', () => {
                state.dateOverrides = state.dateOverrides.filter((item) => item.date !== entry.date);
                renderDateOverrides();
                renderDateOverrideCalendar();
            });
            row.appendChild(removeButton);

            fragment.appendChild(row);
        });

        elements.dateOverrideList.appendChild(fragment);
    }

    function hasDateOverride(dateKey) {
        return state.dateOverrides.some((entry) => entry.date === dateKey);
    }

    function renderDateOverrideCalendar() {
        if (!elements.dateOverrideCalendarGrid || !elements.dateOverrideMonthLabel) return;
        const monthDate = state.calendarMonth || new Date();
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        elements.dateOverrideMonthLabel.textContent = firstDay.toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric'
        });

        elements.dateOverrideCalendarGrid.innerHTML = '';
        const fragment = document.createDocumentFragment();

        for (let i = 0; i < firstDay.getDay(); i += 1) {
            const empty = document.createElement('div');
            empty.className = 'date-override-calendar-empty';
            fragment.appendChild(empty);
        }

        const todayKey = toDateKey(new Date());
        const selectedDate = state.selectedCalendarDate || (elements.dateOverrideInput ? elements.dateOverrideInput.value : '');

        for (let day = 1; day <= daysInMonth; day += 1) {
            const date = new Date(year, month, day);
            const dateKey = toDateKey(date);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'date-override-calendar-day';
            button.textContent = String(day);
            button.dataset.date = dateKey;

            if (dateKey === selectedDate) {
                button.classList.add('is-selected');
            }
            if (dateKey === todayKey) {
                button.classList.add('is-today');
            }
            if (hasDateOverride(dateKey)) {
                button.classList.add('is-overridden');
            }
            if (state.blackouts.includes(dateKey)) {
                button.classList.add('is-blackout');
            }

            button.addEventListener('click', () => {
                state.selectedCalendarDate = dateKey;
                if (elements.dateOverrideInput) {
                    elements.dateOverrideInput.value = dateKey;
                }
                renderDateOverrideCalendar();
            });

            fragment.appendChild(button);
        }

        elements.dateOverrideCalendarGrid.appendChild(fragment);
    }

    function diagnosticsBadgeClass(provider) {
        if (provider?.ready) return 'ok';
        if (provider?.configured) return 'warn';
        return 'error';
    }

    function diagnosticsBadgeText(provider) {
        if (provider?.ready) return 'Ready';
        if (provider?.configured) return 'Check';
        return 'Missing';
    }

    function renderDiagnostics(results) {
        if (!elements.diagnosticsResults) return;
        elements.diagnosticsResults.innerHTML = '';
        if (!results?.providers || typeof results.providers !== 'object') {
            return;
        }

        const order = ['stripe', 'paypal', 'mpesa', 'airtel'];
        const names = {
            stripe: 'Stripe',
            paypal: 'PayPal',
            mpesa: 'M-Pesa',
            airtel: 'Airtel Money'
        };
        const fragment = document.createDocumentFragment();

        order.forEach((key) => {
            const provider = results.providers[key];
            if (!provider) return;

            const card = document.createElement('section');
            card.className = 'payment-diagnostics-card';

            const heading = document.createElement('h4');
            heading.textContent = names[key] || key;

            const badge = document.createElement('span');
            const badgeClass = diagnosticsBadgeClass(provider);
            badge.className = `payment-diagnostics-badge ${badgeClass}`;
            badge.textContent = diagnosticsBadgeText(provider);
            heading.appendChild(badge);
            card.appendChild(heading);

            const details = document.createElement('ul');
            const configuredItem = document.createElement('li');
            configuredItem.textContent = `Configured: ${provider.configured ? 'Yes' : 'No'}`;
            details.appendChild(configuredItem);

            if (Array.isArray(provider.missing) && provider.missing.length) {
                const missingItem = document.createElement('li');
                missingItem.textContent = `Missing: ${provider.missing.join(', ')}`;
                details.appendChild(missingItem);
            }

            if (provider.liveCheck && provider.liveCheck.attempted) {
                const liveItem = document.createElement('li');
                liveItem.textContent = provider.liveCheck.ok
                    ? `Live check: OK (${provider.liveCheck.detail || 'connected'})`
                    : `Live check: Failed (${provider.liveCheck.detail || 'error'})`;
                details.appendChild(liveItem);
            }

            card.appendChild(details);
            fragment.appendChild(card);
        });

        elements.diagnosticsResults.appendChild(fragment);
    }

    function applySettings(settings, blackouts) {
        if (elements.enabled) {
            elements.enabled.checked = Boolean(settings.bookingEnabled);
        }
        if (elements.price) {
            elements.price.value = settings.priceCents ? Math.round(settings.priceCents / 100) : '';
        }
        if (elements.currency) {
            elements.currency.value = settings.currency || 'KES';
        }

        const availableDays = settings.availableDays || [];
        DAY_KEYS.forEach((dayKey) => {
            const toggle = document.querySelector(`[data-day-toggle="${dayKey}"]`);
            if (toggle) {
                toggle.checked = availableDays.includes(dayKey);
            }
            setDaySlots(dayKey, settings.timeSlots?.[dayKey] || []);
        });

        state.blackouts = Array.isArray(blackouts) ? [...new Set(blackouts)] : [];
        state.dateOverrides = normalizeDateOverrides(settings.dateOverrides || []);

        const selectedDate = elements.dateOverrideInput ? elements.dateOverrideInput.value : '';
        if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
            state.selectedCalendarDate = selectedDate;
            const selected = parseDateKey(selectedDate);
            if (selected) {
                state.calendarMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
            }
        } else if (!state.selectedCalendarDate) {
            state.selectedCalendarDate = toDateKey(new Date());
        }

        renderBlackouts();
        renderDateOverrides();
        renderDateOverrideCalendar();
    }

    async function loadSettings() {
        setMessage('Loading Charla settings...', null);
        try {
            const response = await fetch(`${config.apiBase || '/api'}/appointments-settings`);
            if (!response.ok) {
                throw new Error('Unable to load Charla settings.');
            }
            const payload = await response.json();
            applySettings(
                {
                    ...(payload.settings || {}),
                    dateOverrides: payload.dateOverrides || []
                },
                payload.blackouts || []
            );
            setMessage('Settings loaded.', 'success');
        } catch (error) {
            console.error('Charla settings load failed', error);
            setMessage(error.message || 'Unable to load Charla settings.', 'error');
        }
    }

    function collectSettings() {
        const availableDays = [];
        const timeSlots = {};

        DAY_KEYS.forEach((dayKey) => {
            const toggle = document.querySelector(`[data-day-toggle="${dayKey}"]`);
            const slotsInput = document.querySelector(`[data-day-slots="${dayKey}"]`);
            if (toggle && toggle.checked) {
                availableDays.push(dayKey);
                timeSlots[dayKey] = normalizeSlots(slotsInput ? slotsInput.value : '');
            } else {
                timeSlots[dayKey] = normalizeSlots(slotsInput ? slotsInput.value : '');
            }
        });

        const priceValue = elements.price ? Number(elements.price.value || 0) : 0;
        return {
            bookingEnabled: elements.enabled ? elements.enabled.checked : false,
            priceCents: Math.max(0, Math.round(priceValue * 100)),
            currency: elements.currency ? elements.currency.value : 'KES',
            availableDays,
            timeSlots,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            blackouts: state.blackouts,
            dateOverrides: state.dateOverrides
        };
    }

    async function saveSettings(event) {
        event.preventDefault();
        const adminKey = getAdminKey();
        if (!adminKey) {
            setMessage('Charla admin key is required.', 'error');
            return;
        }

        const payload = collectSettings();
        setMessage('Saving Charla settings...', null);

        try {
            const response = await fetch(`${config.apiBase || '/api'}/appointments-settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Key': adminKey
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.error || 'Unable to save settings.');
            }

            applySettings(
                {
                    ...(result.settings || payload),
                    dateOverrides: result.dateOverrides || payload.dateOverrides
                },
                result.blackouts || payload.blackouts
            );
            setMessage('Charla settings updated.', 'success');
        } catch (error) {
            console.error('Charla settings save failed', error);
            setMessage(error.message || 'Unable to save settings.', 'error');
        }
    }

    async function runPaymentDiagnostics() {
        const adminKey = getAdminKey();
        if (!adminKey) {
            setDiagnosticsMessage('Charla admin key is required for diagnostics.', 'error');
            return;
        }

        if (elements.diagnosticsButton) {
            elements.diagnosticsButton.disabled = true;
            elements.diagnosticsButton.textContent = 'Running diagnostics...';
        }
        setDiagnosticsMessage('Checking payment provider configuration...', null);

        try {
            const response = await fetch(`${config.apiBase || '/api'}/appointments-payment-diagnostics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Key': adminKey
                },
                body: JSON.stringify({ runLiveChecks: true })
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.error || 'Unable to run payment diagnostics.');
            }

            renderDiagnostics(result);
            if (result.summary?.readyCount > 0) {
                setDiagnosticsMessage(
                    `Diagnostics complete: ${result.summary.readyCount} provider(s) ready.`,
                    'success'
                );
            } else {
                setDiagnosticsMessage('Diagnostics complete. No payment provider is fully ready yet.', 'error');
            }
        } catch (error) {
            console.error('Payment diagnostics failed', error);
            setDiagnosticsMessage(error.message || 'Unable to run payment diagnostics.', 'error');
        } finally {
            if (elements.diagnosticsButton) {
                elements.diagnosticsButton.disabled = false;
                elements.diagnosticsButton.textContent = 'Run payment diagnostics';
            }
        }
    }

    function addBlackoutDate() {
        if (!elements.blackoutInput) return;
        const value = elements.blackoutInput.value;
        if (!value) return;
        if (!state.blackouts.includes(value)) {
            state.blackouts.push(value);
            state.blackouts.sort();
            renderBlackouts();
            renderDateOverrideCalendar();
        }
        elements.blackoutInput.value = '';
    }

    function addDateOverride() {
        const dateValue = elements.dateOverrideInput ? elements.dateOverrideInput.value : '';
        const slotsValue = elements.dateOverrideSlotsInput ? elements.dateOverrideSlotsInput.value : '';
        if (!dateValue) {
            setMessage('Select a date before adding a custom schedule.', 'error');
            return;
        }

        const slots = normalizeSlots(slotsValue);
        if (!slots.length) {
            setMessage('Add at least one valid time slot (HH:MM).', 'error');
            return;
        }

        state.dateOverrides = state.dateOverrides.filter((entry) => entry.date !== dateValue);
        state.dateOverrides.push({ date: dateValue, timeSlots: slots });
        state.dateOverrides.sort((a, b) => a.date.localeCompare(b.date));
        state.selectedCalendarDate = dateValue;

        const selected = parseDateKey(dateValue);
        if (selected) {
            state.calendarMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
        }
        renderDateOverrides();
        renderDateOverrideCalendar();

        if (elements.dateOverrideInput) elements.dateOverrideInput.value = '';
        if (elements.dateOverrideSlotsInput) elements.dateOverrideSlotsInput.value = '';
        setMessage('Date-specific slots added. Save settings to apply.', null);
    }

    let initialized = false;

    function init() {
        if (initialized) return;
        initialized = true;
        configureAdminKeyVisibility();
        state.selectedCalendarDate = toDateKey(new Date());
        renderDateOverrideCalendar();

        if (elements.blackoutAdd) {
            elements.blackoutAdd.addEventListener('click', addBlackoutDate);
        }
        if (elements.dateOverrideAdd) {
            elements.dateOverrideAdd.addEventListener('click', addDateOverride);
        }
        if (elements.dateOverrideInput) {
            elements.dateOverrideInput.addEventListener('change', () => {
                const dateValue = String(elements.dateOverrideInput.value || '');
                if (!dateValue) return;
                state.selectedCalendarDate = dateValue;
                const selected = parseDateKey(dateValue);
                if (selected) {
                    state.calendarMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
                }
                renderDateOverrideCalendar();
            });
        }
        if (elements.dateOverridePrevMonth) {
            elements.dateOverridePrevMonth.addEventListener('click', () => {
                state.calendarMonth = new Date(
                    state.calendarMonth.getFullYear(),
                    state.calendarMonth.getMonth() - 1,
                    1
                );
                renderDateOverrideCalendar();
            });
        }
        if (elements.dateOverrideNextMonth) {
            elements.dateOverrideNextMonth.addEventListener('click', () => {
                state.calendarMonth = new Date(
                    state.calendarMonth.getFullYear(),
                    state.calendarMonth.getMonth() + 1,
                    1
                );
                renderDateOverrideCalendar();
            });
        }
        if (elements.diagnosticsButton) {
            elements.diagnosticsButton.addEventListener('click', runPaymentDiagnostics);
        }
        if (elements.refreshBtn) {
            elements.refreshBtn.addEventListener('click', loadSettings);
        }
        form.addEventListener('submit', saveSettings);
        loadSettings();
    }

    window.AppointmentsAdmin = { init };
})();
