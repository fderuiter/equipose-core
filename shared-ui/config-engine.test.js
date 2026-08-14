/**
 * @jest-environment jsdom
 */

const ConfigEngine = require('./config-engine');

describe('ConfigEngine Custom Element', () => {
  let originalFetch;

  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    window.EquiposeConfig = undefined;
    originalFetch = window.fetch;
  });

  afterEach(() => {
    window.fetch = originalFetch;
    const el = document.querySelector('config-engine');
    if (el) {
      el.remove();
    }
    const alertEl = document.getElementById('equipose-config-diagnostic-alert');
    if (alertEl) {
      alertEl.remove();
    }
  });

  test('should register as a custom element "config-engine"', () => {
    expect(customElements.get('config-engine')).toBe(ConfigEngine);
  });

  test('should fetch and load config successfully, sanitizing sensitive keys in localStorage', async () => {
    const mockConfig = {
      API_URL: 'https://api.equipose.com',
      ENVIRONMENT: 'production',
      userSessionToken: 'sensitive_jwt_token',
      apiKey: 'secret_12345',
      nested: {
        someSecretKey: 'nested_secret',
        publicVal: 'hello'
      }
    };

    window.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockConfig)
      })
    );

    const loadedEventPromise = new Promise((resolve) => {
      window.addEventListener('config-loaded', (e) => {
        resolve(e.detail);
      }, { once: true });
    });

    const el = document.createElement('config-engine');
    document.body.appendChild(el);

    const result = await el.loadConfig();

    // Verify returning full config in memory
    expect(result).toEqual(mockConfig);
    expect(el.config).toEqual(mockConfig);
    expect(window.EquiposeConfig).toEqual(mockConfig);

    // Verify event dispatched
    const eventDetail = await loadedEventPromise;
    expect(eventDetail).toEqual(mockConfig);

    // Verify sanitization in localStorage
    const cachedStr = localStorage.getItem('equipose_config');
    const cachedTimestamp = localStorage.getItem('equipose_config_timestamp');

    expect(cachedStr).not.toBeNull();
    expect(cachedTimestamp).not.toBeNull();

    const cachedObj = JSON.parse(cachedStr);
    expect(cachedObj.API_URL).toBe('https://api.equipose.com');
    expect(cachedObj.ENVIRONMENT).toBe('production');
    
    // Sensitive keys should be removed
    expect(cachedObj.userSessionToken).toBeUndefined();
    expect(cachedObj.apiKey).toBeUndefined();
    expect(cachedObj.nested.someSecretKey).toBeUndefined();
    expect(cachedObj.nested.publicVal).toBe('hello');
  });

  test('should fallback to valid localStorage cache if network fetch fails', async () => {
    const cachedConfig = {
      API_URL: 'https://cached.equipose.com',
      ENVIRONMENT: 'offline-mode'
    };

    localStorage.setItem('equipose_config', JSON.stringify(cachedConfig));
    // Set timestamp to 2 hours ago
    localStorage.setItem('equipose_config_timestamp', (Date.now() - 2 * 60 * 60 * 1000).toString());

    // Mock fetch failure
    window.fetch = jest.fn().mockImplementation(() =>
      Promise.reject(new Error('Network failure'))
    );

    const loadedEventPromise = new Promise((resolve) => {
      window.addEventListener('config-loaded', (e) => {
        resolve(e.detail);
      }, { once: true });
    });

    const el = document.createElement('config-engine');
    document.body.appendChild(el);

    const result = await el.loadConfig();

    expect(result).toEqual(cachedConfig);
    expect(el.config).toEqual(cachedConfig);
    expect(window.EquiposeConfig).toEqual(cachedConfig);

    const eventDetail = await loadedEventPromise;
    expect(eventDetail).toEqual(cachedConfig);

    // No diagnostic alert should be shown
    expect(document.getElementById('equipose-config-diagnostic-alert')).toBeNull();
  });

  test('should fallback to valid localStorage cache if network fetch times out', async () => {
    const cachedConfig = {
      API_URL: 'https://cached-timeout.equipose.com'
    };

    localStorage.setItem('equipose_config', JSON.stringify(cachedConfig));
    localStorage.setItem('equipose_config_timestamp', Date.now().toString());

    // Mock fetch that hangs forever
    window.fetch = jest.fn().mockImplementation(() =>
      new Promise(() => {})
    );

    const el = document.createElement('config-engine');
    el.setAttribute('timeout', '50'); // short timeout for testing
    document.body.appendChild(el);

    const result = await el.loadConfig();

    expect(result).toEqual(cachedConfig);
    expect(el.config).toEqual(cachedConfig);
    expect(window.EquiposeConfig).toEqual(cachedConfig);
  });

  test('should show diagnostic alert and dispatch fail event if fetch fails and cache is expired (>24h)', async () => {
    const cachedConfig = {
      API_URL: 'https://stale.equipose.com'
    };

    localStorage.setItem('equipose_config', JSON.stringify(cachedConfig));
    // Set timestamp to 25 hours ago
    localStorage.setItem('equipose_config_timestamp', (Date.now() - 25 * 60 * 60 * 1000).toString());

    window.fetch = jest.fn().mockImplementation(() =>
      Promise.reject(new Error('Connection lost'))
    );

    const failEventPromise = new Promise((resolve) => {
      window.addEventListener('config-load-failed', (e) => {
        resolve(e.detail);
      }, { once: true });
    });

    const el = document.createElement('config-engine');
    document.body.appendChild(el);

    await expect(el.loadConfig()).rejects.toThrow();

    // Stale config should NOT be loaded
    expect(el.config).toBeNull();
    expect(window.EquiposeConfig).toBeUndefined();

    // Verify diagnostic alert is rendered in the DOM
    const alertEl = document.getElementById('equipose-config-diagnostic-alert');
    expect(alertEl).not.toBeNull();
    expect(alertEl.textContent).toContain('No cached configuration is available offline');

    const failDetail = await failEventPromise;
    expect(failDetail).toBe('Connection lost');
  });

  test('should show diagnostic alert and dispatch fail event if fetch fails and no cache exists', async () => {
    window.fetch = jest.fn().mockImplementation(() =>
      Promise.reject(new Error('Server error'))
    );

    const el = document.createElement('config-engine');
    document.body.appendChild(el);

    await expect(el.loadConfig()).rejects.toThrow();

    const alertEl = document.getElementById('equipose-config-diagnostic-alert');
    expect(alertEl).not.toBeNull();
  });
});
