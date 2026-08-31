class GlobalNav extends HTMLElement {
  constructor(config = {}) {
    super();
    this._config = {
      activeRoute: '',
      redirectUrl: '/',
      onLogout: null,
      activeStudy: '',
      userData: null,
      themeUrl: '/shared-ui/equipose-theme.css',
      ...config
    };
    
    // Attach the Shadow DOM shadow root
    this.attachShadow({ mode: 'open' });
    this._initialized = false;
    this._authHandlerBound = false;
  }

  static init(config = {}) {
    if (!this.instance) {
      let el = document.querySelector('global-nav');
      if (!el) {
        el = document.createElement('global-nav');
        document.body.insertBefore(el, document.body.firstChild);
      }
      
      // Apply properties from config
      if (config.activeRoute !== undefined) el.activeRoute = config.activeRoute;
      if (config.redirectUrl !== undefined) el.redirectUrl = config.redirectUrl;
      if (config.onLogout !== undefined) el.onLogout = config.onLogout;
      if (config.activeStudy !== undefined) el.activeStudy = config.activeStudy;
      if (config.userData !== undefined) el.userData = config.userData;
      if (config.themeUrl !== undefined) el.themeUrl = config.themeUrl;
      
      this.instance = el;
    }
    return this.instance;
  }

  static get observedAttributes() {
    return ['active-route', 'active-study', 'user-data', 'theme-url', 'redirect-url'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === 'active-route') {
      this._config.activeRoute = newValue || '';
    } else if (name === 'active-study') {
      this._config.activeStudy = newValue || '';
    } else if (name === 'user-data') {
      try {
        this._config.userData = newValue ? JSON.parse(newValue) : null;
      } catch (e) {
        this._config.userData = newValue || null;
      }
    } else if (name === 'theme-url') {
      this._config.themeUrl = newValue || '/shared-ui/equipose-theme.css';
    } else if (name === 'redirect-url') {
      this._config.redirectUrl = newValue || '/';
    }

    if (this._initialized) {
      this.render();
    }
  }

  connectedCallback() {
    this._initialized = true;

    // Handle framework property upgrades before connection
    this._upgradeProperty('activeRoute');
    this._upgradeProperty('activeStudy');
    this._upgradeProperty('userData');
    this._upgradeProperty('themeUrl');
    this._upgradeProperty('redirectUrl');
    this._upgradeProperty('onLogout');
    
    // Check initial attributes to override any default config values
    if (this.hasAttribute('active-route')) {
      this._config.activeRoute = this.getAttribute('active-route');
    }
    if (this.hasAttribute('active-study')) {
      this._config.activeStudy = this.getAttribute('active-study');
    }
    if (this.hasAttribute('user-data')) {
      const attr = this.getAttribute('user-data');
      try {
        this._config.userData = JSON.parse(attr);
      } catch (e) {
        this._config.userData = attr;
      }
    }
    if (this.hasAttribute('theme-url')) {
      this._config.themeUrl = this.getAttribute('theme-url');
    }
    if (this.hasAttribute('redirect-url')) {
      this._config.redirectUrl = this.getAttribute('redirect-url');
    }

    this.render();
  }

  _upgradeProperty(prop) {
    if (this.hasOwnProperty(prop)) {
      const value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }

  disconnectedCallback() {
    if (this._authHandlerBound) {
      if (this.authHandler) {
        window.removeEventListener('auth-state-changed', this.authHandler);
      }
      if (this.messageHandler) {
        window.removeEventListener('message', this.messageHandler);
      }
      this._authHandlerBound = false;
    }
  }

  _isOriginAllowed(origin) {
    if (!origin) return false;
    if (typeof window !== 'undefined' && origin === window.location.origin) return true;
    const configured = (typeof window !== 'undefined' && window.EQUIPOSE_ALLOWED_ORIGINS) ||
                       (typeof window !== 'undefined' && window.EquiposeConfig && (window.EquiposeConfig.ALLOWED_ORIGINS || window.EquiposeConfig.allowedOrigins)) ||
                       (typeof window !== 'undefined' && window.ALLOWED_ORIGINS) ||
                       (typeof window !== 'undefined' && window.allowedOrigins) ||
                       this._config.allowedOrigins;
    if (!configured) return false;
    const allowedList = Array.isArray(configured)
      ? configured
      : String(configured).split(',').map(s => s.trim());
    return allowedList.includes(origin);
  }

  postMessageToParent(message, targetOrigin) {
    const origin = targetOrigin || (typeof window !== 'undefined' && window.location ? window.location.origin : '*');
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      window.parent.postMessage(message, origin === '*' ? window.location.origin : origin);
    }
  }

  // Getters and Setters
  get activeRoute() {
    return this.getAttribute('active-route') || this._config.activeRoute || '';
  }

  set activeRoute(val) {
    if (val) {
      this.setAttribute('active-route', val);
    } else {
      this.removeAttribute('active-route');
    }
  }

  get activeStudy() {
    return this.getAttribute('active-study') || this._config.activeStudy || '';
  }

  set activeStudy(val) {
    if (val) {
      this.setAttribute('active-study', val);
    } else {
      this.removeAttribute('active-study');
    }
  }

  get userData() {
    const attr = this.getAttribute('user-data');
    if (attr) {
      try {
        return JSON.parse(attr);
      } catch (e) {
        return attr;
      }
    }
    return this._config.userData || null;
  }

  set userData(val) {
    if (val) {
      if (typeof val === 'object') {
        const jsonStr = JSON.stringify(val);
        this.setAttribute('user-data', jsonStr);
        this._config.userData = val;
      } else {
        this.setAttribute('user-data', val);
        this._config.userData = val;
      }
    } else {
      this.removeAttribute('user-data');
      this._config.userData = null;
    }
  }

  get themeUrl() {
    return this.getAttribute('theme-url') || this._config.themeUrl || '/shared-ui/equipose-theme.css';
  }

  set themeUrl(val) {
    if (val) {
      this.setAttribute('theme-url', val);
    } else {
      this.removeAttribute('theme-url');
    }
  }

  get redirectUrl() {
    return this.getAttribute('redirect-url') || this._config.redirectUrl || '/';
  }

  set redirectUrl(val) {
    if (val) {
      this.setAttribute('redirect-url', val);
    } else {
      this.removeAttribute('redirect-url');
    }
  }

  get onLogout() {
    return this._config.onLogout || null;
  }

  set onLogout(val) {
    this._config.onLogout = val;
  }

  // Render method
  render() {
    // 1. Re-use or create the stylesheet link element inside shadow root
    let linkEl = this.shadowRoot.getElementById('theme-link');
    if (!linkEl) {
      linkEl = document.createElement('link');
      linkEl.id = 'theme-link';
      linkEl.rel = 'stylesheet';
      this.shadowRoot.appendChild(linkEl);
    }
    const currentThemeUrl = this.themeUrl;
    if (linkEl.getAttribute('href') !== currentThemeUrl) {
      linkEl.setAttribute('href', currentThemeUrl);
    }

    // 2. Re-use or create inline custom styles
    let styleEl = this.shadowRoot.getElementById('custom-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'custom-style';
      styleEl.textContent = `
        :host {
          display: block;
        }
        .active-study-badge {
          background-color: var(--primary-color, #005A9C);
          color: var(--white, #FFFFFF);
          padding: 4px 8px;
          font-size: 0.8rem;
          border-radius: 12px;
          margin-left: 10px;
          font-weight: 600;
          display: inline-block;
          vertical-align: middle;
        }
      `;
      this.shadowRoot.appendChild(styleEl);
    }

    // 3. Re-use or create nav element
    let navEl = this.shadowRoot.getElementById('global-nav');
    if (!navEl) {
      navEl = document.createElement('nav');
      navEl.id = 'global-nav';
      this.shadowRoot.appendChild(navEl);
    }

    const activeRoute = this.activeRoute;
    const activeStudy = this.activeStudy;

    navEl.innerHTML = `
      <div class="nav-container">
        <div class="nav-brand">
          <a href="/">Equipose</a>
          ${activeStudy ? `<span class="active-study-badge">${activeStudy}</span>` : ''}
        </div>
        <div class="nav-menu" id="nav-menu" aria-hidden="true">
          <a href="/app1/" class="${activeRoute === 'app1' ? 'active' : ''}">App 1 (Modern)</a>
          <a href="/app2/" class="${activeRoute === 'app2' ? 'active' : ''}">App 2</a>
          <a href="/app3/" class="${activeRoute === 'app3' ? 'active' : ''}">App 3 (Legacy Tomcat)</a>
        </div>
        <div class="nav-user-session" id="user-session">
          <!-- Dynamically populated -->
        </div>
        <button class="nav-toggle" aria-expanded="false" aria-haspopup="true">
          <span>Menu</span>
        </button>
      </div>
    `;

    this.bindEvents();
    this.renderUserSession(this.userData);
  }

  bindEvents() {
    const navEl = this.shadowRoot.getElementById('global-nav');
    if (!navEl) return;

    this.toggleBtn = navEl.querySelector('.nav-toggle');
    this.menuEl = navEl.querySelector('#nav-menu');

    this.toggleHandler = () => {
      const isOpen = this.toggleBtn.getAttribute('aria-expanded') === 'true';
      this.toggleMobileMenu(!isOpen);
    };

    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', this.toggleHandler);
    }

    if (!this._authHandlerBound) {
      this.authHandler = (e) => {
        if (e && e.detail !== undefined) {
          this.userData = e.detail;
        }
      };
      window.addEventListener('auth-state-changed', this.authHandler);

      this.messageHandler = (e) => {
        if (!this._isOriginAllowed(e.origin)) {
          return;
        }
        if (!e.data) return;
        let data = e.data;
        if (typeof data === 'string' && data.startsWith('{')) {
          try {
            data = JSON.parse(data);
          } catch (err) {
            return;
          }
        }
        if (!data || typeof data !== 'object') return;

        if (data.type === 'auth-state-changed' || data.action === 'auth-state-changed') {
          this.userData = data.detail !== undefined ? data.detail : data.userData;
        } else if (data.type === 'logout' || data.action === 'logout') {
          this.logout();
        } else if (data.type === 'navigate' || data.action === 'navigate') {
          if (data.route) this.activeRoute = data.route;
        }
      };
      window.addEventListener('message', this.messageHandler);

      this._authHandlerBound = true;
    }
  }

  toggleMobileMenu(isOpen) {
    if (this.toggleBtn && this.menuEl) {
      this.toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      this.menuEl.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      if (isOpen) {
        this.menuEl.classList.add('open');
      } else {
        this.menuEl.classList.remove('open');
      }
    }
  }

  renderUserSession(userData) {
    const navEl = this.shadowRoot.getElementById('global-nav');
    if (!navEl) return;

    const sessionEl = navEl.querySelector('#user-session');
    if (!sessionEl) return;

    if (userData && (userData.username || userData.name || userData.email)) {
      const displayName = userData.username || userData.name || userData.email;
      sessionEl.innerHTML = `
        <div class="user-profile-dropdown">
          <span class="user-name">${displayName}</span>
          <button class="btn-logout" id="btn-logout">Logout</button>
        </div>
      `;

      const logoutBtn = sessionEl.querySelector('#btn-logout');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => this.logout());
      }
    } else {
      sessionEl.innerHTML = `
        <a href="/login" class="btn-login">Login</a>
      `;
    }
  }

  async logout() {
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('token');

      const response = await fetch('/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json().catch(() => ({}));

      if (this._config.onLogout) {
        this._config.onLogout();
      }

      window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: null }));

      window.location.href = data.redirect || this.redirectUrl || '/';
    } catch (err) {
      console.error('Logout error:', err);
      window.location.href = this.redirectUrl || '/';
    }
  }

  destroy() {
    this.disconnectedCallback();
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
    GlobalNav.instance = null;
  }
}

// Register custom element if in window environment
if (typeof window !== 'undefined' && window.customElements) {
  if (!window.customElements.get('global-nav')) {
    window.customElements.define('global-nav', GlobalNav);
  }
}

// Export if module environment, otherwise expose globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GlobalNav;
} else {
  window.GlobalNav = GlobalNav;
}
