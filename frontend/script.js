const app = document.getElementById("app");
const API_BASE = "http://localhost:3000/api";

const state = {
  authMode: "login",
  user: null,
  token: localStorage.getItem("greenride-session-token"),
  currentSection: "dashboard",
  routeOptions: [],
  dashboardData: null
};

function showMessage(containerId, message, variant) {
  const messageBox = document.getElementById(containerId);
  if (!messageBox) return;
  messageBox.textContent = message;
  messageBox.className = `form-message show ${variant}`;
}

function api(path, method = "GET", payload = null, includeAuth = true) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (includeAuth && state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const options = {
    method,
    headers
  };

  if (payload && method !== "GET") {
    options.body = JSON.stringify(payload);
  }

  return fetch(`${API_BASE}${path}`, options)
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Request failed.");
      }
      return data;
    });
}

function formatInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "GR";
}

function safeString(value, fallback = "—") {
  return value && value !== "" ? value : fallback;
}

async function bootstrap() {
  if (!state.token) {
    renderAuth();
    return;
  }

  try {
    const result = await api("/profile", "GET", null, true);
    state.user = result.user;
    await loadDashboardData();
    renderDashboard();
  } catch (error) {
    localStorage.removeItem("greenride-session-token");
    state.token = null;
    state.user = null;
    renderAuth();
  }
}

