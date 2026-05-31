(function() {
    'use strict';

    const config = window.APPOINTMENTS_PUBLIC_CONFIG || {};
    const DEFAULT_CALENDLY = 'https://calendly.com/bloomlyke';
    const calendlyUrls = {
        peer: String(config.calendlyUrls?.peer || DEFAULT_CALENDLY).trim(),
        standard: String(config.calendlyUrls?.standard || config.calendlyUrl || DEFAULT_CALENDLY).trim(),
        premium: String(config.calendlyUrls?.premium || DEFAULT_CALENDLY).trim(),
    };
    const currency = 'KES';
    const pollIntervalMs = 5000;

    const sessionLabels = {
        peer: 'Peer Chat',
        standard: 'Standard Charla',
        premium: 'Premium Charla',
    };

    const calendlyWidget = document.querySelector('[data-calendly-widget]');
    const calendlyCard = document.querySelector('[data-calendly-card]');
    const calendlyLock = document.querySelector('[data-calendly-lock]');
    const sessionCards = Array.from(document.querySelectorAll('[data-session-type]'));
    const form = document.querySelector('[data-charla-payment-form]');
    const amountInput = document.querySelector('[data-charla-amount]');
    const messageEl = document.querySelector('[data-charla-payment-message]');
    const submitButton = document.querySelector('[data-charla-book-button]');
    const phoneField = document.querySelector('[data-phone-field]');
    const methodCards = Array.from(document.querySelectorAll('.payment-method-card'));
    const statusSteps = Array.from(document.querySelectorAll('[data-status-step]'));

    const state = {
        sessionType: 'standard',
        amount: 500,
        pollingId: null,
        paid: false,
        name: '',
        email: '',
        phone: '',
    };

    function setMessage(message, type) {
        if (!messageEl) return;
        messageEl.textContent = message || '';
        messageEl.classList.remove('is-success', 'is-error');
        if (type === 'success') messageEl.classList.add('is-success');
        if (type === 'error') messageEl.classList.add('is-error');
    }

    function setBusy(isBusy) {
        if (!submitButton) return;
        submitButton.disabled = Boolean(isBusy);
        submitButton.textContent = isBusy ? 'Processing...' : 'Pay';
    }

    function setStatus(status) {
        const order = ['pending', 'paid', 'confirmed'];
        const activeIndex = Math.max(0, order.indexOf(status));
        statusSteps.forEach((step) => {
            const stepIndex = order.indexOf(step.dataset.statusStep);
            step.classList.toggle('is-active', stepIndex <= activeIndex);
        });
    }

    function getSelectedProvider() {
        const checked = form?.querySelector('input[name="provider"]:checked');
        return String(checked?.value || 'mpesa').toLowerCase();
    }

    function refreshPaymentMethod() {
        const provider = getSelectedProvider();
        methodCards.forEach((card) => {
            const input = card.querySelector('input[name="provider"]');
            card.classList.toggle('is-selected', Boolean(input?.checked));
        });
        if (phoneField) {
            phoneField.hidden = provider !== 'mpesa';
        }
    }

    function selectSession(type) {
        const nextCard = sessionCards.find((card) => card.dataset.sessionType === type) || sessionCards[0];
        if (!nextCard) return;
        state.sessionType = nextCard.dataset.sessionType || 'standard';
        state.amount = Number(nextCard.dataset.amount || 500);

        sessionCards.forEach((card) => {
            const isActive = card === nextCard;
            card.classList.toggle('is-active', isActive);
            card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        if (amountInput) {
            amountInput.value = String(state.amount);
        }
    }

    function getCalendlyUrlForCurrentSession() {
        return calendlyUrls[state.sessionType] || DEFAULT_CALENDLY;
    }

    function readFormContact() {
        if (!form) return;
        const fd = new FormData(form);
        state.name = String(fd.get('name') || '').trim();
        state.email = String(fd.get('email') || '').trim();
        state.phone = String(fd.get('phone') || '').trim();
    }

    async function saveBooking(paymentMethod, paymentStatus) {
        readFormContact();
        try {
            await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: state.name,
                    email: state.email,
                    phone: state.phone,
                    plan: state.sessionType,
                    sessionType: state.sessionType,
                    amount: state.amount,
                    payment_method: paymentMethod,
                    payment_status: paymentStatus,
                }),
            });
        } catch (error) {
            console.error('Booking save failed', error);
        }
    }

    function initCalendly() {
        if (!calendlyWidget) return;
        const calendlyUrl = getCalendlyUrlForCurrentSession();
        calendlyWidget.hidden = false;
        calendlyWidget.innerHTML = '';
        calendlyWidget.dataset.url = calendlyUrl;
        if (window.Calendly && typeof window.Calendly.initInlineWidget === 'function') {
            window.Calendly.initInlineWidget({
                url: calendlyUrl,
                parentElement: calendlyWidget,
            });
        }
    }

    function scrollToCalendly() {
        const target = document.getElementById('charla-booking') || calendlyCard;
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function unlockCalendly() {
        state.paid = true;
        setStatus('paid');
        if (calendlyCard) calendlyCard.classList.remove('is-locked');
        if (calendlyLock) calendlyLock.hidden = true;
        initCalendly();
        setMessage('Check your phone and approve the M-Pesa prompt 💜', 'success');
        setTimeout(() => {
            setMessage('Payment confirmed. Choose your time in the calendar below.', 'success');
            scrollToCalendly();
        }, 1200);
    }

    function unlockCalendlyAfterCard() {
        state.paid = true;
        setStatus('paid');
        if (calendlyCard) calendlyCard.classList.remove('is-locked');
        if (calendlyLock) calendlyLock.hidden = true;
        initCalendly();
        setMessage('Payment confirmed. Choose your time in the calendar below.', 'success');
        scrollToCalendly();
    }

    function stopPolling() {
        if (state.pollingId) {
            window.clearInterval(state.pollingId);
            state.pollingId = null;
        }
    }

    async function pollMpesaStatus(checkoutRequestId) {
        const response = await fetch(`/api/mpesa/status?checkoutRequestId=${encodeURIComponent(checkoutRequestId)}`, {
            cache: 'no-store',
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.error || 'Unable to check M-Pesa payment status.');
        }
        if (result.paid) {
            stopPolling();
            await saveBooking('mpesa', 'confirmed');
            unlockCalendlyAfterCard();
        } else if (result.failed) {
            stopPolling();
            setStatus('pending');
            setMessage(result.message || 'M-Pesa payment was not completed.', 'error');
        }
    }

    function startMpesaPolling(checkoutRequestId) {
        stopPolling();
        state.pollingId = window.setInterval(() => {
            pollMpesaStatus(checkoutRequestId).catch((error) => {
                console.error('M-Pesa status check failed', error);
            });
        }, pollIntervalMs);
    }

    async function startMpesaPayment(phone) {
        setMessage('Sending STK push to your phone...', null);
        const response = await fetch('/api/mpesa/stkpush', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone,
                amount: state.amount,
                sessionType: state.sessionType,
                accountReference: 'Bloomly-Charla',
                description: sessionLabels[state.sessionType] || 'Bloomly Charla',
            }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.error || 'Unable to start M-Pesa payment.');
        }
        if (!result.CheckoutRequestID) {
            throw new Error('M-Pesa did not return a checkout request id.');
        }
        await saveBooking('mpesa', 'pending');
        setMessage('Check your phone and approve the M-Pesa prompt 💜', 'success');
        startMpesaPolling(result.CheckoutRequestID);
    }

    async function startCardPayment() {
        setMessage('Opening Stripe Checkout...', null);
        const response = await fetch('/api/stripe/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: state.amount,
                currency,
                sessionType: state.sessionType,
                description: sessionLabels[state.sessionType] || 'Bloomly Charla',
                successUrl: `${window.location.origin}${window.location.pathname}?stripe_session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl: `${window.location.origin}${window.location.pathname}?payment_cancelled=1`,
            }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.error || 'Unable to start card payment.');
        }
        if (!result.checkoutUrl) {
            throw new Error('Stripe Checkout did not return a payment link.');
        }
        await saveBooking('card', 'pending');
        window.location.href = result.checkoutUrl;
    }

    async function confirmStripeReturn(sessionId) {
        setBusy(true);
        setMessage('Confirming card payment...', null);
        try {
            const response = await fetch('/api/stripe/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.paid) {
                throw new Error(result.error || 'Card payment was not confirmed.');
            }
            await saveBooking('card', 'confirmed');
            unlockCalendlyAfterCard();
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
            setMessage(error.message || 'Unable to confirm card payment.', 'error');
        } finally {
            setBusy(false);
        }
    }

    async function handlePaymentSubmit(event) {
        event.preventDefault();
        if (!form) return;

        readFormContact();
        const provider = getSelectedProvider();
        const formData = new FormData(form);
        const acceptedTerms = formData.get('terms') === 'on';
        const phone = String(formData.get('phone') || '').trim();
        const email = String(formData.get('email') || '').trim();
        const name = String(formData.get('name') || '').trim();

        if (!name) {
            setMessage('Please enter your full name.', 'error');
            return;
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setMessage('Please enter a valid email address.', 'error');
            return;
        }
        if (!acceptedTerms) {
            setMessage('Please agree to the Terms & Conditions before booking.', 'error');
            return;
        }
        if (provider === 'mpesa' && !/^2547\d{8}$/.test(phone)) {
            setMessage('Enter an M-Pesa number in the format 2547XXXXXXXX.', 'error');
            return;
        }

        setStatus('pending');
        setBusy(true);
        try {
            if (provider === 'card') {
                await startCardPayment();
            } else {
                await startMpesaPayment(phone);
            }
        } catch (error) {
            setMessage(error.message || 'Payment could not start.', 'error');
        } finally {
            setBusy(false);
        }
    }

    function initCalendlyEventListener() {
        window.addEventListener('message', (event) => {
            if (typeof event.data?.event !== 'string') return;
            if (event.data.event === 'calendly.event_scheduled') {
                setStatus('confirmed');
                setMessage('Booking confirmed. Check your email for the Calendly confirmation.', 'success');
            }
        });
    }

    sessionCards.forEach((card) => {
        card.addEventListener('click', () => {
            selectSession(card.dataset.sessionType);
        });
    });

    document.querySelectorAll('[data-book-counsellor]').forEach((link) => {
        link.addEventListener('click', () => {
            selectSession('standard');
        });
    });

    if (form) {
        form.addEventListener('submit', handlePaymentSubmit);
        form.addEventListener('change', refreshPaymentMethod);
    }

    selectSession('standard');
    refreshPaymentMethod();
    initCalendlyEventListener();

    const params = new URLSearchParams(window.location.search);
    const stripeSessionId = params.get('stripe_session_id');
    if (stripeSessionId) {
        void confirmStripeReturn(stripeSessionId);
    } else if (params.get('payment_cancelled') === '1') {
        setMessage('Card payment was cancelled. Choose a payment method to try again.', 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
})();
