class ConfigEngine extends HTMLElement {
  static get observedAttributes() {
    return ['url', 'timeout'];
  }

  constructor() {
    super();
    this._config = null;
    this.url = '/config.json';
    this.timeout = 500;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === 'url') {
      this.url = newValue || '/config.json';
    } else if (name === 'timeout') {
      this.timeout = parseInt(newValue, 10) || 500;
    }
  }

  async connectedCallback() {
    if (!this._config) {
      try {
        await this.loadConfig();
      } catch (e) {
        // Silently catch errors in bootstrap to prevent crashes, as errors are handled within loadConfig
      }
    }
  }

  static sanitize(config) {
    if (!config || typeof config !== 'object') return config;
    const sanitized = {};
    const sensitiveRegex = /token|session|password|key|secret|auth|credentials|jwt|private|api[-_]?key/i;
    for (const [k, v] of Object.entries(config)) {
      if (sensitiveRegex.test(k)) {
        continue;
      }
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        sanitized[k] = ConfigEngine.sanitize(v);
      } else {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }

  async loadConfig() {
    const url = this.getAttribute('url') || this.url || '/config.json';
    const timeoutMs = parseInt(this.getAttribute('timeout'), 10) || this.timeout || 500;

    try {
      const fetchPromise = fetch(url);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Configuration request timed out')), timeoutMs)
      );

      const response = await Promise.race([fetchPromise, timeoutPromise]);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const config = await response.json();
      this._config = config;
      window.EquiposeConfig = config;

      // Cache sanitized config
      const sanitized = ConfigEngine.sanitize(config);
      try {
        localStorage.setItem('equipose_config', JSON.stringify(sanitized));
        localStorage.setItem('equipose_config_timestamp', Date.now().toString());
      } catch (e) {
        console.error('Failed to save configuration to localStorage:', e);
      }

      // Dispatch event
      const event = new CustomEvent('config-loaded', { detail: config, bubbles: true, composed: true });
      this.dispatchEvent(event);
      window.dispatchEvent(event);

      return config;
    } catch (err) {
      console.warn('Configuration fetch failed, attempting local fallback:', err);
      
      // Try local fallback
      let cachedConfigStr = null;
      let cachedTimestampStr = null;
      try {
        cachedConfigStr = localStorage.getItem('equipose_config');
        cachedTimestampStr = localStorage.getItem('equipose_config_timestamp');
      } catch (e) {
        console.error('Failed to read configuration from localStorage:', e);
      }

      const now = Date.now();
      const isExpired = cachedTimestampStr 
        ? (now - parseInt(cachedTimestampStr, 10)) > 24 * 60 * 60 * 1000 
        : true;

      if (cachedConfigStr && !isExpired) {
        try {
          const cachedConfig = JSON.parse(cachedConfigStr);
          this._config = cachedConfig;
          window.EquiposeConfig = cachedConfig;

          const event = new CustomEvent('config-loaded', { detail: cachedConfig, bubbles: true, composed: true });
          this.dispatchEvent(event);
          window.dispatchEvent(event);

          return cachedConfig;
        } catch (e) {
          console.error('Failed to parse cached configuration:', e);
        }
      }

      // No cached configuration or expired, and fetch failed -> show user-friendly diagnostic alert
      this.showDiagnosticAlert();

      const failEvent = new CustomEvent('config-load-failed', { detail: err.message, bubbles: true, composed: true });
      this.dispatchEvent(failEvent);
      window.dispatchEvent(failEvent);

      throw err;
    }
  }

  showDiagnosticAlert() {
    if (document.getElementById('equipose-config-diagnostic-alert')) {
      return;
    }

    const alertDiv = document.createElement('div');
    alertDiv.id = 'equipose-config-diagnostic-alert';
    alertDiv.className = 'equipose-config-alert';
    
    alertDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      box-sizing: border-box;
      padding: 16px;
      background-color: #f8d7da;
      color: #721c24;
      border-bottom: 2px solid #f5c6cb;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      text-align: center;
      z-index: 99999;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 12px;
    `;

    alertDiv.innerHTML = `
      <span style="font-weight: bold; font-size: 16px;">⚠️ Connection Error</span>
      <span>No cached configuration is available offline, and the system could not connect to the remote configuration service. Please check your internet connection and reload.</span>
      <button id="equipose-config-retry-btn" style="
        background-color: #721c24;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        font-size: 12px;
      ">Retry</button>
    `;

    document.body.appendChild(alertDiv);
    
    const retryBtn = alertDiv.querySelector('#equipose-config-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        window.location.reload();
      });
    }
  }

  get config() {
    return this._config;
  }
}

if (typeof window !== 'undefined' && window.customElements) {
  if (!window.customElements.get('config-engine')) {
    window.customElements.define('config-engine', ConfigEngine);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConfigEngine;
} else {
  window.ConfigEngine = ConfigEngine;
}