function renderAuth() {
  app.innerHTML = `
    <div class="auth-shell">
      <section class="auth-visual">
        <div class="visual-inner">
          <div class="brand-lockup">
            <div class="brand-mark">GR</div>
            <span>GreenRide Campus</span>
          </div>
          <h1>Smarter mobility for a greener campus.</h1>
          <p>
            Track commutes, manage employee mobility, check vehicle compliance, and reduce your campus carbon footprint with measurable sustainability insights.
          </p>
          <div class="feature-list">
            <div class="feature-row"><span class="feature-badge">✓</span> Travel and distance planning</div>
            <div class="feature-row"><span class="feature-badge">✓</span> Vehicle compliance tracking</div>
            <div class="feature-row"><span class="feature-badge">✓</span> Sustainable campus analytics</div>
          </div>
        </div>
      </section>

      <section class="auth-panel">
        <div class="auth-card">
          <div class="eyebrow">Campus portal</div>
          <h2>${state.authMode === "login" ? "Welcome back" : "Create account"}</h2>
          <div class="subtext">
            ${state.authMode === "login"
              ? "Sign in to access your travel, vehicle, and sustainability dashboard."
              : "Register your profile and start tracking greener commuting habits."}
          </div>

          <div class="auth-tabs">
            <button class="auth-tab ${state.authMode === "login" ? "active" : ""}" data-auth-toggle="login" type="button">Login</button>
            <button class="auth-tab ${state.authMode === "register" ? "active" : ""}" data-auth-toggle="register" type="button">Register</button>
          </div>

          ${state.authMode === "login" ? `
            <form id="loginForm" class="form-grid">
              <div class="field-group">
                <label for="loginField">Organisation ID / Employee ID / Email</label>
                <input id="loginField" name="loginField" type="text" placeholder="e.g. GRC-01 or EMP-1001" required />
              </div>

              <div class="field-group">
                <label for="loginPassword">Password</label>
                <div class="input-wrap">
                  <input id="loginPassword" name="password" type="password" placeholder="Enter your password" required />
                  <button class="password-toggle" type="button" data-password-toggle="loginPassword">Show</button>
                </div>
              </div>

              <div class="inline-options">
                <label class="checkbox"><input type="checkbox" name="rememberMe" /> Remember me</label>
                <button type="button" class="link-button">Forgot password?</button>
              </div>

              <button class="primary-btn" type="submit">Login to dashboard</button>
              <div id="loginMessage" class="form-message"></div>
            </form>
          ` : `
            <form id="registerForm" class="form-grid">
              <div class="field-group-row">
                <div class="field-group">
                  <label for="fullName">Full name</label>
                  <input id="fullName" name="fullName" type="text" placeholder="Jane Doe" required />
                </div>
                <div class="field-group">
                  <label for="role">Role</label>
                  <select id="role" name="role">
                    <option value="employee">Employee / Student</option>
                    <option value="admin">Organisation Admin</option>
                  </select>
                </div>
              </div>

              <div class="field-group-row">
                <div class="field-group">
                  <label for="email">Email</label>
                  <input id="email" name="email" type="email" placeholder="jane@campus.edu" required />
                </div>
                <div class="field-group">
                  <label for="employeeId">Employee / Student ID</label>
                  <input id="employeeId" name="employeeId" type="text" placeholder="EMP-2405" required />
                </div>
              </div>

              <div class="field-group-row">
                <div class="field-group">
                  <label for="organisationName">Organisation name</label>
                  <input id="organisationName" name="organisationName" type="text" placeholder="GreenRide Campus" required />
                </div>
                <div class="field-group">
                  <label for="organisationId">Organisation ID</label>
                  <input id="organisationId" name="organisationId" type="text" placeholder="GRC-01" required />
                </div>
              </div>

              <div class="field-group-row">
                <div class="field-group">
                  <label for="registerPassword">Password</label>
                  <div class="input-wrap">
                    <input id="registerPassword" name="password" type="password" placeholder="Create a strong password" required />
                    <button class="password-toggle" type="button" data-password-toggle="registerPassword">Show</button>
                  </div>
                </div>
                <div class="field-group">
                  <label for="confirmPassword">Confirm password</label>
                  <div class="input-wrap">
                    <input id="confirmPassword" name="confirmPassword" type="password" placeholder="Repeat password" required />
                    <button class="password-toggle" type="button" data-password-toggle="confirmPassword">Show</button>
                  </div>
                </div>
              </div>

              <div class="field-group">
                <label for="travelMedium">Preferred travel medium</label>
                <select id="travelMedium" name="travelMedium">
                  <option value="public-transport">Public transport</option>
                  <option value="carpool">Carpool</option>
                  <option value="bicycle">Bicycle</option>
                  <option value="walking">Walking</option>
                  <option value="personal-vehicle">Personal vehicle</option>
                </select>
              </div>

              <button class="primary-btn" type="submit">Register account</button>
              <div id="registerMessage" class="form-message"></div>
            </form>
          `}
        </div>
      </section>
    </div>
  `;

  document.querySelectorAll("[data-auth-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      state.authMode = button.dataset.authToggle;
      renderAuth();
    });
  });

  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      if (!input) return;
      const nextType = input.type === "password" ? "text" : "password";
      input.type = nextType;
      button.textContent = nextType === "password" ? "Show" : "Hide";
    });
  });

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const payload = {
        loginField: form.loginField.value.trim(),
        password: form.password.value
      };

      try {
        showMessage("loginMessage", "Authenticating your account…", "success");
        const result = await api("/login", "POST", payload, false);
        state.token = result.token;
        state.user = result.user;
        localStorage.setItem("greenride-session-token", result.token);
        await loadDashboardData();
        renderDashboard();
      } catch (error) {
        showMessage("loginMessage", error.message || "Unable to log in.", "error");
      }
    });
  }

  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const payload = {
        fullName: form.fullName.value.trim(),
        email: form.email.value.trim(),
        employeeId: form.employeeId.value.trim(),
        organisationName: form.organisationName.value.trim(),
        organisationId: form.organisationId.value.trim(),
        password: form.password.value,
        confirmPassword: form.confirmPassword.value,
        travelMedium: form.travelMedium.value,
        role: form.role.value
      };

      try {
        await api("/register", "POST", payload, false);
        state.authMode = "login";
        renderAuth();
        showMessage("loginMessage", "Registration successful. Please log in with your new account.", "success");
      } catch (error) {
        showMessage("registerMessage", error.message || "Unable to register account.", "error");
      }
    });
  }
}

async function loadDashboardData() {
  if (!state.user) return;

  try {
    state.dashboardData = await api("/dashboard", "GET", null, true);
  } catch (error) {
    state.dashboardData = {
      role: state.user.role,
      summary: { totalDistanceKm: 0, tripsCompleted: 0, sustainabilityIndex: 0 },
      recentAlerts: [{ label: "Dashboard data unavailable.", severity: "warning" }],
      userName: state.user.fullName
    };
  }
}

