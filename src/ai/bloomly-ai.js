/**
 * Bloomly AI - live AI chat experience
 * Sends messages to a model endpoint and streams responses back.
 */

(function() {
    'use strict';

    const chatRoot = document.querySelector('[data-ai-chat]');
    if (!chatRoot) return;

    const logEl = chatRoot.querySelector('[data-chat-log]');
    const formEl = chatRoot.querySelector('[data-chat-form]');
    const inputEl = chatRoot.querySelector('[data-chat-input]');
    const sendBtn = chatRoot.querySelector('[data-chat-send]');
    const chipContainer = chatRoot.querySelector('[data-ai-chips]');

    const SESSION_KEY = 'bloomly-ai:session';
    const API_ENDPOINT = '/api/ai';
    const MAX_HISTORY = 10;

    function loadSession() {
        try {
            const stored = sessionStorage.getItem(SESSION_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            return [];
        }
    }

    function saveSession(messages) {
        try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages));
        } catch (error) {
            // ignore storage failures
        }
    }

    let conversation = loadSession();

    function addMessage({ sender, opener, bullets, closing, text, isTyping }) {
        const wrapper = document.createElement('div');
        wrapper.className = `ai-message ai-message--${sender}`;

        const bubble = document.createElement('div');
        bubble.className = 'ai-bubble';

        if (isTyping) {
            bubble.textContent = 'Bloomly AI is thinking…';
        } else if (text) {
            const paragraph = document.createElement('p');
            paragraph.textContent = text;
            bubble.appendChild(paragraph);
        } else {
            if (opener) {
                const openerEl = document.createElement('p');
                openerEl.className = 'ai-opener';
                openerEl.textContent = opener;
                bubble.appendChild(openerEl);
            }

            if (Array.isArray(bullets) && bullets.length) {
                const list = document.createElement('ul');
                list.className = 'ai-bullets';
                bullets.forEach((item) => {
                    const li = document.createElement('li');
                    li.textContent = item;
                    list.appendChild(li);
                });
                bubble.appendChild(list);
            }

            if (closing) {
                const closingEl = document.createElement('p');
                closingEl.className = 'ai-closing';
                closingEl.textContent = closing;
                bubble.appendChild(closingEl);
            }
        }

        wrapper.appendChild(bubble);
        logEl.appendChild(wrapper);
        logEl.scrollTop = logEl.scrollHeight;
        return wrapper;
    }

    function parseAssistantReply(text) {
        const lines = String(text || '').split('\n').map((line) => line.trim()).filter(Boolean);
        const bullets = lines.filter((line) => line.startsWith('-') || line.startsWith('•'))
            .map((line) => line.replace(/^[-•]\s*/, '').trim())
            .filter(Boolean);
        const nonBullets = lines.filter((line) => !(line.startsWith('-') || line.startsWith('•')));
        if (!nonBullets.length) {
            return { text };
        }

        const opener = nonBullets[0];
        const closing = nonBullets.length > 1 ? nonBullets[nonBullets.length - 1] : '';
        return {
            opener,
            bullets: bullets.slice(0, 4),
            closing
        };
    }

    function appendToConversation(role, content) {
        conversation.push({ role, content });
        if (conversation.length > MAX_HISTORY * 2) {
            conversation = conversation.slice(-MAX_HISTORY * 2);
        }
        saveSession(conversation);
    }

    async function requestAIResponse(message) {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [...conversation, { role: 'user', content: message }]
            })
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const errorMessage = payload.error || 'Bloomly AI could not respond right now.';
            throw new Error(errorMessage);
        }

        return payload.reply || '';
    }

    async function handleSend(message) {
        const trimmed = message.trim();
        if (!trimmed) return;

        addMessage({ sender: 'user', text: trimmed });
        appendToConversation('user', trimmed);
        inputEl.value = '';
        sendBtn.disabled = true;

        const typingBubble = addMessage({ sender: 'bot', isTyping: true });

        try {
            const replyText = await requestAIResponse(trimmed);
            appendToConversation('assistant', replyText);
            typingBubble.remove();
            addMessage({ sender: 'bot', ...parseAssistantReply(replyText) });
        } catch (error) {
            typingBubble.remove();
            addMessage({
                sender: 'bot',
                opener: 'I’m having trouble responding right now.',
                bullets: [
                    'Please try again in a moment.',
                    'If the issue continues, refresh the page.',
                    'You can also explore the blog for gentle support.'
                ],
                closing: 'I’m here when you’re ready.'
            });
        } finally {
            sendBtn.disabled = false;
            inputEl.focus();
        }
    }

    function init() {
        addMessage({
            sender: 'bot',
            opener: 'Hey! I’m Bloomly AI.',
            bullets: [
                'Share what’s on your mind.',
                'I’ll offer a few practical steps.',
                'We can keep it short and calm.'
            ],
            closing: 'What do you want to talk about?'
        });
    }

    if (formEl) {
        formEl.addEventListener('submit', (event) => {
            event.preventDefault();
            handleSend(inputEl.value);
        });
    }

    if (chipContainer) {
        chipContainer.addEventListener('click', (event) => {
            const chip = event.target.closest('[data-chip]');
            if (!chip) return;
            handleSend(chip.dataset.chip || chip.textContent || '');
        });
    }

    init();
})();
