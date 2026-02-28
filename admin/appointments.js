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
        blackoutInput: document.getElementById('blackoutDateInput'),
        blackoutAdd: document.getElementById('addBlackoutDate'),
        blackoutList: document.querySelector('[data-blackout-list]'),
        refreshBtn: document.getElementById('appointmentsRefreshBtn'),
        message: document.getElementById('appointmentsAdminMessage')
    };

    const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const state = {
        blackouts: [],
        dateOverrides: []
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

    function normalizeSlots(value) {
        return String(value || '')
            .split(',')
            .map((slot) => slot.trim())
            .filter(Boolean)
            .map((slot) => {
                const parts = slot.split(':');
                if (parts.length !== 2) return slot;
                const hours = String(parts[0]).padStart(2, '0');
                const minutes = String(parts[1]).padStart(2, '0');
                return `${hours}:${minutes}`;
            });
    }

    function setDaySlots(dayKey, slots) {
        const input = document.querySelector(`[data-day-slots="${dayKey}"]`);
        if (input) {
            input.value = Array.isArray(slots) ? slots.join(', ') : '';
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
            });
            row.appendChild(removeButton);

            fragment.appendChild(row);
        });

        elements.dateOverrideList.appendChild(fragment);
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
        renderBlackouts();
        renderDateOverrides();
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

    function addBlackoutDate() {
        if (!elements.blackoutInput) return;
        const value = elements.blackoutInput.value;
        if (!value) return;
        if (!state.blackouts.includes(value)) {
            state.blackouts.push(value);
            state.blackouts.sort();
            renderBlackouts();
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
        renderDateOverrides();

        if (elements.dateOverrideInput) elements.dateOverrideInput.value = '';
        if (elements.dateOverrideSlotsInput) elements.dateOverrideSlotsInput.value = '';
        setMessage('Date-specific slots added. Save settings to apply.', null);
    }

    let initialized = false;

    function init() {
        if (initialized) return;
        initialized = true;
        configureAdminKeyVisibility();
        if (elements.blackoutAdd) {
            elements.blackoutAdd.addEventListener('click', addBlackoutDate);
        }
        if (elements.dateOverrideAdd) {
            elements.dateOverrideAdd.addEventListener('click', addDateOverride);
        }
        if (elements.refreshBtn) {
            elements.refreshBtn.addEventListener('click', loadSettings);
        }
        form.addEventListener('submit', saveSettings);
        loadSettings();
    }

    window.AppointmentsAdmin = { init };
})();
