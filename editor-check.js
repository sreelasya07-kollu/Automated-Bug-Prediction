/**
 * CODE EDITOR CHECK – Use this to verify your BugPredict code editor works.
 *
 * OPTION 1 – Paste test (manual)
 * ------------------------------
 * Copy the PASTE_TEST_SNIPPET below into the editor textarea. You should see:
 * - Bug Analysis panel update (e.g. Bug Type, Severity, Est. Debug Time, etc.)
 * - Values change from "—" or "Analyzing..." to real predictions
 *
 * OPTION 2 – Console test (automated)
 * -----------------------------------
 * 1. Open the editor page: app/editor/index.html (via your server or file://)
 * 2. Open DevTools (F12 or Cmd+Option+I) → Console
 * 3. Paste and run the CONSOLE_TEST_SCRIPT at the bottom of this file
 * It will report whether the editor and BugPredict are working.
 */

// ========== PASTE THIS INTO THE EDITOR TO TEST ==========
var PASTE_TEST_SNIPPET = `
// Quick editor test – code with common bug patterns
function getUser(id) {
  var el = document.getElementById('user');
  el.value = id;  // possible null access
  fetch('/api/user/' + id).then(function(r) { return r.json(); })
    .then(function(d) { el.textContent = d.name; });  // no .catch()
}
getUser(1);
`;

// ========== RUN THIS IN THE BROWSER CONSOLE (on editor page) ==========
var CONSOLE_TEST_SCRIPT = `
(function() {
  var out = { ok: true, checks: [] };
  function pass(msg) { out.checks.push('[OK] ' + msg); }
  function fail(msg) { out.checks.push('[FAIL] ' + msg); out.ok = false; }

  var textarea = document.getElementById('code-input');
  if (!textarea) { fail('Editor textarea #code-input not found'); } else { pass('Editor textarea found'); }

  if (out.ok) {
    var before = textarea.value;
    textarea.value = 'var x = 1;';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    var hasInput = textarea.value === 'var x = 1;';
    textarea.value = before;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    if (hasInput) pass('Textarea is editable and input event fires'); else fail('Textarea not editable or input not firing');
  }

  if (typeof window.BugPredict !== 'undefined') {
    pass('BugPredict loaded');
    if (typeof window.BugPredict.analyzeCode === 'function') pass('BugPredict.analyzeCode exists');
    if (typeof window.BugPredict.analyzeCodeAsync === 'function') pass('BugPredict.analyzeCodeAsync exists');
    if (typeof window.BugPredict.analyzeCodeLocal === 'function') pass('BugPredict.analyzeCodeLocal exists');
  } else {
    fail('BugPredict not loaded (check app/scripts/app.js and config.js)');
  }

  var ids = ['out-bug-type','out-severity','out-debug-time','out-priority','out-root-cause','out-delay-risk'];
  ids.forEach(function(id) {
    if (document.getElementById(id)) pass('Output element #' + id + ' exists');
    else fail('Missing output element #' + id);
  });

  console.log(out.ok ? '\\n=== Editor check PASSED ===' : '\\n=== Editor check FAILED ===');
  out.checks.forEach(function(c) { console.log(c); });
  return out;
})();
`;

// Export for use (if run in Node or bundled)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PASTE_TEST_SNIPPET, CONSOLE_TEST_SCRIPT };
}
