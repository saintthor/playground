/**
 * 测试环境设置
 */

// Mock console methods to avoid noise in tests
global.console = {
    ...console,
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
};

// Mock window.app for global access
global.window = global.window || {};

// Setup DOM environment
beforeEach(() => {
    // Reset document state
    document.head.innerHTML = '';
    document.body.innerHTML = '';

    // Reset console mocks
    vi.clearAllMocks();
});