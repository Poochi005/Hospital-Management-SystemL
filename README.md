# Hospital Management System (HTML, CSS, JavaScript)

A complete Hospital Management System that runs only in the browser.
No Java, Maven or MySQL is needed. Data is saved in the browser using localStorage.

## How to run
1. Extract the zip file.
2. Open the folder in VS Code and run `index.html` with the **Live Server** extension (recommended),
   or double-click `index.html` and open it in **Chrome or Edge**.
3. Login with a demo account below.

## Demo logins
| Role    | Username  | Password   |
|---------|-----------|------------|
| Admin   | admin     | admin123   |
| Doctor  | dr.ravi   | doctor123  |
| Doctor  | dr.priya  | doctor123  |
| Doctor  | dr.suresh | doctor123  |
| Patient | use "Patient Register" on the login page |

## Features
- **Admin:** dashboard, departments, doctors, patients, all appointments, billing
- **Doctor:** own appointments, diagnosis, prescription and medicine charges, automatic bill
- **Patient:** register, book and cancel appointments, view prescriptions, pay bills
- Same doctor, date and time cannot be booked twice; past dates are rejected
- Passwords are stored as SHA-256 hashes; displayed data is escaped

## Folder structure
```
index.html      login and patient registration
admin.html      admin pages
doctor.html     doctor page
patient.html    patient page
css/style.css   styling
js/local-api.js data layer (localStorage) - works like the REST API of the Java version
js/common.js    shared helper functions
js/login.js, admin.js, doctor.js, patient.js   page scripts
```

## Notes
- Data stays only in the browser where it was created. Use "Reset demo data" on the login page to start again.
- This version has no real server, so it is meant for learning and demonstration, not for real hospital data.
- To use Java Spring Boot and MySQL instead, use the HospitalManagementSystem zip.
