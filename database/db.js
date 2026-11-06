const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");

const dataDir = process.env.DATA_DIR || path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = process.env.DB_PATH || path.join(dataDir, "hospital.sqlite");
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  });
}
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });
}

async function initDb() {
  await run("PRAGMA foreign_keys = ON");
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('patient','admin')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialization TEXT NOT NULL,
    qualification TEXT NOT NULL,
    experience INTEGER NOT NULL DEFAULT 0,
    available_days TEXT NOT NULL
  )`);
  await run(`CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    doctor_id INTEGER NOT NULL REFERENCES doctors(id),
    appointment_date TEXT NOT NULL,
    appointment_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Booked',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  const admin = await get("SELECT id FROM users WHERE email = ?", ["admin@hospital.com"]);
  if (!admin) {
    const hash = await bcrypt.hash("Admin@123", 10);
    await run("INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,'admin')",
      ["Hospital Administrator", "admin@hospital.com", hash]);
  }

  const count = await get("SELECT COUNT(*) AS count FROM doctors");
  if (count.count === 0) {
    const seedDoctors = [
      ["Dr. Ananya Rao", "Cardiology", "MD, DM Cardiology", 12, "Mon, Wed, Fri"],
      ["Dr. Rahul Mehta", "Dermatology", "MD Dermatology", 9, "Tue, Thu, Sat"],
      ["Dr. Priya Sharma", "Pediatrics", "MD Pediatrics", 11, "Mon, Tue, Thu"],
      ["Dr. Arjun Reddy", "Orthopedics", "MS Orthopedics", 14, "Wed, Fri, Sat"],
      ["Dr. Neha Iyer", "Neurology", "DM Neurology", 8, "Mon, Wed, Fri"]
    ];
    for (const doctor of seedDoctors) {
      await run("INSERT INTO doctors (name,specialization,qualification,experience,available_days) VALUES (?,?,?,?,?)", doctor);
    }
  }
}

module.exports = { db, run, get, all, initDb };
