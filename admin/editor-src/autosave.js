export function debounce(fn, delay = 800) {
    let timer = 0;
    return (...args) => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => fn(...args), delay);
    };
}

export class EditorAutosave {
    constructor({ keyPrefix = 'bloomly:cms-draft', delay = 1400, onStatus }) {
        this.keyPrefix = keyPrefix;
        this.delay = delay;
        this.onStatus = onStatus || (() => {});
        this.saveLocal = debounce((key, payload) => this.writeLocal(key, payload), delay);
    }

    getKey(slugOrId) {
        return `${this.keyPrefix}:${slugOrId || 'new'}`;
    }

    schedule(slugOrId, payload) {
        this.onStatus('Saving draft...');
        this.saveLocal(this.getKey(slugOrId), payload);
    }

    writeLocal(key, payload) {
        try {
            localStorage.setItem(
                key,
                JSON.stringify({
                    savedAt: new Date().toISOString(),
                    payload,
                })
            );
            this.onStatus('Draft autosaved locally');
        } catch {
            this.onStatus('Autosave unavailable');
        }
    }

    read(slugOrId) {
        try {
            const raw = localStorage.getItem(this.getKey(slugOrId));
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    clear(slugOrId) {
        try {
            localStorage.removeItem(this.getKey(slugOrId));
        } catch {
            // Ignore storage failures.
        }
    }
}
