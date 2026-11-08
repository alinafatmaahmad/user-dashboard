// =====================================================
// 1. VARIABLES (our app's "memory")
// =====================================================
let users = [];          // all users live here
let currentPage = 1;     // which page we are on
const perPage = 5;       // users shown per page
let editingId = null;    // null = adding, a number = editing that user

// Grab elements from the HTML
const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const tableBody = document.getElementById("table-body");
const modal = document.getElementById("modal");

// =====================================================
// 2. AUTHENTICATION (fake login using localStorage)
// =====================================================
function isLoggedIn() {
  return localStorage.getItem("loggedInUser") !== null;
}

// Show/hide navbar items depending on login status
function updateNavbar() {
  const loggedIn = isLoggedIn();
  document.getElementById("nav-login").classList.toggle("hidden", loggedIn);
  document.getElementById("nav-logout").classList.toggle("hidden", !loggedIn);
  document.getElementById("nav-dashboard").classList.toggle("hidden", !loggedIn);

  const welcome = document.getElementById("welcome-text");
  welcome.classList.toggle("hidden", !loggedIn);
  welcome.textContent = "Hi, " + localStorage.getItem("loggedInUser");
}

// Show only one page at a time
function showPage(page) {
  // Protect the dashboard: if not logged in, send to login
  if (page === "dashboard" && !isLoggedIn()) {
    page = "login";
  }
  loginView.classList.toggle("hidden", page !== "login");
  dashboardView.classList.toggle("hidden", page !== "dashboard");
  updateNavbar();
}

document.getElementById("login-form").addEventListener("submit", function (e) {
  e.preventDefault(); // stop page reload
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (username === "admin" && password === "1234") {
    localStorage.setItem("loggedInUser", username);
    document.getElementById("login-error").textContent = "";
    showPage("dashboard");
    loadUsers();
  } else {
    document.getElementById("login-error").textContent = "Wrong username or password.";
  }
});

document.getElementById("nav-logout").addEventListener("click", function (e) {
  e.preventDefault();
  localStorage.removeItem("loggedInUser");
  showPage("login");
});

document.getElementById("nav-login").addEventListener("click", function (e) {
  e.preventDefault();
  showPage("login");
});

document.getElementById("nav-dashboard").addEventListener("click", function (e) {
  e.preventDefault();
  showPage("dashboard");
});

// =====================================================
// 3. API INTEGRATION (get users from the internet)
// =====================================================
async function loadUsers() {
  const status = document.getElementById("status");
  status.textContent = "Loading users...";

  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");
    const data = await response.json();

    // The API gives a lot of data. We keep only what we need.
    users = data.map(function (u) {
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        city: u.address.city,
        company: u.company.name,
      };
    });

    status.textContent = "";
    fillCityFilter();
    render();
  } catch (error) {
    status.textContent = "Could not load users. Check your internet.";
  }
}

// =====================================================
// 4. SEARCH + FILTER
// =====================================================
function getFilteredUsers() {
  const text = document.getElementById("search").value.toLowerCase();
  const city = document.getElementById("city-filter").value;

  return users.filter(function (user) {
    const matchesSearch =
      user.name.toLowerCase().includes(text) ||
      user.email.toLowerCase().includes(text);
    const matchesCity = city === "all" || user.city === city;
    return matchesSearch && matchesCity;
  });
}

// Put every unique city into the dropdown
function fillCityFilter() {
  const select = document.getElementById("city-filter");
  const selected = select.value;
  select.innerHTML = '<option value="all">All cities</option>';

  const cities = [...new Set(users.map((u) => u.city))]; // unique cities
  cities.forEach(function (city) {
    select.innerHTML += `<option value="${city}">${city}</option>`;
  });
  select.value = cities.includes(selected) ? selected : "all";
}

document.getElementById("search").addEventListener("input", function () {
  currentPage = 1; // go back to page 1 on a new search
  render();
});
document.getElementById("city-filter").addEventListener("change", function () {
  currentPage = 1;
  render();
});

// =====================================================
// 5. SHOW DATA (table + pagination)
// =====================================================
function render() {
  const filtered = getFilteredUsers();
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  // Fix the page number if it is too big (e.g. after deleting)
  if (currentPage > totalPages) currentPage = totalPages;

  // Cut out only the users for this page
  const start = (currentPage - 1) * perPage;
  const pageUsers = filtered.slice(start, start + perPage);

  // Build table rows
  tableBody.innerHTML = "";
  if (pageUsers.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5">No users found.</td></tr>';
  }
  pageUsers.forEach(function (user) {
    tableBody.innerHTML += `
      <tr>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.city}</td>
        <td>${user.company}</td>
        <td>
          <button class="btn small" onclick="openEditForm(${user.id})">Edit</button>
          <button class="btn small red" onclick="deleteUser(${user.id})">Delete</button>
        </td>
      </tr>`;
  });

  // Update numbers and pagination buttons
  document.getElementById("total-count").textContent = users.length;
  document.getElementById("shown-count").textContent = filtered.length;
  document.getElementById("page-info").textContent =
    "Page " + currentPage + " of " + totalPages;
  document.getElementById("prev-btn").disabled = currentPage === 1;
  document.getElementById("next-btn").disabled = currentPage === totalPages;
}

document.getElementById("prev-btn").addEventListener("click", function () {
  currentPage--;
  render();
});
document.getElementById("next-btn").addEventListener("click", function () {
  currentPage++;
  render();
});

// =====================================================
// 6. CRUD (Create, Read, Update, Delete)
// =====================================================

// --- CREATE: open empty form ---
document.getElementById("add-btn").addEventListener("click", function () {
  editingId = null;
  document.getElementById("modal-title").textContent = "Add User";
  document.getElementById("user-form").reset();
  modal.classList.remove("hidden");
});

// --- UPDATE: open form filled with user's data ---
function openEditForm(id) {
  const user = users.find((u) => u.id === id);
  editingId = id;
  document.getElementById("modal-title").textContent = "Edit User";
  document.getElementById("f-name").value = user.name;
  document.getElementById("f-email").value = user.email;
  document.getElementById("f-city").value = user.city;
  document.getElementById("f-company").value = user.company;
  modal.classList.remove("hidden");
}

// --- Save button (works for both Create and Update) ---
document.getElementById("user-form").addEventListener("submit", function (e) {
  e.preventDefault();

  const name = document.getElementById("f-name").value;
  const email = document.getElementById("f-email").value;
  const city = document.getElementById("f-city").value;
  const company = document.getElementById("f-company").value;

  if (editingId === null) {
    // CREATE: make a new id (biggest id + 1)
    const newId = users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1;
    users.push({ id: newId, name, email, city, company });
  } else {
    // UPDATE: find the user and change the values
    const user = users.find((u) => u.id === editingId);
    user.name = name;
    user.email = email;
    user.city = city;
    user.company = company;
  }

  closeForm();
  fillCityFilter();
  render();
});

// --- DELETE ---
function deleteUser(id) {
  if (confirm("Delete this user?")) {
    users = users.filter((u) => u.id !== id);
    fillCityFilter();
    render();
  }
}

function closeForm() {
  modal.classList.add("hidden");
}
document.getElementById("cancel-btn").addEventListener("click", closeForm);

// =====================================================
// 7. START THE APP
// =====================================================
if (isLoggedIn()) {
  showPage("dashboard");
  loadUsers();
} else {
  showPage("login");
}
