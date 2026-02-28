(function initCharlaPayments() {
    const config = window.APPOINTMENTS_PUBLIC_CONFIG || window.APPOINTMENTS_CONFIG || {};
    const apiBase = String(config.apiBase || '/api').replace(/\/?$/, '');
    const url = new URL(window.location.href);
    const bookingId = String(url.searchParams.get('booking_id') || '').trim();
    const paypalOrderToken = String(url.searchParams.get('token') || '').trim();
    const paypalCancelled = String(url.searchParams.get('cancelled') || '') === '1';

    const elements = {
        amount: document.querySelector('[data-payment-amount]'),
        status: document.querySelector('[data-payment-status]'),
        summary: document.querySelector('[data-payment-summary]'),
        bookingId: document.querySelector('[data-payment-booking-id]'),
        form: document.querySelector('[data-payment-form]'),
        phoneGroup: document.querySelector('[data-payment-phone-group]'),
        submit: document.querySelector('[data-payment-submit]'),
        message: document.querySelector('[data-payment-message]')
    };

    const state = {
        booking: null,
        paymentAttempts: [],
        pollingId: null,
        busy: false
    };

    function buildApiUrl(path) {
        const normalized = String(path || '').replace(/^\/+/, '');
        return `${apiBase}/${normalized}`;
    }

    function formatAmount(cents, currency) {
        const amount = Number(cents || 0) / 100;
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: String(currency || 'KES').toUpperCase(),
            minimumFractionDigits: 2
        }).format(amount);
    }

    function setMessage(message, type) {
        if (!elements.message) return;
        elements.message.textContent = message || '';
        elements.message.classList.remove('is-success', 'is-error');
        if (type === 'success') elements.message.classList.add('is-success');
        if (type === 'error') elements.message.classList.add('is-error');
    }

    function setBusy(nextBusy) {
        state.busy = Boolean(nextBusy);
        if (elements.submit) {
            const locked = state.booking?.status === 'confirmed' || state.booking?.status === 'expired';
            elements.submit.disabled = state.busy || locked;
            if (!state.busy) {
                elements.submit.textContent = 'Continue to payment';
            }
        }
    }

    function getSelectedProvider() {
        if (!elements.form) return 'mpesa';
        const checked = elements.form.querySelector('input[name="provider"]:checked');
        return String(checked?.value || 'mpesa').toLowerCase();
    }

    function requiresPhone(provider) {
        return provider === 'mpesa' || provider === 'airtel';
    }

    function refreshPhoneVisibility() {
        const provider = getSelectedProvider();
        const showPhone = requiresPhone(provider);
        if (elements.phoneGroup) {
            elements.phoneGroup.style.display = showPhone ? '' : 'none';
        }
    }

    function renderSummary() {
        if (!state.booking) {
            if (elements.status) elements.status.textContent = 'Unable to load booking.';
            if (elements.summary) elements.summary.textContent = 'No booking found for this payment link.';
            if (elements.amount) elements.amount.textContent = 'Booking not found';
            return;
        }

        const booking = state.booking;
        const amountLabel = formatAmount(booking.amount_cents, booking.currency);
        const dateLabel = booking.date || '-';
        const timeLabel = booking.time || '-';

        if (elements.amount) elements.amount.textContent = amountLabel;
        if (elements.bookingId) elements.bookingId.value = String(booking.id || '');
        if (elements.status) {
            if (booking.status === 'confirmed') {
                elements.status.textContent = 'Payment complete. Your Charla session is confirmed.';
            } else if (booking.status === 'expired') {
                elements.status.textContent = 'Payment window expired. Please start a new booking.';
            } else {
                elements.status.textContent = 'Awaiting payment confirmation.';
            }
        }
        if (elements.summary) {
            elements.summary.innerHTML = `
                <strong>${amountLabel}</strong><br>
                Date: ${dateLabel}<br>
                Time: ${timeLabel}<br>
                Name: ${booking.name || '-'}<br>
                Email: ${booking.email || '-'}
            `;
        }

        if (booking.status === 'confirmed') {
            setMessage('Payment successful. Your booking is confirmed.', 'success');
            if (elements.submit) elements.submit.disabled = true;
        } else if (booking.status === 'expired') {
            setMessage('This payment link has expired. Please book again.', 'error');
            if (elements.submit) elements.submit.disabled = true;
        }
    }

    async function fetchStatus() {
        if (!bookingId) return false;
        const response = await fetch(`${buildApiUrl('payments-status')}?booking_id=${encodeURIComponent(bookingId)}`);
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.error || 'Unable to load booking status.');
        }
        state.booking = result.booking || null;
        state.paymentAttempts = Array.isArray(result.paymentAttempts) ? result.paymentAttempts : [];
        renderSummary();
        return true;
    }

    function stopPolling() {
        if (state.pollingId) {
            window.clearInterval(state.pollingId);
            state.pollingId = null;
        }
    }

    function startPolling() {
        stopPolling();
        state.pollingId = window.setInterval(async () => {
            try {
                await fetchStatus();
                if (state.booking?.status === 'confirmed') {
                    stopPolling();
                }
            } catch (error) {
                console.error('Payment status polling error', error);
            }
        }, 5000);
    }

    async function capturePayPal(orderId) {
        if (!bookingId || !orderId) return;
        setBusy(true);
        if (elements.submit) elements.submit.textContent = 'Confirming PayPal payment...';
        setMessage('Confirming PayPal payment...', null);
        try {
            const response = await fetch(buildApiUrl('payments-paypal-capture'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId,
                    orderId
                })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.error || 'Unable to confirm PayPal payment.');
            }

            state.booking = result.booking || state.booking;
            renderSummary();
            setMessage(result.message || 'PayPal payment confirmed.', 'success');
            stopPolling();
        } catch (error) {
            setMessage(error.message || 'PayPal payment confirmation failed.', 'error');
        } finally {
            setBusy(false);
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (!bookingId) {
            setMessage('Missing booking ID in payment link.', 'error');
            return;
        }
        if (!state.booking) {
            setMessage('Unable to load booking details.', 'error');
            return;
        }
        if (state.booking.status === 'confirmed') {
            setMessage('This booking is already paid and confirmed.', 'success');
            return;
        }

        const provider = getSelectedProvider();
        const formData = new FormData(elements.form);
        const phone = String(formData.get('phone') || '').trim();
        if (requiresPhone(provider) && !phone) {
            setMessage('Enter phone number for mobile money payments.', 'error');
            return;
        }

        setBusy(true);
        if (elements.submit) elements.submit.textContent = 'Starting payment...';
        setMessage('Starting payment...', null);

        try {
            const response = await fetch(buildApiUrl('payments-initiate'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId,
                    provider,
                    phone
                })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.error || 'Unable to start payment.');
            }

            if (result.redirectUrl) {
                window.location.href = result.redirectUrl;
                return;
            }

            if (result.pending) {
                setMessage(result.message || 'Payment request sent. Complete it on your phone.', null);
                startPolling();
                await fetchStatus();
                return;
            }

            if (result.booking && result.booking.status === 'confirmed') {
                state.booking = result.booking;
                renderSummary();
                setMessage(result.message || 'Payment complete.', 'success');
                return;
            }

            setMessage('Payment started. Waiting for confirmation...', null);
            startPolling();
        } catch (error) {
            setMessage(error.message || 'Unable to initiate payment.', 'error');
        } finally {
            setBusy(false);
        }
    }

    async function init() {
        if (!bookingId) {
            setMessage('Missing booking ID in URL.', 'error');
            if (elements.status) elements.status.textContent = 'Invalid payment link.';
            if (elements.submit) elements.submit.disabled = true;
            return;
        }

        if (elements.form) {
            elements.form.addEventListener('submit', handleSubmit);
            elements.form.addEventListener('change', refreshPhoneVisibility);
        }
        refreshPhoneVisibility();

        try {
            await fetchStatus();
        } catch (error) {
            setMessage(error.message || 'Unable to load payment status.', 'error');
            if (elements.submit) elements.submit.disabled = true;
            return;
        }

        if (paypalCancelled) {
            setMessage('PayPal payment was cancelled. Choose a method to try again.', 'error');
        } else if (paypalOrderToken) {
            await capturePayPal(paypalOrderToken);
        } else if (state.booking?.status !== 'confirmed') {
            startPolling();
        }
    }

    init();
})();
