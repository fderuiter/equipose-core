const { JSDOM } = require('jsdom');
const assert = require('assert');

async function main() {
  console.log('Starting GlobalNav Web Component Tests...');

  // Set up JSDOM environment
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost/',
    runScripts: 'dangerously'
  });

  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.CustomEvent = dom.window.CustomEvent;
  global.customElements = dom.window.customElements;
  global.localStorage = dom.window.localStorage;
  global.sessionStorage = dom.window.sessionStorage;

  // Mock fetch
  let lastFetchUrl = null;
  let lastFetchOptions = null;
  global.fetch = (url, options) => {
    lastFetchUrl = url;
    lastFetchOptions = options;
    return Promise.resolve({
      json: () => Promise.resolve({ redirect: '/login-success' })
    });
  };

  // Import our Custom Element
  const GlobalNav = require('./global-nav');

  console.log('\n--- Test Case 1: Custom Element Registration ---');
  const registeredClass = customElements.get('global-nav');
  assert.strictEqual(registeredClass, GlobalNav, 'global-nav custom element must be registered');
  console.log('PASS: global-nav element is registered successfully');

  console.log('\n--- Test Case 2: Rendering and Default Behavior ---');
  const navEl = document.createElement('global-nav');
  document.body.appendChild(navEl);

  // Check template elements exist
  const brand = navEl.querySelector('.nav-brand a');
  assert.strictEqual(brand.textContent, 'Equipose', 'Brand name should be Equipose');
  
  const links = navEl.querySelectorAll('#nav-menu a');
  assert.strictEqual(links.length, 3, 'Should have exactly 3 links');
  assert.strictEqual(links[0].getAttribute('href'), '/app1/');
  assert.strictEqual(links[1].getAttribute('href'), '/app2/');
  assert.strictEqual(links[2].getAttribute('href'), '/app3/');
  console.log('PASS: Renders layout identically');

  console.log('\n--- Test Case 3: Attribute Changed Callback & Active Highlights (No DOM Flash) ---');
  // Initially, no link is active
  assert.ok(!links[0].classList.contains('active'));
  
  // Set active-route attribute
  navEl.setAttribute('active-route', 'app1');
  assert.ok(links[0].classList.contains('active'), 'App 1 should now be active');
  assert.ok(!links[1].classList.contains('active'), 'App 2 should not be active');

  // Change attribute to app2
  navEl.setAttribute('active-route', 'app2');
  assert.ok(!links[0].classList.contains('active'), 'App 1 should no longer be active');
  assert.ok(links[1].classList.contains('active'), 'App 2 should now be active');
  console.log('PASS: active-route updates highlight dynamically without DOM flashes');

  console.log('\n--- Test Case 4: Custom Events & Suppressing Page Reloads (Modern Route) ---');
  // Register a navigate listener
  let navigateEventFired = false;
  let receivedDetail = null;
  const navigateListener = (e) => {
    navigateEventFired = true;
    receivedDetail = e.detail;
  };
  
  navEl.addEventListener('navigate', navigateListener);

  // Click App 1 (Modern) link
  const app1Link = links[0];
  let defaultClickPrevented = false;
  const clickEvent = new dom.window.MouseEvent('click', {
    bubbles: true,
    cancelable: true
  });
  
  // Intercept the default action to check if prevented
  clickEvent.preventDefault = () => {
    defaultClickPrevented = true;
  };

  app1Link.dispatchEvent(clickEvent);

  assert.ok(navigateEventFired, 'Should trigger navigate custom event');
  assert.strictEqual(receivedDetail.route, 'app1', 'Event detail route should be app1');
  assert.strictEqual(receivedDetail.href, '/app1/', 'Event detail href should be /app1/');
  assert.ok(defaultClickPrevented, 'Default reload should be suppressed for modern route');
  console.log('PASS: Custom event dispatched and reload suppressed for modern route');

  console.log('\n--- Test Case 5: Defaulting to Standard Navigation (No Listener) ---');
  // Remove the navigate listener
  navEl.removeEventListener('navigate', navigateListener);

  let defaultClickPreventedNoListener = false;
  const clickEvent2 = new dom.window.MouseEvent('click', {
    bubbles: true,
    cancelable: true
  });
  clickEvent2.preventDefault = () => {
    defaultClickPreventedNoListener = true;
  };

  app1Link.dispatchEvent(clickEvent2);
  assert.ok(!defaultClickPreventedNoListener, 'Default reload should NOT be suppressed when no listener is registered');
  console.log('PASS: Defaults to traditional browser navigation when listener is not registered');

  console.log('\n--- Test Case 6: Legacy Route full page refreshes ---');
  // Add listener back
  navEl.addEventListener('navigate', navigateListener);

  const app3Link = links[2]; // App 3 (Legacy Tomcat)
  let defaultClickPreventedLegacy = false;
  const clickEvent3 = new dom.window.MouseEvent('click', {
    bubbles: true,
    cancelable: true
  });
  clickEvent3.preventDefault = () => {
    defaultClickPreventedLegacy = true;
  };

  app3Link.dispatchEvent(clickEvent3);
  assert.ok(!defaultClickPreventedLegacy, 'Default reload should NOT be suppressed for legacy routes');
  console.log('PASS: Legacy routes still load as complete server-side refreshes');

  console.log('\n--- Test Case 7: Static init compatibility & existing element replace ---');
  // Reset static instance and document
  GlobalNav.instance = null;
  document.body.innerHTML = '<div id="global-nav">Legacy HTML</div>';

  // Call init
  const instance = GlobalNav.init({ activeRoute: 'app2' });
  assert.ok(instance, 'Should return instance');
  assert.strictEqual(instance.tagName, 'GLOBAL-NAV', 'Should replace with custom element');
  assert.strictEqual(instance.getAttribute('active-route'), 'app2');
  console.log('PASS: Legacy static initialization replaces legacy element cleanly');

  console.log('\n--- Test Case 8: Logout/Single Sign-out flow ---');
  localStorage.setItem('access_token', 'mock_token');
  sessionStorage.setItem('token', 'mock_session_token');

  let onLogoutFired = false;
  instance.config.onLogout = () => {
    onLogoutFired = true;
  };

  await instance.logout();

  assert.strictEqual(localStorage.getItem('access_token'), null, 'Local storage should be cleared');
  assert.strictEqual(sessionStorage.getItem('token'), null, 'Session storage should be cleared');
  assert.strictEqual(lastFetchUrl, '/logout', 'Should call logout endpoint');
  assert.strictEqual(lastFetchOptions.method, 'POST');
  assert.ok(onLogoutFired, 'Should call onLogout callback');
  console.log('PASS: Concurrently invalidates session & local data upon logout');

  console.log('\nALL WEB COMPONENT TESTS PASSED SUCCESSFULLY! 🎉');
}

main().catch(err => {
  console.error('\n❌ WEB COMPONENT TESTS FAILED:', err);
  process.exit(1);
});
