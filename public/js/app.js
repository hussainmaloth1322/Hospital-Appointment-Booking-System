const $ = (selector) => document.querySelector(selector);
async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}
function showMessage(element, text, isError = false) {
  if (!element) return;
  element.textContent = text;
  element.classList.toggle("error", isError);
  element.classList.toggle("success", !isError);
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
async function loadNavUser() {
  const target = $("#nav-user");
  if (!target) return;
  try {
    const { user } = await api("/api/me");
    target.textContent = user ? `Signed in: ${user.name}` : "";
  } catch (_) {}
}

const registerForm = $("#register-form");
if (registerForm) registerForm.addEventListener("submit", async event => {
  event.preventDefault();
  const message = $("#message");
  try {
    const payload = Object.fromEntries(new FormData(registerForm));
    const result = await api("/api/auth/register", { method: "POST", body: JSON.stringify(payload) });
    showMessage(message, result.message);
    registerForm.reset();
  } catch (err) { showMessage(message, err.message, true); }
});

const loginForm = $("#login-form");
if (loginForm) loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const result = await api("/api/auth/login", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(loginForm))) });
    showMessage($("#message"), result.message);
    window.location.href = result.user.role === "admin" ? "/admin.html" : "/index.html";
  } catch (err) { showMessage($("#message"), err.message, true); }
});

async function loadDoctors(filter = "") {
  const results = $("#doctor-results");
  if (!results) return;
  try {
    const data = await api(`/api/doctors?specialization=${encodeURIComponent(filter)}`);
    results.innerHTML = data.doctors.length ? data.doctors.map(d => `
      <article class="card doctor-card">
        <div class="doctor-avatar">${escapeHtml(d.name.split(" ").slice(-1)[0].charAt(0))}</div>
        <h3>${escapeHtml(d.name)}</h3><p class="specialty">${escapeHtml(d.specialization)}</p>
        <p>${escapeHtml(d.qualification)}</p><p>${d.experience} years experience</p>
        <p class="muted">Available: ${escapeHtml(d.available_days)}</p>
        <a class="button" href="/appointments.html?doctor=${d.id}">Book appointment</a>
      </article>`).join("") : "<p class='notice'>No doctors found for this specialization.</p>";
  } catch (err) { showMessage($("#message"), err.message, true); }
}
const doctorSearchForm = $("#doctor-search-form");
if (doctorSearchForm) {
  doctorSearchForm.addEventListener("submit", e => { e.preventDefault(); loadDoctors($("#specialization").value.trim()); });
  $("#clear-search").addEventListener("click", () => { $("#specialization").value = ""; loadDoctors(); });
  loadDoctors();
}

async function loadDoctorOptions() {
  const select = $("#doctor");
  if (!select) return;
  const { doctors } = await api("/api/doctors");
  select.innerHTML = '<option value="">Select a doctor</option>' + doctors.map(d =>
    `<option value="${d.id}">${escapeHtml(d.name)} — ${escapeHtml(d.specialization)}</option>`).join("");
  const requested = new URLSearchParams(location.search).get("doctor");
  if (requested) select.value = requested;
}
async function loadPatientAppointments() {
  const target = $("#appointment-list");
  if (!target) return;
  try {
    const { appointments } = await api("/api/appointments");
    target.innerHTML = appointments.length ? `<table><thead><tr><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th><th>Action</th></tr></thead><tbody>${appointments.map(a => `
      <tr><td>${escapeHtml(a.doctor_name)}<small>${escapeHtml(a.specialization)}</small></td><td>${escapeHtml(a.appointment_date)}</td><td>${escapeHtml(a.appointment_time)}</td><td><span class="status">${escapeHtml(a.status)}</span></td><td>${a.status !== "Cancelled" ? `<button class="button button-danger cancel-appointment" data-id="${a.id}">Cancel</button>` : "—"}</td></tr>`).join("")}</tbody></table>` : "<p class='notice'>No appointments found. Log in as a patient and book an appointment.</p>";
    target.querySelectorAll(".cancel-appointment").forEach(button => button.addEventListener("click", async () => {
      try { const result = await api(`/api/appointments/${button.dataset.id}`, { method: "DELETE" }); showMessage($("#message"), result.message); loadPatientAppointments(); }
      catch (err) { showMessage($("#message"), err.message, true); }
    }));
  } catch (err) { target.innerHTML = `<p class="notice">${escapeHtml(err.message)}. <a href="/login.html">Log in</a> to view appointments.</p>`; }
}
const appointmentForm = $("#appointment-form");
if (appointmentForm) {
  loadDoctorOptions().catch(err => showMessage($("#message"), err.message, true));
  appointmentForm.addEventListener("submit", async e => {
    e.preventDefault();
    const payload = { doctorId: $("#doctor").value, appointmentDate: $("#appointment-date").value, appointmentTime: $("#appointment-time").value };
    try {
      const result = await api("/api/appointments", { method: "POST", body: JSON.stringify(payload) });
      showMessage($("#message"), result.message);
      appointmentForm.reset();
      loadDoctorOptions();
      loadPatientAppointments();
    } catch (err) { showMessage($("#message"), err.message, true); }
  });
  $("#refresh-appointments").addEventListener("click", loadPatientAppointments);
  loadPatientAppointments();
}