function renderDashboard() {
  if (!state.user) {
    renderAuth();
    return;
  }

  const summary = state.dashboardData?.summary || {};
  const user = state.user;

  app.innerHTML = `
    <div class="page-shell">
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="brand-mark">GR</div>
          <div class="brand-name">
            GreenRide Campus
            <small>${user.role === "admin" ? "Admin Portal" : "Employee Portal"}</small>
          </div>
        </div>

        <nav class="sidebar-nav">
          ${[
            { key: "dashboard", label: "Dashboard", icon: "▣" },
            { key: "profile", label: "My Profile", icon: "◉" },
            { key: "travel", label: "Travel Registration", icon: "✦" },
            { key: "vehicle", label: "My Vehicle", icon: "⟡" },
            { key: "documents", label: "Vehicle Documents", icon: "▤" },
            { key: "routes", label: "Route & Distance Tracking", icon: "⇄" },
            { key: "history", label: "My Trip History", icon: "◫" },
            { key: "emissions", label: "Emission & Sustainability", icon: "◎" },
            user.role === "admin" ? { key: "admin", label: "Organisation Dashboard", icon: "▥" } : null,
            { key: "settings", label: "Settings", icon: "⚙" },
            { key: "logout", label: "Logout", icon: "⎋" }
          ].filter(Boolean).map((item) => `
            <button class="nav-btn ${state.currentSection === item.key ? "active" : ""}" data-section="${item.key}" type="button">
              <span class="icon">${item.icon}</span>
              <span>${item.label}</span>
            </button>
          `).join("")}
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-user">
            <div class="avatar">${formatInitials(user.fullName)}</div>
            <div>
              <strong>${safeString(user.fullName, "User")}</strong>
              <small>${safeString(user.role, "employee")}</small>
            </div>
          </div>
        </div>
      </aside>

      <main class="main-panel">
        <header class="topbar">
          <div class="topbar-left">
            <div>
              <p class="page-kicker">Campus mobility</p>
              <h1 class="page-title">${sectionLabel(state.currentSection)}</h1>
            </div>
          </div>

          <div class="topbar-actions">
            <button class="icon-btn" type="button" aria-label="Notifications">
              🔔
              <span class="dot"></span>
            </button>
            <div class="profile-pill">
              <div class="avatar">${formatInitials(user.fullName)}</div>
              <div>
                <strong>${safeString(user.fullName, "User")}</strong>
                <small>${safeString(user.organisationName, "GreenRide Campus")}</small>
              </div>
            </div>
          </div>
        </header>

        <div class="content-wrap">
          ${renderSectionContent()}
        </div>
      </main>
    </div>
  `;

  document.querySelectorAll("[data-section]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const section = event.currentTarget.dataset.section;
      if (section === "logout") {
        handleLogout();
        return;
      }
      state.currentSection = section;
      renderDashboard();
    });
  });

  attachSectionHandlers();
}

function sectionLabel(section) {
  const labels = {
    dashboard: "Dashboard",
    profile: "My Profile",
    travel: "Travel Registration",
    vehicle: "My Vehicle",
    documents: "Vehicle Documents",
    routes: "Route & Distance Tracking",
    history: "My Trip History",
    emissions: "Emission & Sustainability",
    admin: "Organisation Dashboard",
    settings: "Settings"
  };

  return labels[section] || "Dashboard";
}

