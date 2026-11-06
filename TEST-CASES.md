# Hospital Appointment Booking System – Test Case Sheet

These cases follow the modules listed in the supplied lab project document. Run them against a fresh test database where possible. Selenium automation in `tests/test_hospital.py` covers the main end-to-end patient/admin workflow; use this sheet for the full manual verification checklist.

| ID | Module | Test scenario / input | Expected result |
|---|---|---|---|
| TC01 | Application | Open home page | Home page loads |
| TC02 | Registration | Register with valid name, email and password | Patient account created |
| TC03 | Registration | Submit blank registration form | Browser/server validation shown |
| TC04 | Registration | Enter malformed email | Invalid email rejected |
| TC05 | Registration | Register an already-used email | Duplicate account rejected |
| TC06 | Login | Login with valid patient credentials | Patient is logged in |
| TC07 | Login | Login with wrong password | Login rejected with error |
| TC08 | Login | Submit empty credentials | Required-field validation shown |
| TC09 | Doctor details | Open doctor directory | Doctor details are displayed |
| TC10 | Doctor search | Search Cardiology | Matching doctors displayed |
| TC11 | Doctor search | Search an unavailable specialization | No-doctors message displayed |
| TC12 | Booking | Book with valid doctor, future date and time | Appointment is created |
| TC13 | Booking | Submit without selecting doctor | Validation shown; no booking created |
| TC14 | Booking | Submit without date or time | Validation shown; no booking created |
| TC15 | Booking | Book a doctor/time slot already booked | Conflict rejected |
| TC16 | Appointments | Open patient appointments | Patient's appointments displayed |
| TC17 | Cancellation | Cancel an active appointment | Status changes to Cancelled |
| TC18 | Cancellation | Cancel the same appointment again | Already-cancelled response shown |
| TC19 | Admin | Login with demo admin credentials | Admin dashboard opens |
| TC20 | Admin | View all appointments | Appointment records displayed |
| TC21 | Admin | Change status to Confirmed/Completed | Status is updated |
| TC22 | Authorization | Open admin API as patient/anonymous user | Access denied |
| TC23 | Persistence | Restart application and view records | SQLite data remains available |
| TC24 | Logout | Log out and revisit protected endpoint | Session is ended; access denied |

## Additional API checks
- `GET /health` should return a success status.
- `GET /api/doctors` should return seeded doctors.
- `GET /api/me` should return the logged-in user or `null`.
- `GET /api/appointments` requires login.
- `GET /api/admin/summary` requires administrator access.

## Test data
- Demo administrator: `admin@hospital.com` / `Admin@123`
- Sample doctors are inserted automatically on first database initialization.
- Create a new patient account for each clean test run, or clear the local `data/hospital.sqlite` file while the server is stopped to reset the demo database.
