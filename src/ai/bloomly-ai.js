/**
 * Bloomly AI - lightweight chat experience
 * Teen-centered guidance with safety guardrails
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

    const topicSets = {
        stress: [
            'Try a 3-minute reset: inhale 4, hold 4, exhale 6.',
            'Pick one tiny task that you can finish today.',
            'Write down what’s loud in your head, then choose one priority.',
            'Move your body for 5–10 minutes to release tension.'
        ],
        focus: [
            'Use a 25-minute focus sprint with a 5-minute break.',
            'Turn on “Do Not Disturb” and place your phone out of reach.',
            'Start with the easiest task to build momentum.',
            'Study with a low, steady playlist or white noise.'
        ],
        habits: [
            'Stack one habit onto something you already do daily.',
            'Track progress with a simple checkmark, not perfection.',
            'Set a tiny goal: 5 minutes of practice is enough.',
            'Reward yourself after consistent effort, not just results.'
        ],
        confidence: [
            'Write down one win from today, even if it’s small.',
            'Practice “I’m learning” language instead of “I’m bad at it.”',
            'Choose one outfit or task that makes you feel capable.',
            'Talk to yourself like you would a close friend.'
        ],
        relationships: [
            'Start with: “Hey, I care about you—want to talk?”',
            'Listen first, then ask how you can support them.',
            'Set boundaries if the situation feels heavy.',
            'Encourage a trusted adult if things feel serious.'
        ],
        sleep: [
            'Dim your lights 30–60 minutes before bed.',
            'Put your phone on the other side of the room.',
            'Do a 2-minute breathing routine to slow your thoughts.',
            'Keep a short “brain dump” list by your bed.'
        ],
        school: [
            'Break work into three small steps, not one big task.',
            'Start with the assignment that stresses you most.',
            'Study with a friend for accountability, then solo focus.',
            'Plan for one “catch-up” slot this week.'
        ],
        general: [
            'Pause and name what you’re feeling in one sentence.',
            'Pick one doable next step instead of the whole problem.',
            'Check in with your body: water, food, movement, rest.',
            'Reach out to someone you trust if it feels heavy.'
        ]
    };

    const closers = [
        'You’re not alone in this—small steps count.',
        'You’re doing better than you think. I’m proud of you.',
        'If today feels heavy, take it one tiny step at a time.',
        'You’ve got this—steady progress is still progress.'
    ];

    const unsafePhrases = [
        'suicide', 'kill myself', 'self-harm', 'self harm', 'end my life',
        'hurt myself', 'cut myself'
    ];

    const illegalPhrases = ['cheat', 'steal', 'hack', 'drugs', 'weapon'];
    const medicalPhrases = ['diagnose', 'medication', 'prescription', 'therapy dose'];

    function addMessage({ sender, opener, bullets, closing, text }) {
        const wrapper = document.createElement('div');
        wrapper.className = `ai-message ai-message--${sender}`;

        const bubble = document.createElement('div');
        bubble.className = 'ai-bubble';

        if (text) {
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
    }

    function pickBullets(topic, count = 3) {
        const options = topicSets[topic] || topicSets.general;
        const shuffled = [...options].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    function detectTopic(message) {
        const text = message.toLowerCase();
        if (text.match(/stress|overwhelm|anxious|anxiety|panic|burnout|pressure/)) return 'stress';
        if (text.match(/focus|distract|procrast|study|homework|exam|test/)) return 'focus';
        if (text.match(/habit|routine|discipline|consisten|healthy/)) return 'habits';
        if (text.match(/confidence|insecure|self esteem|shy/)) return 'confidence';
        if (text.match(/friend|relationship|breakup|lonely/)) return 'relationships';
        if (text.match(/sleep|insomnia|tired|night/)) return 'sleep';
        if (text.match(/school|class|grades|assignment/)) return 'school';
        return 'general';
    }

    function containsPhrase(message, phrases) {
        const text = message.toLowerCase();
        return phrases.some((phrase) => text.includes(phrase));
    }

    function buildResponse(message) {
        if (containsPhrase(message, unsafePhrases)) {
            return {
                opener: 'I’m really sorry you’re feeling this way. You deserve support and care.',
                bullets: [
                    'If you feel in danger, please reach out to a trusted adult or local crisis line.',
                    'You can also tell a friend, family member, or school counselor.',
                    'If it helps, we can focus on a small grounding step right now.'
                ],
                closing: 'You matter, and you don’t have to carry this alone.'
            };
        }

        if (containsPhrase(message, illegalPhrases)) {
            return {
                opener: 'I can’t help with that, but I can help with a safer approach.',
                bullets: [
                    'Tell me what you’re trying to achieve.',
                    'We can break it into steps that keep you safe and on track.',
                    'If it involves school, I can help you plan a catch-up path.'
                ],
                closing: 'Let’s find a way forward that protects you.'
            };
        }

        if (containsPhrase(message, medicalPhrases)) {
            return {
                opener: 'I’m not the best source for medical advice, but I can share general support tips.',
                bullets: [
                    'Try a small routine that calms your body and mind.',
                    'Track how you’re feeling to notice patterns.',
                    'If you can, talk to a trusted adult or health professional.'
                ],
                closing: 'You deserve real support—asking for help is a strong step.'
            };
        }

        const topic = detectTopic(message);
        const bullets = pickBullets(topic, 3);
        const closers = pickBullets('general', 1);

        return {
            opener: 'Thanks for sharing. Let’s make this feel more manageable.',
            bullets,
            closing: closers[0] || closers[0]
        };
    }

    function handleSend(message) {
        if (!message.trim()) return;
        addMessage({ sender: 'user', text: message });
        inputEl.value = '';
        sendBtn.disabled = true;

        setTimeout(() => {
            const response = buildResponse(message);
            addMessage({ sender: 'bot', ...response });
            sendBtn.disabled = false;
            inputEl.focus();
        }, 350);
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
