/**
 * BugPredict – Frontend bug detection & prediction
 * Uses AI backend when configured (BugPredictConfig.API_BASE_URL), else client-side rules.
 */
(function(global) {
  'use strict';

  var severityLevels = { low: 1, medium: 2, high: 3 };

  function severityRank(s) {
    return severityLevels[s] || 0;
  }

  /** Map backend API response to UI format */
  function mapApiResult(api) {
    var severity = (api.severity_level || 'LOW').charAt(0) + (api.severity_level || 'low').slice(1).toLowerCase();
    var rootCause = [];
    if (api.design_issue) rootCause.push('Design/architecture');
    if (api.performance_issue) rootCause.push('Performance');
    if (rootCause.length === 0) rootCause.push('General');
    var bugType = api.bug_type;
    if (bugType == null || bugType === 'null' || bugType === 'undefined' || bugType === '') {
      // Derive from design_issue / performance_issue when API returns null
      if (api.design_issue && api.performance_issue) bugType = 'Design Level / Performance';
      else if (api.design_issue) bugType = 'Design Level';
      else if (api.performance_issue) bugType = 'Performance';
      else bugType = 'Functional Error';
    }
    return {
      bugType: bugType || '—',
      bugTypeDesc: 'AI triage',
      severity: severity,
      severityDesc: severity,
      debugTime: api.fix_days != null ? '~' + (api.fix_days < 1 ? (Math.round(api.fix_days * 60) + ' min') : api.fix_days + ' day(s)') : '—',
      debugTimeDesc: 'Est. fix time',
      priorityScore: api.priority_score != null ? Math.round(api.priority_score) : null,
      priorityDesc: 'Higher = fix first',
      rootCause: rootCause.join(' / '),
      rootCauseDesc: 'AI-detected',
      delayRisk: severity,
      delayRiskDesc: 'Impact if delayed',
      findings: api.findings || [] /* API may not provide line-level findings */
    };
  }

  /** Fallback when API not configured or fails. Returns findings with line numbers. */
  function analyzeCodeLocal(code) {
    var emptyResult = {
      bugType: 'None detected',
      bugTypeDesc: 'No code to analyze',
      severity: 'Low',
      severityDesc: 'N/A',
      debugTime: '0 min',
      debugTimeDesc: 'No issues',
      priorityScore: 20,
      priorityDesc: 'Low priority',
      rootCause: 'N/A',
      rootCauseDesc: '—',
      delayRisk: 'Low',
      delayRiskDesc: 'No immediate risk',
      findings: []
    };

    if (!code || typeof code !== 'string') {
      return emptyResult;
    }

    var findings = [];
    var lines = code.split('\n');
    var trimmed = code.replace(/\s+/g, ' ');

    function addFinding(type, severity, debugTime, rootCause, delayRisk, line) {
      findings.push({
        type: type,
        severity: severity,
        debugTime: debugTime,
        rootCause: rootCause,
        delayRisk: delayRisk,
        line: line != null ? line : 1
      });
    }

    // Scan line by line for line-specific issues
    for (var i = 0; i < lines.length; i++) {
      var lineNum = i + 1;
      var line = lines[i];
      var lineTrimmed = line.replace(/\s+/g, ' ');

      // Null / undefined: chained call on SAME line - getElementById(...).value
      if (/(getElementById|querySelector)\s*\([^)]*\)\s*\.\s*(value|innerHTML|textContent|length)\b/.test(line) && !/\?\./.test(line)) {
        addFinding('Null / undefined access', 'High', 45, 'Possible null/undefined before property or method call', 'High', lineNum);
      }
      // Null / undefined: use on NEXT line after getElementById/querySelector (e.g. el.value = x)
      if (i > 0) {
        var prev = lines[i - 1];
        var usesResult = /\b\w+\.(value|innerHTML|textContent)\s*[=\[.]|\b\w+\.(value|innerHTML|textContent)\s*;/.test(line);
        var prevFetched = /getElementById|querySelector|\.data\(|\.attr\(/.test(prev) && /=/.test(prev);
        if (usesResult && prevFetched && !/\?\./.test(line)) {
          addFinding('Null / undefined access', 'High', 45, 'Possible null/undefined before property access', 'High', lineNum);
        }
      }

      // Async: fetch without .catch - flag the fetch line
      if (/fetch\s*\(|axios\.(get|post)\s*\(/.test(line)) {
        var block = '';
        for (var j = i; j < Math.min(i + 10, lines.length); j++) {
          block += lines[j];
          if (/\.catch\s*\(/.test(lines[j])) break;
          if (/;\s*$/.test(lines[j]) && j > i) break;
        }
        if (!/\.catch\s*\(/.test(block)) {
          addFinding('Async / unhandled promise', 'Medium', 25, 'Missing await or .catch(); errors may be unhandled', 'Medium', lineNum);
        }
      }

      // Division without zero check - e.g. "return success / total" or "x / y;"
      if (/\b\w+\s*\/\s*\w+\s*[;,\)]/.test(line) && !/!==\s*0|!=\s*0/.test(line) && line.indexOf('//') === -1 && line.indexOf('/*') === -1) {
        addFinding('Possible division / zero', 'Medium', 20, 'Division without zero check', 'Medium', lineNum);
      }

      // Weak equality - == or != (not === or !==)
      if (/([^=!]|^)==([^=]|$)/.test(line) || /!=(?!=)/.test(line)) {
        if (/==\s*['"]|==\s*null|==\s*undefined|==\s*\d/.test(line) || /!=\s*null|!=\s*undefined/.test(line)) {
          addFinding('Type coercion / weak equality', 'Low', 15, 'Using == may cause unexpected type coercion', 'Low', lineNum);
        }
      }

      // Empty catch - single line or multi-line
      if (/\}\s*catch\s*\([^)]*\)\s*\{\s*\}/.test(lineTrimmed)) {
        addFinding('Empty catch block', 'Medium', 15, 'Errors swallowed; consider logging or rethrow', 'Medium', lineNum);
      } else if (/catch\s*\([^)]*\)\s*\{/.test(line)) {
        var next = i + 1 < lines.length ? lines[i + 1].trim() : '';
        if (/^\}$/.test(next)) {
          addFinding('Empty catch block', 'Medium', 15, 'Errors swallowed; consider logging or rethrow', 'Medium', lineNum);
        }
      }

      // SQL injection - .query( with + concatenation
      if (/\.query\s*\(/.test(line)) {
        var q = line;
        var j = i;
        while (!/\)\s*;?\s*(?:\/\/|$)/.test(q) && j + 1 < lines.length) {
          j++;
          q += lines[j];
        }
        if (/\+\s*\w+|\+\s*['"`]|['"`]\s*\+/.test(q)) {
          addFinding('SQL injection risk', 'High', 60, 'Raw string concatenation in query - use parameterized queries', 'High', lineNum);
        }
      }

      // Performance: O(n²) nested loops over array (e.g. for i / for k over same array)
      if (/for\s*\([^)]*\)\s*\{/.test(line)) {
        var innerLoop = false;
        for (var k = i + 1; k < Math.min(i + 5, lines.length); k++) {
          if (/for\s*\([^)]*\)\s*\{/.test(lines[k]) && /\.length|\.push|\[i\]|\[k\]|\[j\]/.test(lines[k] + (lines[k + 1] || ''))) {
            innerLoop = true;
            break;
          }
        }
        if (innerLoop) addFinding('Performance (O(n²) loop)', 'Medium', 30, 'Nested loops over collections; consider Set/Map or indexing', 'Medium', lineNum);
      }
      // Performance: loadAll / loadData with large iterations, no pagination
      if (/loadAll|loadAllData|for\s*\([^;]*\b10000\b|for\s*\([^;]*\b1000\b/.test(line)) {
        addFinding('Performance (no pagination)', 'Medium', 35, 'Loading all data into memory; consider pagination', 'Medium', lineNum);
      }
    }

    // Deduplicate by line+type (same line can have multiple issues, but avoid dup type)
    var seen = {};
    findings = findings.filter(function(f) {
      var key = f.line + '|' + f.type;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });

    // No findings: assume clean
    if (findings.length === 0) {
      return {
        bugType: 'None detected',
        bugTypeDesc: 'No obvious issues in this snippet',
        severity: 'Low',
        severityDesc: 'Low',
        debugTime: '0 min',
        debugTimeDesc: 'No fix needed',
        priorityScore: 15,
        priorityDesc: 'Low',
        rootCause: 'N/A',
        rootCauseDesc: '—',
        delayRisk: 'Low',
        delayRiskDesc: 'No immediate risk',
        findings: []
      };
    }

    // Map specific finding types to high-level categories (Design Level, Performance, Functional Error)
    function mapFindingToBugCategory(type) {
      if (!type) return 'Functional Error';
      if (/^Performance\s*\(|^Performance/.test(type)) return 'Performance';
      if (/SQL injection|Empty catch block/.test(type)) return 'Design Level';
      return 'Functional Error';  // Null access, Async, division, weak equality, etc.
    }

    // Pick worst finding for single-result UI
    findings.sort(function(a, b) {
      var sev = severityRank(b.severity) - severityRank(a.severity);
      if (sev !== 0) return sev;
      return a.line - b.line;
    });
    var worst = findings[0];
    var score = worst.severity === 'High' ? 75 + Math.min(25, findings.length * 5) :
                worst.severity === 'Medium' ? 50 + Math.min(25, findings.length * 5) : 30 + findings.length * 5;
    score = Math.min(100, score);

    var bugCategory = mapFindingToBugCategory(worst.type);

    return {
      bugType: bugCategory,
      bugTypeDesc: worst.type + (findings.length > 1 ? ' • ' + findings.length + ' issue(s)' : ''),
      severity: worst.severity,
      severityDesc: worst.severity,
      debugTime: worst.debugTime ? '~' + worst.debugTime + ' min' : '—',
      debugTimeDesc: 'Estimated time to fix',
      priorityScore: score,
      priorityDesc: 'Fix order vs other bugs',
      rootCause: worst.rootCause,
      rootCauseDesc: 'Suggested focus',
      delayRisk: worst.delayRisk,
      delayRiskDesc: 'Impact of delaying fix',
      findings: findings
    };
  }

  function analyzeCode(code) {
    if (!code || typeof code !== 'string') {
      return {
        bugType: 'None detected',
        bugTypeDesc: 'No code to analyze',
        severity: 'Low',
        severityDesc: 'N/A',
        debugTime: '0 min',
        debugTimeDesc: 'No issues',
        priorityScore: 20,
        priorityDesc: 'Low priority',
        rootCause: 'N/A',
        rootCauseDesc: '—',
        delayRisk: 'Low',
        delayRiskDesc: 'No immediate risk'
      };
    }
    var baseUrl = (global.BugPredictConfig && global.BugPredictConfig.API_BASE_URL) || '';
    if (!baseUrl) {
      return analyzeCodeLocal(code);
    }
    // Sync call not possible for fetch; return placeholder and let editor use async.
    // We expose async analyzer and editor will use it with a short debounce.
    return null; // Signal: use async API
  }

  function analyzeCodeAsync(code, callback) {
    if (!code || typeof code !== 'string') {
      callback(analyzeCode(code));
      return;
    }
    var baseUrl = (global.BugPredictConfig && global.BugPredictConfig.API_BASE_URL) || '';
    var timeout = (global.BugPredictConfig && global.BugPredictConfig.API_TIMEOUT_MS) || 15000;
    if (!baseUrl) {
      callback(analyzeCodeLocal(code));
      return;
    }
    var url = baseUrl.replace(/\/$/, '') + '/api/analyze';
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var id = controller ? setTimeout(function() { controller.abort(); }, timeout) : null;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: code }),
      signal: controller ? controller.signal : undefined
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (id) clearTimeout(id);
        if (data && data.ok && !data.error) {
          callback(mapApiResult(data));
        } else {
          callback(analyzeCodeLocal(code));
        }
      })
      .catch(function() {
        if (id) clearTimeout(id);
        callback(analyzeCodeLocal(code));
      });
  }

  global.BugPredict = {
    analyzeCode: analyzeCode,
    analyzeCodeAsync: analyzeCodeAsync,
    analyzeCodeLocal: analyzeCodeLocal,
    mapApiResult: mapApiResult
  };
})(typeof window !== 'undefined' ? window : this);
