(function() {
    'use strict';

    const currency = 'KES';
    const pollIntervalMs = 5000;

    const sessionLabels = {
        peer: 'Peer Chat',
        standard: 'Standard Charla',
        premium: 'Premium Charla'
    };

    const sessionCards = Array.from(document.querySelectorAll('[data-session-type]'));
    const form = document.querySelector('[data-charla-payment-form]');
    const amountInput = document.querySelector('[data-charla-amount]');
    const messageEl = document.querySelector('[data-charla-payment-message]');
    const submitButton = document.querySelector('[data-charla-book-button]');
    const phoneField = document.querySelector('[data-phone-field]');
    const termsInput = form ? form.querySelector('input[name="terms"]') : null;
    const methodCards = Array.from(document.querySelectorAll('.payment-method-card'));
    const statusSteps = Array.from(document.querySelectorAll('[data-status-step]'));

    const state = {
        sessionType: 'standard',
        amount: 500,
        pollingId: null,
        paid: false,
        busy: false
    };

    function setMessage(message, type) {
        if (!messageEl) return;
        messageEl.textContent = message || '';
        messageEl.classList.remove('is-success', 'is-error');
        if (type === 'success') messageEl.classList.add('is-success');
        if (type === 'error') messageEl.classList.add('is-error');
    }

    function setBusy(isBusy) {
        state.busy = Boolean(isBusy);
        refreshSubmitState();
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

    function refreshSubmitState() {
        if (!submitButton) return;
        const acceptedTerms = termsInput ? termsInput.checked : true;
        submitButton.disabled = state.busy || state.paid || !acceptedTerms;
        if (state.busy) {
            submitButton.textContent = 'Processing...';
        } else if (state.paid) {
            submitButton.textContent = 'Payment received';
        } else {
            submitButton.textContent = 'Book';
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

    function completePayment() {
        state.paid = true;
        setStatus('paid');
        setMessage('Payment received. We will be in touch within 24 hours to confirm your session time.', 'success');
        refreshSubmitState();
    }

    function stopPolling() {
        if (state.pollingId) {
            window.clearInterval(state.pollingId);
            state.pollingId = null;
        }
    }

    async function pollMpesaStatus(checkoutRequestId) {
        const response = await fetch(`/api/mpesa/status?checkoutRequestId=${encodeURIComponent(checkoutRequestId)}`, {
            cache: 'no-store'
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.error || 'Unable to check M-Pesa payment status.');
        }
        if (result.paid) {
            stopPolling();
            completePayment();
        } else if (result.failed) {
            stopPolling();
            setStatus('pending');
            setMessage(result.message || 'M-Pesa payment was not completed.', 'error');
        } else {
            setMessage('Payment pending. Approve the M-Pesa prompt on your phone.', null);
        }
    }

    function startMpesaPolling(checkoutRequestId) {
        stopPolling();
        state.pollingId = window.setInterval(() => {
            pollMpesaStatus(checkoutRequestId).catch((error) => {
                console.error('M-Pesa status check failed', error);
                setMessage(error.message || 'Unable to check payment status.', 'error');
            });
        }, pollIntervalMs);
    }

    async function startMpesaPayment(phone) {
        setMessage('Sending M-Pesa prompt...', null);
        const response = await fetch('/api/mpesa/stkpush', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone,
                amount: state.amount,
                sessionType: state.sessionType,
                description: sessionLabels[state.sessionType] || 'Bloomly Charla'
            })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.error || 'Unable to start M-Pesa payment.');
        }
        if (!result.CheckoutRequestID) {
            throw new Error('M-Pesa did not return a checkout request id.');
        }
        setMessage('Payment pending. Approve the M-Pesa prompt on your phone.', null);
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
                cancelUrl: `${window.location.origin}${window.location.pathname}?payment_cancelled=1`
            })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.error || 'Unable to start card payment.');
        }
        if (!result.checkoutUrl) {
            throw new Error('Stripe Checkout did not return a payment link.');
        }
        window.location.href = result.checkoutUrl;
    }

    function showManualPaymentInstructions(error) {
        const sessionLabel = sessionLabels[state.sessionType] || 'Charla';
        console.warn('Online payment unavailable; showing manual payment instructions.', error);
        setMessage(
            `Online payment is not available right now. To reserve ${sessionLabel}, send KSh ${state.amount} via M-Pesa to Bloomly Kenya using your name as the reference. We will be in touch within 24 hours to confirm your session time.`,
            'error'
        );
    }

    async function confirmStripeReturn(sessionId) {
        setBusy(true);
        setMessage('Confirming card payment...', null);
        try {
            const response = await fetch('/api/stripe/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.paid) {
                throw new Error(result.error || 'Card payment was not confirmed.');
            }
            completePayment();
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
            showManualPaymentInstructions(error);
        } finally {
            setBusy(false);
        }
    }

    async function handlePaymentSubmit(event) {
        event.preventDefault();
        if (!form) return;

        const provider = getSelectedProvider();
        const formData = new FormData(form);
        const acceptedTerms = formData.get('terms') === 'on';
        const phone = String(formData.get('phone') || '').trim();

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
            showManualPaymentInstructions(error);
        } finally {
            setBusy(false);
        }
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
        form.addEventListener('change', () => {
            refreshPaymentMethod();
            refreshSubmitState();
        });
    }

    selectSession('standard');
    refreshPaymentMethod();
    refreshSubmitState();

    const params = new URLSearchParams(window.location.search);
    const stripeSessionId = params.get('stripe_session_id');
    if (stripeSessionId) {
        void confirmStripeReturn(stripeSessionId);
    } else if (params.get('payment_cancelled') === '1') {
        setMessage('Card payment was cancelled. Choose a payment method to try again.', 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
})();
