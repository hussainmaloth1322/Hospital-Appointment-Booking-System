const express = require("express");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { initDb, db, run, get, all } = require("./database/db");
const { isValidEmail, isValidDate, isValidTime } = require("./lib/validation");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  name: "hospital.sid",
  secret: process.env.SESSION_SECRET || "replace-this-secret-before-deployment",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 4
  }
}));
app.use(express.static(path.join(__dirname, "public")));

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Please log in first." });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

app.get("/health", (req, res) => res.json({ status: "success", message: "Hospital application is running" }));
app.get("/api/me", (req, res) => res.json({ user: req.session.user || null }));

app.post("/api/auth/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!name || !email || !password) return res.status(400).json({ error: "Name, email and password are required." });
    if (!isValidEmail(email)) return res.status(400).json({ error: "Enter a valid email address." });
    if (password.length < 8) return res.status(400).json({ error: "Password must contain at least 8 characters." });
    const existing = await get("SELECT id FROM users WHERE email = ?", [email]);
    if (existing) return res.status(409).json({ error: "An account with this email already exists." });
    const hash = await bcrypt.hash(password, 10);
    const result = await run(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'patient')",
      [name, email, hash]
    );
    res.status(201).json({ message: "Registration successful. Please log in.", userId: result.lastID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to register patient." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
    const user = await get("SELECT * FROM users WHERE email = ?", [email]);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    req.session.user = publicUser(user);
    res.json({ message: "Login successful.", user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to log in." });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: "Unable to log out." });
    res.clearCookie("hospital.sid");
    res.json({ message: "Logged out successfully." });
  });
});

app.get("/api/doctors", async (req, res) => {
  try {
    const specialization = String(req.query.specialization || "").trim();
    const doctors = specialization
      ? await all("SELECT id, name, specialization, qualification, experience, available_days FROM doctors WHERE specialization LIKE ? ORDER BY name", [`%${specialization}%`])
      : await all("SELECT id, name, specialization, qualification, experience, available_days FROM doctors ORDER BY name");
    res.json({ doctors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to load doctors." });
  }
});

app.post("/api/appointments", requireAuth, async (req, res) => {
  try {
    if (req.session.user.role !== "patient") return res.status(403).json({ error: "Only patients can book appointments." });
    const doctorId = Number(req.body.doctorId);
    const appointmentDate = String(req.body.appointmentDate || "");
    const appointmentTime = String(req.body.appointmentTime || "");
    if (!doctorId || !isValidDate(appointmentDate) || !isValidTime(appointmentTime)) {
      return res.status(400).json({ error: "Select a valid doctor, date and time." });
    }
    if (appointmentDate < new Date().toISOString().slice(0, 10)) {
      return res.status(400).json({ error: "Appointment date cannot be in the past." });
    }
    const doctor = await get("SELECT id FROM doctors WHERE id = ?", [doctorId]);
    if (!doctor) return res.status(404).json({ error: "Doctor not found." });
    const conflict = await get(
      "SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status != 'Cancelled'",
      [doctorId, appointmentDate, appointmentTime]
    );
    if (conflict) return res.status(409).json({ error: "This time slot is already booked. Choose another slot." });
    const result = await run(
      "INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status) VALUES (?, ?, ?, ?, 'Booked')",
      [req.session.user.id, doctorId, appointmentDate, appointmentTime]
    );
    res.status(201).json({ message: "Appointment booked successfully.", appointmentId: result.lastID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to book appointment." });
  }
});

app.get("/api/appointments", requireAuth, async (req, res) => {
  try {
    const isAdmin = req.session.user.role === "admin";
    const sql = `
      SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.created_at,
             d.name AS doctor_name, d.specialization,
             u.name AS patient_name, u.email AS patient_email
      FROM appointments a
      JOIN doctors d ON d.id = a.doctor_id
      JOIN users u ON u.id = a.patient_id
      ${isAdmin ? "" : "WHERE a.patient_id = ?"}
      ORDER BY a.appointment_date DESC, a.appointment_time DESC`;
    const appointments = isAdmin ? await all(sql) : await all(sql, [req.session.user.id]);
    res.json({ appointments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to load appointments." });
  }
});

app.delete("/api/appointments/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const appointment = await get("SELECT * FROM appointments WHERE id = ?", [id]);
    if (!appointment) return res.status(404).json({ error: "Appointment not found." });
    const isOwner = appointment.patient_id === req.session.user.id;
    const isAdmin = req.session.user.role === "admin";
    if (!isOwner && !isAdmin) return res.status(403).json({ error: "You cannot cancel this appointment." });
    if (appointment.status === "Cancelled") return res.status(409).json({ error: "Appointment is already cancelled." });
    await run("UPDATE appointments SET status = 'Cancelled' WHERE id = ?", [id]);
    res.json({ message: "Appointment cancelled successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to cancel appointment." });
  }
});

app.patch("/api/admin/appointments/:id/status", requireAdmin, async (req, res) => {
  const allowed = ["Booked", "Confirmed", "Completed", "Cancelled"];
  const status = String(req.body.status || "");
  if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid appointment status." });
  try {
    const result = await run("UPDATE appointments SET status = ? WHERE id = ?", [status, Number(req.params.id)]);
    if (!result.changes) return res.status(404).json({ error: "Appointment not found." });
    res.json({ message: "Appointment status updated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to update appointment." });
  }
});

app.get("/api/admin/summary", requireAdmin, async (req, res) => {
  const patients = await get("SELECT COUNT(*) AS count FROM users WHERE role = 'patient'");
  const doctors = await get("SELECT COUNT(*) AS count FROM doctors");
  const appointments = await get("SELECT COUNT(*) AS count FROM appointments");
  res.json({ patients: patients.count, doctors: doctors.count, appointments: appointments.count });
});

async function start() {
  await initDb();
  if (require.main === module) {
    app.listen(PORT, "0.0.0.0", () => console.log(`Hospital application running at http://localhost:${PORT}`));
  }
}
if (require.main === module) {
  start().catch(err => { console.error("Startup failed:", err); process.exit(1); });
}
module.exports = { app, start };
