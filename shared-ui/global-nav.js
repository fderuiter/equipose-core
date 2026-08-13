const ParentClass = (typeof HTMLElement !== 'undefined') ? HTMLElement : class {};

class GlobalNav extends ParentClass {
  constructor(config = {}) {
    super();
    this._eventListenersMap = new Map();
    this.config = {
      activeRoute: '',
      redirectUrl: '/',
      onLogout: null,
      ...config
    };
  }

  static init(config) {
    if (!this.instance) {
      let navEl = document.querySelector('global-nav');
      if (!navEl) {
        const existingIdEl = document.getElementById('global-nav');
        if (existingIdEl && existingIdEl.tagName === 'GLOBAL-NAV') {
          navEl = existingIdEl;
        } else {
          navEl = document.createElement('global-nav');
          navEl.id = 'global-nav';
          if (existingIdEl) {
            existingIdEl.replaceWith(navEl);
          } else {
            document.body.insertBefore(navEl, document.body.firstChild);
          }
        }
      }
      
      if (config) {
        if (config.activeRoute) {
          navEl.setAttribute('active-route', config.activeRoute);
        }
        if (config.redirectUrl !== undefined) {
          navEl.config.redirectUrl = config.redirectUrl;
        }
        if (config.onLogout !== undefined) {
          navEl.config.onLogout = config.onLogout;
        }
      }
      this.instance = navEl;
    }
    return this.instance;
  }

  static get observedAttributes() {
    return ['active-route'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'active-route') {
      this.config.activeRoute = newValue || '';
      this.updateActiveHighlight();
    }
  }

  connectedCallback() {
    this.initDOM();
    this.bindEvents();
    
    const activeRouteAttr = this.getAttribute('active-route');
    if (activeRouteAttr) {
      this.config.activeRoute = activeRouteAttr;
    }
    this.updateActiveHighlight();
  }

  disconnectedCallback() {
    this.destroy();
  }

  initDOM() {
    if (!this.id) {
      this.id = 'global-nav';
    }
    this.render();
  }

  render() {
    this.innerHTML = `
      <div class="nav-container">
        <div class="nav-brand">
          <a href="/">Equipose</a>
        </div>
        <div class="nav-menu" id="nav-menu" aria-hidden="true">
          <a href="/app1/" class="${this.config.activeRoute === 'app1' ? 'active' : ''}">App 1 (Modern)</a>
          <a href="/app2/" class="${this.config.activeRoute === 'app2' ? 'active' : ''}">App 2</a>
          <a href="/app3/" class="${this.config.activeRoute === 'app3' ? 'active' : ''}">App 3 (Legacy Tomcat)</a>
        </div>
        <div class="nav-user-session" id="user-session">
          <!-- Dynamically populated -->
        </div>
        <button class="nav-toggle" aria-expanded="false" aria-haspopup="true">
          <span>Menu</span>
        </button>
      </div>
    `;
    this.updateActiveHighlight();
  }

  updateActiveHighlight() {
    const activeRoute = this.getAttribute('active-route') || this.config.activeRoute || '';
    const menuEl = this.querySelector('#nav-menu');
    if (menuEl) {
      const links = menuEl.querySelectorAll('a');
      links.forEach(link => {
        const href = link.getAttribute('href') || '';
        let appKey = '';
        if (href.includes('/app1/')) appKey = 'app1';
        else if (href.includes('/app2/')) appKey = 'app2';
        else if (href.includes('/app3/')) appKey = 'app3';

        if (appKey && appKey === activeRoute) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }
  }

  bindEvents() {
    this.toggleBtn = this.querySelector('.nav-toggle');
    this.menuEl = this.querySelector('#nav-menu');
    
    this.toggleHandler = () => {
      const isOpen = this.toggleBtn.getAttribute('aria-expanded') === 'true';
      this.toggleMobileMenu(!isOpen);
    };
    
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', this.toggleHandler);
    }

    this.clickNavigationHandler = (e) => {
      const anchor = e.target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      const hasListener = this.hasEventListener('navigate') || this.hasEventListener('active-route');
      if (hasListener) {
        let appKey = '';
        if (href.includes('/app1/')) appKey = 'app1';
        else if (href.includes('/app2/')) appKey = 'app2';
        else if (href.includes('/app3/')) appKey = 'app3';

        const navigateEvent = new CustomEvent('navigate', {
          detail: { href: href, route: appKey },
          cancelable: true,
          bubbles: true
        });
        
        const activeRouteEvent = new CustomEvent('active-route', {
          detail: { href: href, route: appKey },
          cancelable: true,
          bubbles: true
        });

        const navigatePrevented = !this.dispatchEvent(navigateEvent);
        const activeRoutePrevented = !this.dispatchEvent(activeRouteEvent);

        const isModern = href.includes('/app1/');
        if (navigatePrevented || activeRoutePrevented || (isModern && hasListener)) {
          e.preventDefault();
        }
      }
    };
    
    this.addEventListener('click', this.clickNavigationHandler);

    this.authHandler = (e) => {
      if (e && e.detail) {
        this.renderUserSession(e.detail);
      } else {
        this.renderUserSession(null);
      }
    };
    window.addEventListener('auth-state-changed', this.authHandler);

    this.renderUserSession(null);
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
    const sessionEl = this.querySelector('#user-session');
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
      
      if (this.config.onLogout) {
        this.config.onLogout();
      }

      window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: null }));

      window.location.href = data.redirect || this.config.redirectUrl || '/';
    } catch (err) {
      console.error('Logout error:', err);
      window.location.href = this.config.redirectUrl || '/';
    }
  }

  destroy() {
    if (this.toggleBtn && this.toggleHandler) {
      this.toggleBtn.removeEventListener('click', this.toggleHandler);
    }
    if (this.clickNavigationHandler) {
      this.removeEventListener('click', this.clickNavigationHandler);
    }
    window.removeEventListener('auth-state-changed', this.authHandler);
    
    if (GlobalNav.instance === this) {
      GlobalNav.instance = null;
    }
  }

  addEventListener(type, listener, options) {
    super.addEventListener(type, listener, options);
    if (!this._eventListenersMap) {
      this._eventListenersMap = new Map();
    }
    if (!this._eventListenersMap.has(type)) {
      this._eventListenersMap.set(type, new Set());
    }
    this._eventListenersMap.get(type).add(listener);
  }

  removeEventListener(type, listener, options) {
    super.removeEventListener(type, listener, options);
    if (this._eventListenersMap && this._eventListenersMap.has(type)) {
      const set = this._eventListenersMap.get(type);
      set.delete(listener);
      if (set.size === 0) {
        this._eventListenersMap.delete(type);
      }
    }
  }

  hasEventListener(type) {
    return this._eventListenersMap && this._eventListenersMap.has(type) && this._eventListenersMap.get(type).size > 0;
  }
}

if (typeof window !== 'undefined' && window.customElements && !window.customElements.get('global-nav')) {
  window.customElements.define('global-nav', GlobalNav);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GlobalNav;
} else {
  window.GlobalNav = GlobalNav;
}