async function loadAdmin() {
  try {
    const me = await api("/api/me");
    if (!me.user || me.user.role !== "admin") {
      $("#admin-login-panel").hidden = false;
      $("#admin-dashboard").hidden = true;
      return;
    }
    $("#admin-login-panel").hidden = true;
    $("#admin-dashboard").hidden = false;
    const [summary, data] = await Promise.all([api("/api/admin/summary"), api("/api/appointments")]);
    $("#admin-summary").innerHTML = [
      ["Patients", summary.patients], ["Doctors", summary.doctors], ["Appointments", summary.appointments]
    ].map(([label, value]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join("");
    const target = $("#admin-appointments");
    target.innerHTML = data.appointments.length ? `<table><thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th><th>Update</th></tr></thead><tbody>${data.appointments.map(a => `
      <tr><td>${escapeHtml(a.patient_name)}<small>${escapeHtml(a.patient_email)}</small></td><td>${escapeHtml(a.doctor_name)}<small>${escapeHtml(a.specialization)}</small></td><td>${escapeHtml(a.appointment_date)}</td><td>${escapeHtml(a.appointment_time)}</td><td>${escapeHtml(a.status)}</td><td><select class="status-select" data-id="${a.id}"><option ${a.status==="Booked"?"selected":""}>Booked</option><option ${a.status==="Confirmed"?"selected":""}>Confirmed</option><option ${a.status==="Completed"?"selected":""}>Completed</option><option ${a.status==="Cancelled"?"selected":""}>Cancelled</option></select></td></tr>`).join("")}</tbody></table>` : "<p class='notice'>There are no appointments yet.</p>";
    target.querySelectorAll(".status-select").forEach(select => select.addEventListener("change", async () => {
      try { await api(`/api/admin/appointments/${select.dataset.id}/status`, { method: "PATCH", body: JSON.stringify({ status: select.value }) }); }
      catch (err) { alert(err.message); }
    }));
  } catch (err) { showMessage($("#admin-message"), err.message, true); }
}
if ($("#admin-dashboard")) {
  loadAdmin();
  $("#admin-refresh").addEventListener("click", loadAdmin);
}
loadNavUser();


// CityCare home-page doctor search and responsive navigation
const homeSearch = $("#home-doctor-search");
if (homeSearch) homeSearch.addEventListener("submit", event => {
  event.preventDefault();
  const specialization = $("#home-specialization").value.trim();
  const date = $("#home-date").value;
  const params = new URLSearchParams();
  if (specialization) params.set("specialization", specialization);
  if (date) params.set("date", date);
  window.location.href = "/doctors.html" + (params.toString() ? "?" + params.toString() : "");
});
const menuToggle = $("#menu-toggle");
if (menuToggle) menuToggle.addEventListener("click", () => {
  const nav = $("#main-nav");
  const opened = nav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(opened));
});