function renderSectionContent() {
  const role = state.user?.role || "employee";
  const data = state.dashboardData || {};
  const summary = data.summary || {};

  switch (state.currentSection) {
    case "profile":
      return `
        <div class="section-header">
          <h3>Profile summary</h3>
          <div class="section-actions">
            <button class="secondary-btn" type="button">Download profile</button>
          </div>
        </div>

        <div class="detail-grid">
          <div class="panel form-shell">
            <div class="field-group">
              <label>Full name</label>
              <input value="${safeString(state.user.fullName)}" />
            </div>
            <div class="field-group-row">
              <div class="field-group">
                <label>Email</label>
                <input value="${safeString(state.user.email)}" />
              </div>
              <div class="field-group">
                <label>Employee / Student ID</label>
                <input value="${safeString(state.user.employeeId)}" />
              </div>
            </div>
            <div class="field-group-row">
              <div class="field-group">
                <label>Organisation ID</label>
                <input value="${safeString(state.user.organisationId)}" />
              </div>
              <div class="field-group">
                <label>Department / Course</label>
                <input value="${safeString(state.user.department, "General")}" />
              </div>
            </div>
            <div class="field-group-row">
              <div class="field-group">
                <label>Preferred travel medium</label>
                <input value="${safeString(state.user.travelMedium, "public-transport")}" />
              </div>
              <div class="field-group">
                <label>Phone number</label>
                <input value="${safeString(state.user.phone, "+91 98765 43210")}" />
              </div>
            </div>
            <button class="primary-btn" type="button">Save profile changes</button>
          </div>

          <div class="panel">
            <h4>Profile completion</h4>
            <div class="progress-list">
              <div class="progress-row">
                <div class="progress-meta"><span>Travel registration</span><span>88%</span></div>
                <div class="progress-bar"><div class="progress-fill" style="width:88%"></div></div>
              </div>
              <div class="progress-row">
                <div class="progress-meta"><span>Vehicle record</span><span>72%</span></div>
                <div class="progress-bar"><div class="progress-fill" style="width:72%"></div></div>
              </div>
              <div class="progress-row">
                <div class="progress-meta"><span>Document compliance</span><span>91%</span></div>
                <div class="progress-bar"><div class="progress-fill" style="width:91%"></div></div>
              </div>
            </div>
          </div>
        </div>
      `;

    case "travel":
      return `
        <div class="panel form-shell">
          <div class="section-header">
            <h3>Travel registration</h3>
            <span class="status-badge success">Active</span>
          </div>
          <form id="travelForm">
            <div class="field-group-row">
              <div class="field-group">
                <label>Full name</label>
                <input name="fullName" value="${safeString(state.user.fullName)}" required />
              </div>
              <div class="field-group">
                <label>Employee / Student ID</label>
                <input name="employeeId" value="${safeString(state.user.employeeId)}" required />
              </div>
            </div>

            <div class="field-group-row">
              <div class="field-group">
                <label>Organisation ID</label>
                <input name="organisationId" value="${safeString(state.user.organisationId)}" required />
              </div>
              <div class="field-group">
                <label>Department / Course</label>
                <input name="department" value="${safeString(state.user.department, "General")}" required />
              </div>
            </div>

            <div class="field-group-row">
              <div class="field-group">
                <label>Preferred travel medium</label>
                <select name="preferredTravelMedium">
                  <option value="public-transport" ${state.user.travelMedium === "public-transport" ? "selected" : ""}>Public transport</option>
                  <option value="carpool" ${state.user.travelMedium === "carpool" ? "selected" : ""}>Carpool</option>
                  <option value="bicycle" ${state.user.travelMedium === "bicycle" ? "selected" : ""}>Bicycle</option>
                  <option value="walking" ${state.user.travelMedium === "walking" ? "selected" : ""}>Walking</option>
                  <option value="personal-vehicle" ${state.user.travelMedium === "personal-vehicle" ? "selected" : ""}>Personal vehicle</option>
                </select>
              </div>
              <div class="field-group">
                <label>Daily commute distance</label>
                <input name="dailyCommuteDistance" placeholder="18 km" />
              </div>
            </div>

            <div class="field-group-row">
              <div class="field-group">
                <label>Home / Start location</label>
                <input name="homeLocation" placeholder="Hennur" />
              </div>
              <div class="field-group">
                <label>Organisation / Destination</label>
                <input name="destination" value="GreenRide Campus" />
              </div>
            </div>

            <div class="field-group">
              <label>Do you use a personal vehicle?</label>
              <select name="usesPersonalVehicle">
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>

            <div class="vehicle-toggle" id="vehicleFields">
              <div class="field-group-row">
                <div class="field-group">
                  <label>Vehicle registration number</label>
                  <input name="vehicleRegistrationNumber" placeholder="KA04AB1234" />
                </div>
                <div class="field-group">
                  <label>Vehicle type</label>
                  <select name="vehicleType">
                    <option value="car">Car</option>
                    <option value="motorcycle">Motorcycle</option>
                    <option value="scooter">Scooter</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <button class="primary-btn" type="submit">Save travel registration</button>
            <div id="travelMessage" class="form-message"></div>
          </form>
        </div>
      `;

    case "vehicle":
      return `
        <div class="panel form-shell">
          <div class="section-header">
            <h3>My vehicle</h3>
            <span class="status-badge verified">${safeString(state.user.vehicle?.status || "pending", "verified")}</span>
          </div>
          <form id="vehicleForm">
            <div class="field-group-row">
              <div class="field-group">
                <label>Vehicle registration number</label>
                <input name="registrationNumber" value="${safeString(state.user.vehicle?.registrationNumber || "KA04AB1234")}" required />
              </div>
              <div class="field-group">
                <label>Vehicle type</label>
                <select name="vehicleType">
                  <option value="motorcycle" ${state.user.vehicle?.vehicleType === "motorcycle" ? "selected" : ""}>Motorcycle</option>
                  <option value="scooter" ${state.user.vehicle?.vehicleType === "scooter" ? "selected" : ""}>Scooter</option>
                  <option value="car" ${!state.user.vehicle || state.user.vehicle.vehicleType === "car" ? "selected" : ""}>Car</option>
                  <option value="other" ${state.user.vehicle?.vehicleType === "other" ? "selected" : ""}>Other</option>
                </select>
              </div>
            </div>
            <div class="field-group-row">
              <div class="field-group">
                <label>Make</label>
                <input name="make" value="${safeString(state.user.vehicle?.make || "Hyundai")}" />
              </div>
              <div class="field-group">
                <label>Model</label>
                <input name="model" value="${safeString(state.user.vehicle?.model || "Creta")}" />
              </div>
            </div>
            <div class="field-group-row">
              <div class="field-group">
                <label>Manufacturing year</label>
                <input name="year" type="number" value="${safeString(state.user.vehicle?.year || 2022)}" />
              </div>
              <div class="field-group">
                <label>Fuel type</label>
                <select name="fuelType">
                  <option value="petrol" ${state.user.vehicle?.fuelType === "petrol" || !state.user.vehicle ? "selected" : ""}>Petrol</option>
                  <option value="diesel" ${state.user.vehicle?.fuelType === "diesel" ? "selected" : ""}>Diesel</option>
                  <option value="cng" ${state.user.vehicle?.fuelType === "cng" ? "selected" : ""}>CNG</option>
                  <option value="electric" ${state.user.vehicle?.fuelType === "electric" ? "selected" : ""}>Electric</option>
                  <option value="hybrid" ${state.user.vehicle?.fuelType === "hybrid" ? "selected" : ""}>Hybrid</option>
                </select>
              </div>
            </div>
            <div class="field-group-row">
              <div class="field-group">
                <label>Vehicle owner</label>
                <input name="ownerName" value="${safeString(state.user.vehicle?.ownerName || state.user.fullName)}" />
              </div>
              <div class="field-group">
                <label>Verification status</label>
                <select name="status">
                  <option value="verified">Verified</option>
                  <option value="pending-verification">Pending verification</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            <button class="primary-btn" type="submit">Save vehicle details</button>
            <div id="vehicleMessage" class="form-message"></div>
          </form>
        </div>
      `;

    case "documents":
      return `
        <div class="two-col">
          <div class="panel form-shell">
            <div class="section-header">
              <h3>Vehicle document tracking</h3>
              <span class="status-badge warning">Review due</span>
            </div>
            <form id="documentForm">
              <div class="field-group-row">
                <div class="field-group">
                  <label>RC Number</label>
                  <input name="rcNumber" placeholder="RC-765421" />
                </div>
                <div class="field-group">
                  <label>RC Validity Date</label>
                  <input name="rcExpiry" type="date" />
                </div>
              </div>
              <div class="field-group-row">
                <div class="field-group">
                  <label>PUC Number</label>
                  <input name="pucNumber" placeholder="PUC-4051" />
                </div>
                <div class="field-group">
                  <label>PUC Validity Date</label>
                  <input name="pucExpiry" type="date" />
                </div>
              </div>
              <button class="primary-btn" type="submit">Update documents</button>
              <div id="documentMessage" class="form-message"></div>
            </form>
          </div>

          <div class="panel">
            <h4>Compliance snapshot</h4>
            <div class="card-list">
              <div class="card-list-item">
                <span>RC status</span>
                <span class="status-badge verified">Verified</span>
              </div>
              <div class="card-list-item">
                <span>PUC status</span>
                <span class="status-badge warning">Expiring soon</span>
              </div>
              <div class="card-list-item">
                <span>Organisation review</span>
                <span class="status-badge success">Up to date</span>
              </div>
              <div class="card-list-item">
                <span>Next scheduled review</span>
                <span>12 Nov 2026</span>
              </div>
            </div>
          </div>
        </div>
      `;

    case "routes":
      return `
        <div class="route-grid">
          <div class="panel form-shell">
            <div class="section-header">
              <h3>Route planning</h3>
              <span class="status-badge success">Live estimate</span>
            </div>
            <form id="routeForm">
              <div class="field-group-row">
                <div class="field-group">
                  <label>Starting location</label>
                  <input name="origin" placeholder="Hennur" required />
                </div>
                <div class="field-group">
                  <label>Destination</label>
                  <input name="destination" value="GreenRide Campus" required />
                </div>
              </div>

              <div class="field-group">
                <label>Travel mode</label>
                <select name="travelMode">
                  <option value="public-transport">Public transport</option>
                  <option value="carpool">Carpool</option>
                  <option value="bicycle">Bicycle</option>
                  <option value="walking">Walking</option>
                  <option value="personal-vehicle">Personal vehicle</option>
                </select>
              </div>

              <button class="primary-btn" type="submit">Find route</button>
            </form>

            <div id="routeResults" class="card-list" style="margin-top:1rem;">
              ${state.routeOptions.length ? state.routeOptions.map((option, index) => `
                <button class="route-option ${index === 0 ? "selected" : ""}" data-route-option="${index}" type="button">
                  <div class="route-head">
                    <span>${option.label}</span>
                    <span class="status-badge ${option.recommended ? "success" : "warning"}">${option.recommended ? "Recommended" : "Alternative"}</span>
                  </div>
                  <small>${option.distanceKm} km • ${option.eta}</small>
                </button>
              `).join("") : '<div class="empty-state">No route estimate yet — start with a route search.</div>'}
            </div>
          </div>

          <div class="panel">
            <h4>Trip summary</h4>
            <div class="card-list">
              <div class="card-list-item">
                <span>Selected route</span>
                <strong>${state.routeOptions[0]?.label || "Fastest Route"}</strong>
              </div>
              <div class="card-list-item">
                <span>Distance</span>
                <strong>${state.routeOptions[0]?.distanceKm || 12} km</strong>
              </div>
              <div class="card-list-item">
                <span>Estimated travel time</span>
                <strong>${state.routeOptions[0]?.eta || "24 min"}</strong>
              </div>
              <button class="primary-btn" type="button" id="saveTripButton">Save completed trip</button>
            </div>
          </div>
        </div>
      `;

    case "history":
      return `
        <div class="panel">
          <div class="section-header">
            <h3>Trip history</h3>
            <button class="secondary-btn" type="button">Export</button>
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Route</th>
                  <th>Mode</th>
                  <th>Distance</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>12 Oct 2026</td>
                  <td>Hennur → Campus</td>
                  <td>Carpool</td>
                  <td>18 km</td>
                  <td>27 min</td>
                  <td><span class="status-badge success">Complete</span></td>
                </tr>
                <tr>
                  <td>10 Oct 2026</td>
                  <td>MG Road → Campus</td>
                  <td>Public transport</td>
                  <td>12 km</td>
                  <td>24 min</td>
                  <td><span class="status-badge success">Complete</span></td>
                </tr>
                <tr>
                  <td>08 Oct 2026</td>
                  <td>Koramangala → Campus</td>
                  <td>Bicycle</td>
                  <td>7 km</td>
                  <td>21 min</td>
                  <td><span class="status-badge verified">Eco trip</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;

    case "emissions":
      return `
        <div class="metrics-grid">
          <div class="metric-card primary">
            <div class="topline"><span>Selected travel mode</span><span>Eco</span></div>
            <div class="value">${safeString(state.user.travelMedium || "carpool", "carpool")}</div>
            <div class="delta">Low impact commute</div>
          </div>
          <div class="metric-card">
            <div class="topline"><span>Total distance</span><span>Trips</span></div>
            <div class="value">${summary.totalDistanceKm || 184}</div>
            <div class="delta">${summary.tripsCompleted || 12} trips recorded</div>
          </div>
          <div class="metric-card">
            <div class="topline"><span>Estimated CO₂</span><span>Saved</span></div>
            <div class="value">${(summary.totalDistanceKm ? summary.totalDistanceKm * 0.18 : 33).toFixed(1)} kg</div>
            <div class="delta">Carbon reduction estimate</div>
          </div>
        </div>

        <div class="detail-grid" style="margin-top:1rem;">
          <div class="panel">
            <h4>Weekly commuting trend</h4>
            <div class="chart-bars">
              <div class="bar-col"><div class="bar" style="height:38%"></div><span class="bar-label">Mon</span></div>
              <div class="bar-col"><div class="bar" style="height:52%"></div><span class="bar-label">Tue</span></div>
              <div class="bar-col"><div class="bar" style="height:66%"></div><span class="bar-label">Wed</span></div>
              <div class="bar-col"><div class="bar" style="height:58%"></div><span class="bar-label">Thu</span></div>
              <div class="bar-col"><div class="bar" style="height:76%"></div><span class="bar-label">Fri</span></div>
              <div class="bar-col"><div class="bar" style="height:92%"></div><span class="bar-label">Sat</span></div>
              <div class="bar-col"><div class="bar" style="height:70%"></div><span class="bar-label">Sun</span></div>
            </div>
          </div>

          <div class="panel">
            <h4>Encouragement</h4>
            <div class="card-list">
              <div class="card-list-item"><span>Public transport</span><span class="status-badge success">Recommended</span></div>
              <div class="card-list-item"><span>Cycling</span><span class="status-badge verified">Low carbon</span></div>
              <div class="card-list-item"><span>Walking</span><span class="status-badge success">Health-first</span></div>
              <div class="card-list-item"><span>Carpool</span><span class="status-badge warning">Resource efficient</span></div>
            </div>
          </div>
        </div>
      `;

    case "admin":
      return `
        <div class="stats-grid">
          <div class="metric-card primary">
            <div class="topline"><span>Total registered employees</span></div>
            <div class="value">${summary.totalEmployees || 128}</div>
            <div class="delta">+12 this month</div>
          </div>
          <div class="metric-card">
            <div class="topline"><span>Total registered vehicles</span></div>
            <div class="value">${summary.totalVehicles || 74}</div>
            <div class="delta">+8 in active review</div>
          </div>
          <div class="metric-card">
            <div class="topline"><span>Vehicles needing review</span></div>
            <div class="value">${summary.expiringSoon || 12}</div>
            <div class="delta">Next due in 14 days</div>
          </div>
          <div class="metric-card">
            <div class="topline"><span>Commute distance</span></div>
            <div class="value">${summary.totalDistanceKm || 4781} km</div>
            <div class="delta">Sustainability index ${summary.sustainabilityIndex || 87}%</div>
          </div>
        </div>

        <div class="detail-grid" style="margin-top:1rem;">
          <div class="panel">
            <h4>Compliance overview</h4>
            <div class="progress-list">
              <div class="progress-row"><div class="progress-meta"><span>Verified</span><span>68%</span></div><div class="progress-bar"><div class="progress-fill" style="width:68%"></div></div></div>
              <div class="progress-row"><div class="progress-meta"><span>Missing</span><span>14%</span></div><div class="progress-bar"><div class="progress-fill" style="width:14%"></div></div></div>
              <div class="progress-row"><div class="progress-meta"><span>Expiring soon</span><span>18%</span></div><div class="progress-bar"><div class="progress-fill" style="width:18%"></div></div></div>
            </div>
          </div>

          <div class="panel">
            <h4>Review alerts</h4>
            <div class="card-list">
              <div class="card-list-item"><span>Expired documents</span><span class="status-badge danger">03</span></div>
              <div class="card-list-item"><span>Expiring in 30 days</span><span class="status-badge warning">08</span></div>
              <div class="card-list-item"><span>Awaiting verification</span><span class="status-badge success">12</span></div>
            </div>
          </div>
        </div>
      `;

    case "settings":
      return `
        <div class="panel form-shell">
          <div class="section-header">
            <h3>Settings</h3>
            <span class="status-badge success">Secure</span>
          </div>
          <div class="field-group">
            <label>Notification preferences</label>
            <div class="toggle-row"><input type="checkbox" checked /> Email reminders</div>
            <div class="toggle-row"><input type="checkbox" checked /> Push alerts</div>
            <div class="toggle-row"><input type="checkbox" /> Weekly sustainability summary</div>
          </div>
          <div class="field-group">
            <label>Privacy controls</label>
            <select>
              <option>Organisation documents visible to admin</option>
              <option>Documents visible to employee only</option>
              <option>Private mode</option>
            </select>
          </div>
          <button class="primary-btn" type="button">Save settings</button>
        </div>
      `;

    default:
      return `
        <div class="stats-grid">
          <div class="metric-card primary">
            <div class="topline"><span>Registered vehicle</span></div>
            <div class="value">${safeString(state.user.vehicle?.status || "Verified", "Verified")}</div>
            <div class="delta">Compliance status</div>
          </div>
          <div class="metric-card">
            <div class="topline"><span>Trips this month</span></div>
            <div class="value">${summary.tripsCompleted || 18}</div>
            <div class="delta">+4 compared with last month</div>
          </div>
          <div class="metric-card">
            <div class="topline"><span>Distance covered</span></div>
            <div class="value">${summary.totalDistanceKm || 214} km</div>
            <div class="delta">Total recorded</div>
          </div>
          <div class="metric-card">
            <div class="topline"><span>Sustainability score</span></div>
            <div class="value">${summary.sustainabilityIndex || 81}%</div>
            <div class="delta">Current index</div>
          </div>
        </div>

        <div class="detail-grid" style="margin-top:1rem;">
          <div class="panel">
            <h4>Upcoming reminders</h4>
            <div class="card-list">
              <div class="card-list-item"><span>PUC renewal</span><span class="status-badge warning">16 days</span></div>
              <div class="card-list-item"><span>GreenRide monthly review</span><span class="status-badge success">On track</span></div>
              <div class="card-list-item"><span>Route planning check</span><span class="status-badge verified">Due soon</span></div>
            </div>
          </div>

          <div class="panel">
            <h4>Recent alerts</h4>
            <div class="card-list">
              ${(data.recentAlerts || []).map((alert) => `
                <div class="card-list-item">
                  <span>${alert.label}</span>
                  <span class="status-badge ${alert.severity === "danger" ? "danger" : alert.severity === "warning" ? "warning" : "success"}">${alert.severity}</span>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      `;
  }
}

function attachSectionHandlers() {
  const routeForm = document.getElementById("routeForm");
  if (routeForm) {
    routeForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const payload = {
        origin: form.origin.value.trim(),
        destination: form.destination.value.trim(),
        travelMode: form.travelMode.value
      };

      try {
        const result = await api("/routes/estimate", "POST", payload, true);
        state.routeOptions = result.options || [];
        renderDashboard();
      } catch (error) {
        console.error(error);
      }
    });
  }

  const travelForm = document.getElementById("travelForm");
  if (travelForm) {
    const usesVehicleSelect = travelForm.querySelector("select[name='usesPersonalVehicle']");
    const vehicleFields = document.getElementById("vehicleFields");
    if (usesVehicleSelect) {
      usesVehicleSelect.addEventListener("change", () => {
        if (usesVehicleSelect.value === "true") {
          vehicleFields.classList.add("show");
        } else {
          vehicleFields.classList.remove("show");
        }
      });
    }

    travelForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const payload = {
        fullName: form.fullName.value.trim(),
        employeeId: form.employeeId.value.trim(),
        organisationId: form.organisationId.value.trim(),
        department: form.department.value.trim(),
        preferredTravelMedium: form.preferredTravelMedium.value,
        dailyCommuteDistance: form.dailyCommuteDistance.value.trim(),
        homeLocation: form.homeLocation.value.trim(),
        destination: form.destination.value.trim(),
        usesPersonalVehicle: form.usesPersonalVehicle.value === "true"
      };

      try {
        await api("/travel-registration", "POST", payload, true);
        showMessage("travelMessage", "Travel registration saved successfully.", "success");
      } catch (error) {
        showMessage("travelMessage", error.message || "Unable to save travel registration.", "error");
      }
    });
  }

  const vehicleForm = document.getElementById("vehicleForm");
  if (vehicleForm) {
    vehicleForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const payload = {
        registrationNumber: form.registrationNumber.value.trim(),
        vehicleType: form.vehicleType.value,
        make: form.make.value.trim(),
        model: form.model.value.trim(),
        year: Number(form.year.value),
        fuelType: form.fuelType.value,
        ownerName: form.ownerName.value.trim(),
        status: form.status.value
      };

      try {
        await api("/vehicle", "POST", payload, true);
        showMessage("vehicleMessage", "Vehicle details saved successfully.", "success");
      } catch (error) {
        showMessage("vehicleMessage", error.message || "Unable to save vehicle details.", "error");
      }
    });
  }

  const documentForm = document.getElementById("documentForm");
  if (documentForm) {
    documentForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const payload = {
        rcNumber: form.rcNumber.value.trim(),
        rcExpiry: form.rcExpiry.value,
        pucNumber: form.pucNumber.value.trim(),
        pucExpiry: form.pucExpiry.value
      };

      try {
        await api("/documents", "POST", payload, true);
        showMessage("documentMessage", "Document review details updated.", "success");
      } catch (error) {
        showMessage("documentMessage", error.message || "Unable to save documents.", "error");
      }
    });
  }

  const routeOptions = document.querySelectorAll("[data-route-option]");
  routeOptions.forEach((optionButton) => {
    optionButton.addEventListener("click", () => {
      const routeIndex = Number(optionButton.dataset.routeOption || 0);
      state.routeOptions = state.routeOptions.map((route, index) => ({
        ...route,
        recommended: index === routeIndex
      }));
      renderDashboard();
    });
  });

  const saveTripButton = document.getElementById("saveTripButton");
  if (saveTripButton) {
    saveTripButton.addEventListener("click", async () => {
      const selected = state.routeOptions[0] || {
        label: "Fastest Route",
        distanceKm: 12,
        eta: "24 min"
      };

      const payload = {
        date: new Date().toISOString(),
        origin: "Hennur",
        destination: "GreenRide Campus",
        mode: state.user.travelMedium || "carpool",
        distanceKm: selected.distanceKm,
        duration: selected.eta,
        routeLabel: selected.label
      };

      try {
        await api("/trips/complete", "POST", payload, true);
        const dashboard = await api("/dashboard", "GET", null, true);
        state.dashboardData = dashboard;
        renderDashboard();
      } catch (error) {
        console.error(error);
      }
    });
  }
}

function handleLogout() {
  state.user = null;
  state.token = null;
  state.currentSection = "dashboard";
  state.dashboardData = null;
  localStorage.removeItem("greenride-session-token");
  renderAuth();
}

bootstrap();
