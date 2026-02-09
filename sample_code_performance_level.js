/**
 * PERFORMANCE-LEVEL SAMPLE CODE (50–60+ lines)
 * Paste into BugPredict editor to test performance/optimization detection.
 *
 * Issues: N+1 queries, no pagination, synchronous blocking, memory leaks,
 * inefficient algorithms, missing debounce, heavy work on main thread.
 */

var PerformanceProblemModule = (function() {
  var allItems = [];
  var listeners = [];
  var timer = null;

  function loadAllData() {
    var i, j, chunk;
    // Loads everything into memory – no pagination
    for (i = 0; i < 10000; i++) {
      allItems.push({ id: i, name: 'Item ' + i, tags: [] });
    }
    for (i = 0; i < allItems.length; i++) {
      for (j = 0; j < 50; j++) {
        allItems[i].tags.push('tag-' + j);
      }
    }
    return allItems;
  }

  function findDuplicates(arr) {
    var result = [];
    for (var i = 0; i < arr.length; i++) {
      for (var k = 0; k < arr.length; k++) {
        if (i !== k && arr[i] === arr[k]) {
          result.push(arr[i]);
        }
      }
    }
    return result;  // O(n²), no Set/Map
  }

  function onSearchInput(e) {
    var query = e.target.value;
    if (timer) clearTimeout(timer);
    timer = setTimeout(function() {
      var filtered = [];
      for (var i = 0; i < allItems.length; i++) {
        if (allItems[i].name.indexOf(query) !== -1) {
          filtered.push(allItems[i]);
        }
      }
      listeners.forEach(function(fn) { fn(filtered); });
    }, 0);  // No real debounce delay
  }

  function addListener(fn) {
    listeners.push(fn);
    return function() {
      var idx = listeners.indexOf(fn);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }

  function processLargeFileSync(content) {
    var lines = content.split('\n');
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      out.push(lines[i].toUpperCase() + lines[i].toLowerCase());
    }
    return out;  // Blocks main thread for large content
  }

  function fetchUserWithOrders(userId) {
    var user = fetch('/api/users/' + userId).then(function(r) { return r.json(); });
    var orders = fetch('/api/orders?userId=' + userId).then(function(r) { return r.json(); });
    return Promise.all([user, orders]).then(function(results) {
      results[0].orders = results[1];
      return results[0];
    });
  }

  return {
    loadAllData: loadAllData,
    findDuplicates: findDuplicates,
    onSearchInput: onSearchInput,
    addListener: addListener,
    processLargeFileSync: processLargeFileSync,
    fetchUserWithOrders: fetchUserWithOrders
  };
})();

PerformanceProblemModule.loadAllData();
