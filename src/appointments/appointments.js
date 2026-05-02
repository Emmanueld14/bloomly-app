/**
 * Bloomly Charla - Static Booking Experience
 *
 * Replace these placeholders before launch:
 * - EMAILJS_SERVICE_ID: your EmailJS service ID.
 * - EMAILJS_TEMPLATE_ID: your EmailJS template ID.
 * - EMAILJS_PUBLIC_KEY: your EmailJS public key.
 * - GOOGLE_SHEET_WEBHOOK: your Google Apps Script web app URL.
 * - MPESA_PAYBILL_NUMBER: your M-Pesa paybill number.
 * - BLOOMLY_WHATSAPP_NUMBER: your WhatsApp booking/support number.
 */
(function() {
    'use strict';

    const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
    const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
    const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';
    const GOOGLE_SHEET_WEBHOOK = 'YOUR_APPS_SCRIPT_URL_HERE';
    const MPESA_PAYBILL_NUMBER = 'PAYBILL NUMBER — add placeholder';
    const BLOOMLY_WHATSAPP_NUMBER = '254XXXXXXXXX';

    const SESSION_TYPES = {
        'Peer Chat': { label: 'Peer Chat', price: 200, duration: '45 min' },
        'Standard Charla': { label: 'Standard Charla', price: 500, duration: '60 min' },
        'Premium Charla': { label: 'Premium Charla', price: 900, duration: '60 min' }
    };

    const form = document.querySelector('[data-appointments-form]');
    if (!form) return;

    const elements = {
        sessionCards: Array.from(document.querySelectorAll('[data-session-type]')),
        price: document.querySelector('[data-appointments-price]'),
        summary: document.querySelector('[data-appointments-summary]'),
        submit: document.querySelector('[data-appointments-submit]'),
        message: document.querySelector('[data-appointments-message]'),
        date: form.querySelector('input[name="date"]'),
        counsellor: form.querySelector('select[name="counsellor"]')
    };

    let selectedSession = SESSION_TYPES['Standard Charla'];

    function todayKey() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function isPlaceholder(value) {
        const normalized = String(value || '').trim().toUpperCase();
        return !normalized ||
            normalized.includes('YOUR_') ||
            normalized.includes('_HERE') ||
            normalized.includes('PLACEHOLDER') ||
            normalized.includes('XXXXXXXXX') ||
            normalized.includes('PAYBILL NUMBER');
    }

    function setFieldError(name, message) {
        const error = form.querySelector(`[data-error-for="${name}"]`);
        const field = form.elements[name];
        if (error) {
            error.textContent = message || '';
        }
        if (field) {
            field.classList.toggle('has-error', Boolean(message));
        }
    }

    function clearErrors() {
        form.querySelectorAll('[data-error-for]').forEach((error) => {
            error.textContent = '';
        });
        form.querySelectorAll('.has-error').forEach((field) => {
            field.classList.remove('has-error');
        });
        if (elements.message) {
            elements.message.textContent = '';
            elements.message.classList.remove('is-error', 'is-success');
        }
    }

    function formatSession(session) {
        return `${session.label} — KSh ${session.price} / ${session.duration}`;
    }

    function updateSessionUi() {
        elements.sessionCards.forEach((card) => {
            const isActive = card.dataset.sessionType === selectedSession.label;
            card.classList.toggle('is-active', isActive);
            card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        if (elements.price) {
            elements.price.textContent = `${selectedSession.label}: KSh ${selectedSession.price}`;
        }
        if (elements.summary) {
            elements.summary.textContent = `Selected: ${formatSession(selectedSession)}`;
        }
        if (elements.submit) {
            elements.submit.textContent = `Confirm My Session — KSh ${selectedSession.price}`;
        }
    }

    function validateForm(data) {
        const errors = {};
        if (!data.name) errors.name = 'Please enter your full name.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            errors.email = 'Please enter a valid email address.';
        }
        if (!/^\+?254\d{9}$/.test(data.phone.replace(/\s+/g, ''))) {
            errors.phone = 'Please enter a valid Kenyan M-Pesa number starting with +254.';
        }
        if (!data.counsellor) errors.counsellor = 'Please choose a counsellor or mentor.';
        if (!data.date) {
            errors.date = 'Please choose your preferred date.';
        } else if (data.date < todayKey()) {
            errors.date = 'Please choose today or a future date.';
        }
        if (!data.time) errors.time = 'Please choose your preferred time.';
        if (!data.purpose) errors.purpose = 'Please share the purpose of your Charla.';
        return errors;
    }

    function getFormData() {
        const formData = new FormData(form);
        return {
            timestamp: new Date().toISOString(),
            name: String(formData.get('name') || '').trim(),
            email: String(formData.get('email') || '').trim(),
            phone: String(formData.get('phone') || '').trim(),
            counsellor: String(formData.get('counsellor') || '').trim(),
            sessionType: selectedSession.label,
            price: selectedSession.price,
            preferredDate: String(formData.get('date') || '').trim(),
            preferredTime: String(formData.get('time') || '').trim(),
            purpose: String(formData.get('purpose') || '').trim()
        };
    }

    async function sendEmail(data) {
        if (!window.emailjs || isPlaceholder(EMAILJS_SERVICE_ID) || isPlaceholder(EMAILJS_TEMPLATE_ID) || isPlaceholder(EMAILJS_PUBLIC_KEY)) {
            console.info('EmailJS placeholders are not configured yet.');
            return;
        }

        window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
        await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            to_name: data.name,
            to_email: data.email,
            name: data.name,
            email: data.email,
            phone: data.phone,
            counsellor: data.counsellor,
            session_type: data.sessionType,
            price: `KSh ${data.price}`,
            preferred_date: data.preferredDate,
            preferred_time: data.preferredTime,
            purpose: data.purpose,
            mpesa_instructions: `Send KSh ${data.price} to M-Pesa Paybill ${MPESA_PAYBILL_NUMBER}. Account number: ${data.name}.`
        });
    }

    async function logToSheet(data) {
        if (isPlaceholder(GOOGLE_SHEET_WEBHOOK)) {
            console.info('Google Sheets webhook placeholder is not configured yet.');
            return;
        }

        await fetch(GOOGLE_SHEET_WEBHOOK, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }

    function renderSuccess(data) {
        const success = document.createElement('div');
        success.className = 'appointments-success-card';
        success.innerHTML = `
            <h2>✅ You're booked in!</h2>
            <p>Your Charla session request has been received.</p>
            <p>To confirm your spot, please send KSh ${data.price} to:</p>
            <p><strong>M-Pesa Paybill:</strong> ${MPESA_PAYBILL_NUMBER}<br>
            <strong>Account number:</strong> Your full name</p>
            <p>Once payment is confirmed, we'll send your counsellor's details and session link to your email and WhatsApp within 2 hours.</p>
            <p>Questions? WhatsApp us: ${BLOOMLY_WHATSAPP_NUMBER}</p>
        `;
        form.replaceWith(success);
        if (elements.message) {
            elements.message.remove();
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();
        clearErrors();

        const data = getFormData();
        const errors = validateForm({
            name: data.name,
            email: data.email,
            phone: data.phone,
            counsellor: data.counsellor,
            date: data.preferredDate,
            time: data.preferredTime,
            purpose: data.purpose
        });

        Object.entries(errors).forEach(([name, message]) => setFieldError(name, message));
        if (Object.keys(errors).length) {
            if (elements.message) {
                elements.message.textContent = 'Please fix the highlighted fields.';
                elements.message.classList.add('is-error');
            }
            return;
        }

        if (elements.submit) {
            elements.submit.disabled = true;
            elements.submit.textContent = 'Confirming...';
        }

        try {
            const tasks = await Promise.allSettled([sendEmail(data), logToSheet(data)]);
            tasks.forEach((task) => {
                if (task.status === 'rejected') {
                    console.warn('Optional Charla integration failed.', task.reason);
                }
            });
            renderSuccess(data);
        } finally {
            if (elements.submit && document.body.contains(elements.submit)) {
                elements.submit.disabled = false;
                updateSessionUi();
            }
        }
    }

    elements.sessionCards.forEach((card) => {
        card.addEventListener('click', () => {
            const next = SESSION_TYPES[card.dataset.sessionType];
            if (!next) return;
            selectedSession = next;
            updateSessionUi();
        });
    });

    document.querySelectorAll('[data-book-counsellor]').forEach((link) => {
        link.addEventListener('click', () => {
            const counsellor = link.dataset.bookCounsellor;
            if (elements.counsellor && counsellor) {
                elements.counsellor.value = counsellor;
            }
        });
    });

    if (elements.date) {
        elements.date.min = todayKey();
    }

    form.addEventListener('submit', handleSubmit);
    updateSessionUi();
})();
