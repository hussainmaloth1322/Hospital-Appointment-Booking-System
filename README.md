# Hospital Appointment Booking System

A lab demonstration project covering patient registration/login, doctor directory and specialization search, appointment booking/cancellation, and admin appointment management.

## Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Database: SQLite (`sqlite3`)
- Authentication: bcryptjs password hashing + express-session
- Testing: Node.js built-in test runner and Python Selenium
- DevOps: Git/GitHub, Jenkins, Docker

## Requirements
- Node.js 20 or newer (Node 22 recommended)
- npm
- Python 3.9+
- Google Chrome (for Selenium)
- Docker Desktop (for Docker)
- Jenkins (for pipeline)

## Run locally (PowerShell)
```powershell
npm install
npm start
```
Open http://localhost:3000

Health check: http://localhost:3000/health

The SQLite database is created automatically in `data/hospital.sqlite` on first start. Sample doctors are inserted automatically.

## Demo administrator
- Email: `admin@hospital.com`
- Password: `Admin@123`

Change these demo credentials and the session secret before any real deployment. This is an educational demonstration, not a production-ready medical system. Do not use real patient data.

## Patient workflow
1. Register at `/register.html`.
2. Log in at `/login.html`.
3. Browse/search doctors at `/doctors.html`.
4. Book and cancel appointments at `/appointments.html`.

## Admin workflow
1. Log in using the demo admin account at `/login.html`.
2. The application redirects the admin to `/admin.html`.
3. View summary counts and appointments.
4. Change appointment status from the status dropdown.

## Run automated unit tests
```powershell
npm test
```

## Run Selenium tests
Install Python Selenium:
```powershell
python -m pip install selenium
```
Start the app in one terminal:
```powershell
npm start
```
Run in another terminal:
```powershell
python -m unittest discover -s tests -p "test_hospital.py" -v
```
Selenium Manager normally obtains the matching ChromeDriver automatically. Google Chrome must be installed. For Jenkins, the agent must have Python, Chrome/Chromium, a compatible driver setup, Docker and permission to run containers. The supplied Selenium test uses headless Chrome.

## Docker
Build:
```powershell
docker build -t hospital-appointment-app:latest .
```
Run:
```powershell
docker run -d --name hospital-appointment -p 3001:3000 -v hospital-data:/app/data hospital-appointment-app:latest
```
Open http://localhost:3001

Check:
```powershell
docker ps
docker logs hospital-appointment
```
Stop/remove:
```powershell
docker rm -f hospital-appointment
```

## GitHub
Create an empty repository in your own GitHub account, then run from the project root:
```powershell
git init
git add .
git commit -m "Initial commit - Hospital Appointment Booking System"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/Hospital-Appointment-Booking-System.git
git push -u origin main
```
Replace `YOUR_USERNAME`. Do not commit real secrets or production database files.

## Jenkins
1. Install Git, Pipeline and Docker Pipeline plugins (and configure Docker access).
2. Create a Pipeline job.
3. Select **Pipeline script from SCM** → Git.
4. Enter your repository URL and branch `*/main`.
5. Script path: `Jenkinsfile`.
6. Save and click Build Now.

The supplied Jenkinsfile runs npm tests, builds the Docker image, starts a temporary container, checks `/health`, then runs Selenium. It assumes the Jenkins agent has Node.js/npm, Docker, Python, Selenium-compatible Chrome/Chromium and ChromeDriver/Selenium Manager access. If your Jenkins is Windows, make sure Python, Chrome and Docker are available to the Jenkins service account. If Selenium prerequisites are not installed on the agent, the Selenium stage will fail until they are configured.

## Notes
- The app uses a local SQLite file and cookie-based sessions.
- The appointment date is checked against past dates and a doctor's existing non-cancelled slot.
- This is a student demonstration. A production medical application needs stronger security, CSRF protection, secure secret management, audit logging, privacy controls, backups, accessibility review and clinical/legal review.
\n\n## CityCare dashboard interface\nThe home page has been redesigned using the supplied CityCare Hospital dashboard reference: blue-and-white header, welcome banner, service highlights, specialist cards, doctor search panel, and responsive footer. Local SVG illustrations are stored in `public/images/`.\n