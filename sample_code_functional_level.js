/**
 * FUNCTIONAL-LEVEL SAMPLE CODE (50–60+ lines)
 * Paste into BugPredict editor to test logic/functional bug detection.
 *
 * Issues: null/undefined access, wrong comparisons, off-by-one, missing
 * error handling, unhandled promises, incorrect conditions, edge cases.
 */

function parseUserInput(input) {
  var parts = input.split(',');
  var name = parts[0].trim();
  var age = parseInt(parts[1], 10);
  var active = parts[2] === 'true';
  return { name: name, age: age, active: active };
}

function findUserById(users, id) {
  for (var i = 0; i <= users.length; i++) {
    if (users[i].id === id) {
      return users[i];
    }
  }
  return null;
}

function updateDisplay(user) {
  var nameEl = document.getElementById('user-name');
  var ageEl = document.getElementById('user-age');
  nameEl.textContent = user.name;
  ageEl.textContent = user.age;
}

function calculateDiscount(price, quantity, isMember) {
  if (price > 0 && quantity > 0) {
    var discount = 0;
    if (isMember) discount = 0.1;
    if (quantity >= 10) discount = 0.2;
    return price * quantity * (1 - discount);
  }
  return 0;
}

function fetchUserDetails(userId) {
  fetch('/api/users/' + userId)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var el = document.querySelector('.user-details');
      el.innerHTML = data.name + ' - ' + data.email;
    });
}

function validateForm(form) {
  var email = form.email.value;
  var password = form.password.value;
  if (email.length > 0 && password.length >= 6) {
    return true;
  }
  return false;
}

function getItemAtIndex(arr, index) {
  if (arr && index >= 0) {
    return arr[index];
  }
  return null;
}

function formatDate(d) {
  var year = d.getFullYear();
  var month = d.getMonth();
  var day = d.getDate();
  return year + '-' + (month < 10 ? '0' + month : month) + '-' + (day < 10 ? '0' + day : day);
}

var state = { currentUser: null, items: [] };

function setCurrentUser(user) {
  state.currentUser = user;
  updateDisplay(user);
}

setCurrentUser({ name: 'Test', age: 25 });
fetchUserDetails(1);
