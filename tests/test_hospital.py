import os
import time
import unittest
import uuid
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC

BASE_URL = os.environ.get("BASE_URL", "http://localhost:3000")

class HospitalAppointmentE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        options = webdriver.ChromeOptions()
        options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1440,1000")
        cls.driver = webdriver.Chrome(options=options)
        cls.wait = WebDriverWait(cls.driver, 12)

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()

    def test_complete_patient_and_admin_workflow(self):
        d = self.driver
        email = f"selenium_{uuid.uuid4().hex[:8]}@example.com"
        password = "TestPass123!"
        future_date = time.strftime("%Y-%m-%d", time.localtime(time.time() + 86400 * 7))

        # Health endpoint and homepage
        d.get(BASE_URL + "/health")
        self.assertIn("running", d.find_element(By.TAG_NAME, "body").text.lower())
        d.get(BASE_URL + "/")
        self.assertIn("Hospital Appointment", d.title)

        # Registration
        d.get(BASE_URL + "/register.html")
        d.find_element(By.ID, "name").send_keys("Selenium Test Patient")
        d.find_element(By.ID, "email").send_keys(email)
        d.find_element(By.ID, "password").send_keys(password)
        d.find_element(By.ID, "register-button").click()
        self.wait.until(EC.text_to_be_present_in_element((By.ID, "message"), "Registration successful"))

        # Login
        d.get(BASE_URL + "/login.html")
        d.find_element(By.ID, "email").send_keys(email)
        d.find_element(By.ID, "password").send_keys(password)
        d.find_element(By.ID, "login-button").click()
        self.wait.until(lambda driver: "/appointments.html" in driver.current_url)

        # Search doctors
        d.get(BASE_URL + "/doctors.html")
        d.find_element(By.ID, "specialization").send_keys("Cardiology")
        d.find_element(By.ID, "search-button").click()
        self.wait.until(EC.text_to_be_present_in_element((By.ID, "doctor-results"), "Cardiology"))
        self.assertIn("Cardiology", d.find_element(By.ID, "doctor-results").text)

        # Book appointment
        d.get(BASE_URL + "/appointments.html")
        doctor_select = self.wait.until(EC.presence_of_element_located((By.ID, "doctor")))
        self.wait.until(lambda driver: len(Select(doctor_select).options) > 1)
        Select(doctor_select).select_by_index(1)
        d.find_element(By.ID, "appointment-date").send_keys(future_date)
        d.find_element(By.ID, "appointment-time").send_keys("10:30AM")
        d.find_element(By.ID, "book-button").click()
        self.wait.until(EC.text_to_be_present_in_element((By.ID, "message"), "Appointment booked successfully"))

        # Cancel appointment
        cancel = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, ".cancel-appointment")))
        cancel.click()
        self.wait.until(EC.text_to_be_present_in_element((By.ID, "message"), "Appointment cancelled successfully"))

        # Logout patient using the POST logout endpoint
        logout_result = d.execute_async_script("""
            const done = arguments[0];
            fetch('/api/auth/logout', {method: 'POST', credentials: 'same-origin'})
              .then(r => r.json()).then(done).catch(e => done({error: String(e)}));
        """)
        self.assertIn("Logged out", logout_result.get("message", ""))

        # Admin login and appointment management page
        d.get(BASE_URL + "/login.html")
        d.find_element(By.ID, "email").send_keys("admin@hospital.com")
        d.find_element(By.ID, "password").send_keys("Admin@123")
        d.find_element(By.ID, "login-button").click()
        self.wait.until(lambda driver: "/admin.html" in driver.current_url)
        self.wait.until(EC.visibility_of_element_located((By.ID, "admin-dashboard")))
        self.assertTrue(d.find_element(By.ID, "admin-dashboard").is_displayed())

        # Update an appointment status when the test booking is listed
        status_selects = d.find_elements(By.CSS_SELECTOR, ".status-select")
        if status_selects:
            Select(status_selects[0]).select_by_visible_text("Confirmed")
            self.wait.until(lambda driver: Select(
                driver.find_elements(By.CSS_SELECTOR, ".status-select")[0]
            ).first_selected_option.text == "Confirmed")

if __name__ == "__main__":
    unittest.main(verbosity=2)
