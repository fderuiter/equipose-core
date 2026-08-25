/**
 * @jest-environment jsdom
 */

const GlobalNav = require('./global-nav');

describe('GlobalNav Custom Element', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    // Clear static instance
    GlobalNav.instance = null;
  });

  afterEach(() => {
    // Cleanup any lingering global-nav instances
    const el = document.querySelector('global-nav');
    if (el) {
      el.remove();
    }
    GlobalNav.instance = null;
  });

  test('should register as a custom element "global-nav"', () => {
    expect(customElements.get('global-nav')).toBe(GlobalNav);
  });

  test('should initialize via GlobalNav.init() and append to body', () => {
    const instance = GlobalNav.init({ activeRoute: 'app1', activeStudy: 'Study-ABC' });
    expect(instance).toBeInstanceOf(GlobalNav);
    expect(document.body.firstChild).toBe(instance);
    expect(instance.activeRoute).toBe('app1');
    expect(instance.activeStudy).toBe('Study-ABC');
  });

  test('should render internal structure inside Shadow DOM', () => {
    const el = document.createElement('global-nav');
    document.body.appendChild(el);
    
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot.mode).toBe('open');
    
    const nav = el.shadowRoot.getElementById('global-nav');
    expect(nav).not.toBeNull();
    expect(nav.querySelector('.nav-brand').textContent.trim()).toBe('Equipose');
  });

  test('should observe and sync attributes with properties', () => {
    const el = document.createElement('global-nav');
    document.body.appendChild(el);

    // 1. Attribute -> Property
    el.setAttribute('active-route', 'app2');
    expect(el.activeRoute).toBe('app2');

    el.setAttribute('active-study', 'Study-XYZ');
    expect(el.activeStudy).toBe('Study-XYZ');

    // 2. Property -> Attribute
    el.activeRoute = 'app3';
    expect(el.getAttribute('active-route')).toBe('app3');

    el.activeStudy = 'Study-123';
    expect(el.getAttribute('active-study')).toBe('Study-123');
  });

  test('should display active-study badge if active-study is set', () => {
    const el = document.createElement('global-nav');
    el.activeStudy = 'Trial-999';
    document.body.appendChild(el);

    const badge = el.shadowRoot.querySelector('.active-study-badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent.trim()).toBe('Trial-999');

    // Remove active study and expect badge to disappear
    el.activeStudy = '';
    const updatedBadge = el.shadowRoot.querySelector('.active-study-badge');
    expect(updatedBadge).toBeNull();
  });

  test('should parse JSON and handle string user-data properties and attributes', () => {
    const el = document.createElement('global-nav');
    document.body.appendChild(el);

    // Set JSON as object property
    const userObj = { username: 'testuser', email: 'test@equipose.com' };
    el.userData = userObj;
    expect(el.getAttribute('user-data')).toBe(JSON.stringify(userObj));
    expect(el.userData).toEqual(userObj);

    // Rendered session name
    const userNameEl = el.shadowRoot.querySelector('.user-name');
    expect(userNameEl.textContent.trim()).toBe('testuser');

    // Set as raw string attribute
    el.setAttribute('user-data', 'admin_user');
    expect(el.userData).toBe('admin_user');
  });

  test('should reuse existing stylesheet and style elements on render to prevent flashes', () => {
    const el = document.createElement('global-nav');
    document.body.appendChild(el);

    const firstLink = el.shadowRoot.getElementById('theme-link');
    const firstStyle = el.shadowRoot.getElementById('custom-style');

    expect(firstLink).not.toBeNull();
    expect(firstStyle).not.toBeNull();

    // Trigger re-render by changing attribute
    el.activeRoute = 'app1';

    const secondLink = el.shadowRoot.getElementById('theme-link');
    const secondStyle = el.shadowRoot.getElementById('custom-style');

    expect(firstLink).toBe(secondLink);
    expect(firstStyle).toBe(secondStyle);
  });

  test('should toggle mobile menu when clicking nav-toggle', () => {
    const el = document.createElement('global-nav');
    document.body.appendChild(el);

    const toggleBtn = el.shadowRoot.querySelector('.nav-toggle');
    const menuEl = el.shadowRoot.querySelector('#nav-menu');

    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
    expect(menuEl.getAttribute('aria-hidden')).toBe('true');
    expect(menuEl.classList.contains('open')).toBe(false);

    // Click toggle button
    toggleBtn.click();

    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    expect(menuEl.getAttribute('aria-hidden')).toBe('false');
    expect(menuEl.classList.contains('open')).toBe(true);

    // Click again to close
    toggleBtn.click();

    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
    expect(menuEl.getAttribute('aria-hidden')).toBe('true');
    expect(menuEl.classList.contains('open')).toBe(false);
  });

  test('should listen to auth-state-changed window events and update user session', () => {
    const el = document.createElement('global-nav');
    document.body.appendChild(el);

    // Initially logged out/login link shown
    expect(el.shadowRoot.querySelector('.btn-login')).not.toBeNull();

    // Dispatch auth state event
    const authData = { username: 'john_doe' };
    window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: authData }));

    expect(el.userData).toEqual(authData);
    expect(el.shadowRoot.querySelector('.user-name').textContent.trim()).toBe('john_doe');
    expect(el.shadowRoot.querySelector('.btn-logout')).not.toBeNull();

    // Dispatch null state (logout)
    window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: null }));
    expect(el.userData).toBeNull();
    expect(el.shadowRoot.querySelector('.btn-login')).not.toBeNull();
  });

  test('should cleanup window event listeners in disconnectedCallback', () => {
    const el = document.createElement('global-nav');
    document.body.appendChild(el);

    // Dispatch event to make sure it works while connected
    window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { username: 'connected' } }));
    expect(el.userData).toEqual({ username: 'connected' });

    // Disconnect
    el.remove();

    // Dispatch event after disconnect, should NOT update el.userData
    window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { username: 'disconnected' } }));
    expect(el.userData).toEqual({ username: 'connected' });
  });

  test('should destroy programmatically and clean up DOM', () => {
    const instance = GlobalNav.init({ activeRoute: 'app3' });
    expect(document.body.contains(instance)).toBe(true);

    instance.destroy();

    expect(document.body.contains(instance)).toBe(false);
    expect(GlobalNav.instance).toBeNull();
  });
});
