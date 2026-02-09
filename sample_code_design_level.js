/**
 * DESIGN-LEVEL SAMPLE CODE (50–60+ lines)
 * Paste into BugPredict editor to test design/architecture detection.
 *
 * Issues: god object, tight coupling, no separation of concerns,
 * mixed responsibilities, global state, no interfaces/abstractions.
 */

// God object: one "service" does auth, DB, HTTP, caching, validation, and logging
var ApplicationService = {
  config: {},
  db: null,
  cache: {},
  users: [],
  tokens: {},

  init: function(cfg) {
    this.config = cfg || {};
    this.db = connectToDatabase(this.config.dbUrl);
    this.cache = {};
    this.tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
  },

  // Auth logic mixed with persistence and HTTP
  login: function(username, password) {
    var user = this.db.query('SELECT * FROM users WHERE name = "' + username + '"');
    if (user && user.password === password) {
      var token = Math.random().toString(36);
      this.tokens[token] = user.id;
      localStorage.setItem('tokens', JSON.stringify(this.tokens));
      console.log('User ' + username + ' logged in');
      return token;
    }
    return null;
  },

  // Business logic, validation, and I/O in one place; no repository abstraction
  fetchAndValidateAndCacheUser: function(id) {
    if (this.cache[id]) return this.cache[id];
    var row = this.db.query('SELECT * FROM users WHERE id = ' + id);
    if (!row) return null;
    if (row.status !== 'active') return null;
    this.cache[id] = row;
    this.users.push(row);
    return row;
  },

  // Tight coupling to DOM, HTTP, and global state; no presenter or view layer
  renderUserProfile: function(userId) {
    var user = this.fetchAndValidateAndCacheUser(userId);
    document.getElementById('profile-name').textContent = user.name;
    document.getElementById('profile-email').textContent = user.email;
    fetch('/api/analytics?userId=' + userId).then(function(r) { return r.json(); })
      .then(function(data) {
        document.getElementById('profile-stats').textContent = data.views;
      });
  }
};

function connectToDatabase(url) {
  return { query: function(sql) { return null; } };
}

// No dependency injection; hard-coded dependencies
ApplicationService.init({ dbUrl: 'mysql://localhost/app' });
ApplicationService.login('admin', 'secret');
