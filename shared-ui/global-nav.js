class GlobalNav {
  constructor(config = {}) {
    this.config = {
      activeRoute: '',
      redirectUrl: '/',
      onLogout: null,
      ...config
    };
    this.initDOM();
    this.bindEvents();
  }

  static init(config) {
    if (!this.instance) {
      this.instance = new GlobalNav(config);
    }
    return this.instance;
  }

  initDOM() {
    // Create the navigation container if it doesn't exist
    let navEl = document.getElementById('global-nav');
    if (!navEl) {
      navEl = document.createElement('nav');
      navEl.id = 'global-nav';
      document.body.insertBefore(navEl, document.body.firstChild);
    }
    this.navEl = navEl;
    this.render();
  }

  render() {
    this.navEl.innerHTML = `
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
  }

  bindEvents() {
    this.toggleBtn = this.navEl.querySelector('.nav-toggle');
    this.menuEl = this.navEl.querySelector('#nav-menu');
    
    this.toggleHandler = () => {
      const isOpen = this.toggleBtn.getAttribute('aria-expanded') === 'true';
      this.toggleMobileMenu(!isOpen);
    };
    
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', this.toggleHandler);
    }

    // Subscribe/Listen to auth state events
    this.authHandler = (e) => {
      if (e && e.detail) {
        this.renderUserSession(e.detail);
      }
    };
    window.addEventListener('auth-state-changed', this.authHandler);
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
    const sessionEl = this.navEl.querySelector('#user-session');
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
    // Invalidate the legacy session and clear modern authentication tokens concurrently
    try {
      // Clear client side storage first
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('token');

      // Call the concurrent session invalidation endpoint
      const response = await fetch('/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json().catch(() => ({}));
      
      if (this.config.onLogout) {
        this.config.onLogout();
      }

      // Concurrently dispatch event
      window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: null }));

      // Redirect user to the login/home page
      window.location.href = data.redirect || this.config.redirectUrl || '/';
    } catch (err) {
      console.error('Logout error:', err);
      // Fallback redirect
      window.location.href = this.config.redirectUrl || '/';
    }
  }

  destroy() {
    if (this.toggleBtn && this.toggleHandler) {
      this.toggleBtn.removeEventListener('click', this.toggleHandler);
    }
    window.removeEventListener('auth-state-changed', this.authHandler);
    if (this.navEl && this.navEl.parentNode) {
      this.navEl.parentNode.removeChild(this.navEl);
    }
    GlobalNav.instance = null;
  }
}

// Export if module environment, otherwise expose globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GlobalNav;
} else {
  window.GlobalNav = GlobalNav;
}
