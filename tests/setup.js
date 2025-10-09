/**
 * Vitest setup file.
 * This file is executed by Vitest before all tests to set up the JSDOM environment.
 * It contains necessary polyfills and global test hooks.
 */
import { webcrypto } from 'node:crypto';
import { TextEncoder, TextDecoder } from 'node:util';

// --- Polyfill missing browser APIs in the JSDOM environment ---

// JSDOM doesn't implement localStorage. We create a simple mock for it.
class LocalStorageMock {
    constructor() {
        this.store = {};
    }
    clear() {
        this.store = {};
    }
    getItem(key) {
        return this.store[key] || null;
    }
    setItem(key, value) {
        this.store[key] = String(value);
    }
    removeItem(key) {
        delete this.store[key];
    }
}
global.localStorage = new LocalStorageMock();
window.localStorage = global.localStorage;

// Polyfill the Web Crypto API
if (!window.crypto) {
    window.crypto = {};
}
if (typeof window.crypto.subtle === 'undefined') {
    window.crypto.subtle = webcrypto.subtle;
}

// Polyfill TextEncoder and TextDecoder, used for crypto operations
window.TextEncoder = TextEncoder;
global.TextEncoder = TextEncoder;
window.TextDecoder = TextDecoder;
global.TextDecoder = TextDecoder;

// Polyfill requestAnimationFrame, used by some UI components
window.requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 0);
global.requestAnimationFrame = window.requestAnimationFrame;
window.cancelAnimationFrame = (id) => clearTimeout(id);
global.cancelAnimationFrame = window.cancelAnimationFrame;


// --- Mocking and Test Lifecycle Hooks ---
const originalConsole = { ...console };
beforeAll(() => {
    global.console = {
        ...originalConsole,
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };
});

beforeEach(() => {
    document.body.innerHTML = `
        <div id="app">
            <div id="control-panel-container"><div id="control-panel" class="panel"><div class="panel-content"></div></div></div>
            <div id="main-panel-container"><div id="main-panel" class="panel"><div class="panel-content"></div></div></div>
            <div id="log-panel-container"><div id="log-panel" class="panel"><div class="panel-content"></div></div></div>
        </div>
    `;
    vi.clearAllMocks();
});

afterAll(() => {
    global.console = originalConsole;
});