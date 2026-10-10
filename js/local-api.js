/* Local "backend" for the Hospital Management System.
   It works like the REST API of the Java version, but stores all data in the browser (localStorage).
   Function api(path, method, body) is used by every page. */

const DB_KEY = 'hms_db_v1';

// ---------- password hashing (SHA-256 when available) ----------
async function hashPassword(text) {
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('hms:' + text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 5381;                                   // simple fallback hash
  for (const c of 'hms:' + text) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
  return 'x' + h.toString(16);
}

// ---------- database ----------
function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore and create a new one */ }
  return null;
}
function saveDB(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
function nextId(db, table) {
  db.seq[table] = (db.seq[table] || 0) + 1;
  return db.seq[table];
}
function fail(message) { throw new Error(message); }

async function createSeed() {
  const db = { users: [], departments: [], doctors: [], patients: [], appointments: [], bills: [], seq: {} };
  const addUser = async (username, password, role, fullName) => {
    const u = { id: nextId(db, 'users'), username, passwordHash: await hashPassword(password), role, fullName };
    db.users.push(u); return u;
  };
  await addUser('admin', 'admin123', 'ADMIN', 'Hospital Admin');
  ['General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics']
    .forEach(n => db.departments.push({ id: nextId(db, 'departments'), name: n }));
  const docs = [['Dr. Ravi Kumar', 'dr.ravi', 1, '9876543210', 300],
                ['Dr. Priya Nair', 'dr.priya', 2, '9845012345', 500],
                ['Dr. Suresh Babu', 'dr.suresh', 3, '9790011223', 400]];
  for (const d of docs) {
    const u = await addUser(d[1], 'doctor123', 'DOCTOR', d[0]);
    db.doctors.push({ id: nextId(db, 'doctors'), userId: u.id, name: d[0], departmentId: d[2], phone: d[3], consultationFee: d[4] });
  }
  saveDB(db);
  return db;
}

async function getDB() { return loadDB() || await createSeed(); }

// ---------- helpers that build the same objects the Java API returned ----------
const doctorView = (db, d) => ({
  id: d.id, name: d.name, phone: d.phone, consultationFee: d.consultationFee,
  department: db.departments.find(x => x.id === d.departmentId)
});
const appointmentView = (db, a) => ({
  id: a.id, appointmentDate: a.appointmentDate, appointmentTime: a.appointmentTime,
  reason: a.reason, status: a.status, diagnosis: a.diagnosis, prescription: a.prescription,
  patient: db.patients.find(p => p.id === a.patientId),
  doctor: doctorView(db, db.doctors.find(d => d.id === a.doctorId))
});
const billView = (db, b) => ({
  id: b.id, consultationFee: b.consultationFee, medicineCharges: b.medicineCharges,
  total: b.total, status: b.status,
  appointment: appointmentView(db, db.appointments.find(a => a.id === b.appointmentId))
});
const blank = s => s == null || String(s).trim() === '';

// ---------- the "REST API" ----------
async function api(path, method = 'GET', body) {
  const db = await getDB();
  const [route, queryString] = path.split('?');
  const q = new URLSearchParams(queryString || '');
  const parts = route.split('/').filter(Boolean);       // e.g. ['appointments','3','cancel']
  const res = parts[0];
  const id = parts[1] ? Number(parts[1]) : null;
  const action = parts[2] || parts[1];
  body = body || {};

  // ----- auth -----
  if (res === 'auth' && parts[1] === 'login') {
    if (blank(body.username) || blank(body.password)) fail('Username and password are required');
    const u = db.users.find(x => x.username === body.username.trim());
    if (!u || u.passwordHash !== await hashPassword(body.password)) fail('Invalid username or password');
    const out = { userId: u.id, username: u.username, fullName: u.fullName, role: u.role };
    if (u.role === 'DOCTOR') out.profileId = (db.doctors.find(d => d.userId === u.id) || {}).id;
    if (u.role === 'PATIENT') out.profileId = (db.patients.find(p => p.userId === u.id) || {}).id;
    return out;
  }
  if (res === 'auth' && parts[1] === 'register') {
    if (blank(body.fullName) || blank(body.username) || blank(body.password)) fail('Name, username and password are required');
    if (body.password.length < 6) fail('Password must be at least 6 characters');
    if (db.users.some(u => u.username === body.username.trim())) fail('Username already exists');
    const u = { id: nextId(db, 'users'), username: body.username.trim(),
                passwordHash: await hashPassword(body.password), role: 'PATIENT', fullName: body.fullName.trim() };
    db.users.push(u);
    const p = { id: nextId(db, 'patients'), userId: u.id, name: u.fullName, age: body.age,
                gender: body.gender, phone: body.phone, address: body.address };
    db.patients.push(p); saveDB(db);
    return p;
  }

  // ----- departments -----
  if (res === 'departments') {
    if (method === 'GET') return db.departments;
    if (method === 'POST') {
      if (blank(body.name)) fail('Department name is required');
      if (db.departments.some(d => d.name.toLowerCase() === body.name.trim().toLowerCase())) fail('Department already exists');
      const d = { id: nextId(db, 'departments'), name: body.name.trim() };
      db.departments.push(d); saveDB(db); return d;
    }
    if (method === 'DELETE') {
      if (db.doctors.some(d => d.departmentId === id)) fail('Department is used by a doctor');
      db.departments = db.departments.filter(d => d.id !== id); saveDB(db); return null;
    }
  }

  // ----- doctors -----
  if (res === 'doctors') {
    if (method === 'GET') return db.doctors.map(d => doctorView(db, d));
    if (method === 'POST') {
      if (blank(body.name) || blank(body.username) || blank(body.password) || body.password.length < 6 || !body.departmentId)
        fail('Name, department, username and a password of at least 6 characters are required');
      const fee = Number(body.consultationFee || 0);
      if (fee < 0) fail('Fee cannot be negative');
      if (!db.departments.some(d => d.id === body.departmentId)) fail('Department not found');
      if (db.users.some(u => u.username === body.username.trim())) fail('Username already exists');
      const u = { id: nextId(db, 'users'), username: body.username.trim(),
                  passwordHash: await hashPassword(body.password), role: 'DOCTOR', fullName: body.name.trim() };
      db.users.push(u);
      const d = { id: nextId(db, 'doctors'), userId: u.id, name: body.name.trim(), phone: body.phone,
                  departmentId: body.departmentId, consultationFee: fee };
      db.doctors.push(d); saveDB(db); return doctorView(db, d);
    }
    if (method === 'DELETE') {
      const d = db.doctors.find(x => x.id === id);
      if (!d) fail('Doctor not found');
      if (db.appointments.some(a => a.doctorId === id)) fail('Doctor has appointments and cannot be deleted');
      db.doctors = db.doctors.filter(x => x.id !== id);
      db.users = db.users.filter(u => u.id !== d.userId); saveDB(db); return null;
    }
  }

  // ----- patients -----
  if (res === 'patients') {
    if (method === 'GET' && id) return db.patients.find(p => p.id === id) || fail('Patient not found');
    if (method === 'GET') return db.patients;
    if (method === 'DELETE') {
      const p = db.patients.find(x => x.id === id);
      if (!p) fail('Patient not found');
      if (db.appointments.some(a => a.patientId === id)) fail('Patient has appointments and cannot be deleted');
      db.patients = db.patients.filter(x => x.id !== id);
      db.users = db.users.filter(u => u.id !== p.userId); saveDB(db); return null;
    }
  }

  // ----- appointments -----
  if (res === 'appointments') {
    if (method === 'GET') {
      let list = db.appointments;
      if (q.get('patientId')) list = list.filter(a => a.patientId === Number(q.get('patientId')));
      if (q.get('doctorId')) list = list.filter(a => a.doctorId === Number(q.get('doctorId')));
      return list.slice()
        .sort((a, b) => (b.appointmentDate + b.appointmentTime).localeCompare(a.appointmentDate + a.appointmentTime))
        .map(a => appointmentView(db, a));
    }
    if (method === 'POST') {
      if (!body.patientId || !body.doctorId || !body.date || !body.time) fail('Doctor, date and time are required');
      if (body.date < todayStr()) fail('Date cannot be in the past');
      if (!db.patients.some(p => p.id === body.patientId)) fail('Patient not found');
      if (!db.doctors.some(d => d.id === body.doctorId)) fail('Doctor not found');
      if (db.appointments.some(a => a.doctorId === body.doctorId && a.appointmentDate === body.date &&
            a.appointmentTime === body.time && a.status !== 'CANCELLED'))
        fail('This slot is already booked. Please choose another time');
      const a = { id: nextId(db, 'appointments'), patientId: body.patientId, doctorId: body.doctorId,
                  appointmentDate: body.date, appointmentTime: body.time, reason: body.reason, status: 'BOOKED' };
      db.appointments.push(a); saveDB(db); return appointmentView(db, a);
    }
    if (method === 'PUT') {
      const a = db.appointments.find(x => x.id === id);
      if (!a) fail('Appointment not found');
      if (a.status !== 'BOOKED') fail(action === 'cancel' ? 'Only booked appointments can be cancelled'
                                                           : 'Only booked appointments can be completed');
      if (action === 'cancel') { a.status = 'CANCELLED'; saveDB(db); return appointmentView(db, a); }
      if (action === 'complete') {
        const medicine = Number(body.medicineCharges || 0);
        if (medicine < 0) fail('Medicine charges cannot be negative');
        const doc = db.doctors.find(d => d.id === a.doctorId);
        a.diagnosis = body.diagnosis; a.prescription = body.prescription; a.status = 'COMPLETED';
        db.bills.push({ id: nextId(db, 'bills'), appointmentId: a.id, consultationFee: doc.consultationFee,
                        medicineCharges: medicine, total: doc.consultationFee + medicine, status: 'PENDING' });
        saveDB(db); return appointmentView(db, a);
      }
    }
  }

  // ----- bills -----
  if (res === 'bills') {
    if (method === 'GET') {
      let list = db.bills;
      if (q.get('patientId')) {
        const pid = Number(q.get('patientId'));
        list = list.filter(b => db.appointments.find(a => a.id === b.appointmentId).patientId === pid);
      }
      return list.slice().sort((a, b) => b.id - a.id).map(b => billView(db, b));
    }
    if (method === 'PUT' && action === 'pay') {
      const b = db.bills.find(x => x.id === id);
      if (!b) fail('Bill not found');
      b.status = 'PAID'; saveDB(db); return billView(db, b);
    }
  }

  // ----- reports -----
  if (res === 'reports') {
    const count = s => db.appointments.filter(a => a.status === s).length;
    const sum = s => db.bills.filter(b => b.status === s).reduce((t, b) => t + b.total, 0);
    return { patients: db.patients.length, doctors: db.doctors.length, appointments: db.appointments.length,
             booked: count('BOOKED'), completed: count('COMPLETED'), cancelled: count('CANCELLED'),
             revenuePaid: sum('PAID'), revenuePending: sum('PENDING') };
  }

  fail('Unknown request: ' + method + ' ' + path);
}
