/**
 * SAMPLE CODE WITH DESIGN-LEVEL & HIGH-SEVERITY ISSUES
 * Paste this into the BugPredict Editor to test the app.
 *
 * Issues included (for backend): architecture, scalability, deadlock,
 * concurrency, thread, security, database, design flaw, optimization, latency.
 * Issues for frontend fallback: null access, async without catch, empty catch.
 */

// --- DESIGN FLAW: No separation of concerns, god object, tight coupling
// Architecture issue: single class does DB + business logic + threading
// Scalability: synchronous database calls block the main thread
// Concurrency / deadlock risk: shared state with no locking

var UserService = {
  cache: null,  // shared mutable state - concurrency issue
  db: null,

  init: function() {
    this.db = getDatabaseConnection();  // might be null - no check
    this.cache = {};
  },

  // Security: raw query, no parameterization - SQL injection risk
  // Database design flaw: N+1 queries, no connection pooling
  fetchUser: function(id) {
    var el = document.getElementById('user-name');  // can be null - no check
    el.value = id;  // will throw if el is null
    fetch('/api/users/' + id)   // no .catch() - unhandled promise rejection
      .then(function(r) { return r.json(); })
      .then(function(data) {
        el.textContent = data.name;
      });
    return this.db.query('SELECT * FROM users WHERE id = ' + id);  // injection + blocking
  },

  // Thread / concurrency: multiple threads could write to cache without lock -> deadlock possible
  // Memory: cache never evicted -> memory leak under load
  // Optimization / latency: no pagination, loads everything
  loadAllUsers: function() {
    var result = this.db.query('SELECT * FROM users');
    for (var i = 0; i < result.length; i++) {
      this.cache[result[i].id] = result[i];
    }
    return this.cache;
  }
};

// Empty catch - errors swallowed, no logging
function saveConfig() {
  try {
    var config = JSON.parse(localStorage.getItem('config'));
    config.updated = new Date();
    localStorage.setItem('config', JSON.stringify(config));
  } catch (e) {
  }
}

// Weak equality - type coercion bug
function checkStatus(response) {
  if (response.status == "200") {
    return response.data;
  }
  return null;
}

// Division without zero check
function computeRate(success, total) {
  return success / total;  // total can be 0
}

// Null/undefined access - no guard
function renderDashboard() {
  var node = document.querySelector('.dashboard');
  node.innerHTML = getDashboardHTML();  // node may be null
}
