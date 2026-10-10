function init() {
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => openTab(t.dataset.tab));
  document.getElementById('depForm').onsubmit = addDepartment;
  document.getElementById('docForm').onsubmit = addDoctor;
  openTab('dash');
}

const loaders = { dash: loadStats, deps: loadDepartments, docs: loadDoctors,
                  pats: loadPatients, apps: loadAppointments, bills: loadBills };

function openTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  Object.keys(loaders).forEach(k => document.getElementById(k).classList.toggle('hide', k !== name));
  run(loaders[name]);
}

async function loadStats() {
  const s = await api('/reports/summary');
  const items = [['Patients', s.patients], ['Doctors', s.doctors], ['Appointments', s.appointments],
    ['Booked', s.booked], ['Completed', s.completed], ['Cancelled', s.cancelled],
    ['Revenue (paid)', money(s.revenuePaid)], ['Pending payments', money(s.revenuePending)]];
  document.getElementById('stats').innerHTML =
    items.map(i => '<div class="stat"><b>' + esc(i[1]) + '</b><span>' + i[0] + '</span></div>').join('');
}

async function loadDepartments() {
  const list = await api('/departments');
  document.getElementById('depList').innerHTML = table(['ID', 'Name', 'Action'],
    list.map(d => [d.id, esc(d.name),
      '<button class="btn small danger" onclick="delDep(' + d.id + ')">Delete</button>']));
}
function addDepartment(e) {
  e.preventDefault();
  run(async () => {
    await api('/departments', 'POST', { name: document.getElementById('depName').value });
    e.target.reset(); toast('Department added'); loadDepartments();
  });
}
function delDep(id) {
  if (!confirm('Delete this department?')) return;
  run(async () => { await api('/departments/' + id, 'DELETE'); toast('Department deleted'); loadDepartments(); });
}

async function loadDoctors() {
  const [docs, deps] = await Promise.all([api('/doctors'), api('/departments')]);
  document.getElementById('dd').innerHTML =
    deps.map(d => '<option value="' + d.id + '">' + esc(d.name) + '</option>').join('');
  document.getElementById('docList').innerHTML = table(['ID', 'Name', 'Department', 'Phone', 'Fee', 'Action'],
    docs.map(d => [d.id, esc(d.name), esc(d.department.name), esc(d.phone), money(d.consultationFee),
      '<button class="btn small danger" onclick="delDoc(' + d.id + ')">Delete</button>']));
}
function addDoctor(e) {
  e.preventDefault();
  run(async () => {
    await api('/doctors', 'POST', {
      name: document.getElementById('dn').value,
      departmentId: Number(document.getElementById('dd').value),
      phone: document.getElementById('dph').value,
      consultationFee: Number(document.getElementById('df').value),
      username: document.getElementById('du').value,
      password: document.getElementById('dp').value
    });
    e.target.reset(); toast('Doctor added'); loadDoctors();
  });
}
function delDoc(id) {
  if (!confirm('Delete this doctor?')) return;
  run(async () => { await api('/doctors/' + id, 'DELETE'); toast('Doctor deleted'); loadDoctors(); });
}

async function loadPatients() {
  const list = await api('/patients');
  document.getElementById('patList').innerHTML = table(['ID', 'Name', 'Age', 'Gender', 'Phone', 'Address', 'Action'],
    list.map(p => [p.id, esc(p.name), esc(p.age), esc(p.gender), esc(p.phone), esc(p.address),
      '<button class="btn small danger" onclick="delPat(' + p.id + ')">Delete</button>']));
}
function delPat(id) {
  if (!confirm('Delete this patient?')) return;
  run(async () => { await api('/patients/' + id, 'DELETE'); toast('Patient deleted'); loadPatients(); });
}

async function loadAppointments() {
  const list = await api('/appointments');
  document.getElementById('appList').innerHTML = table(['ID', 'Date', 'Time', 'Patient', 'Doctor', 'Reason', 'Status'],
    list.map(a => [a.id, esc(a.appointmentDate), esc(String(a.appointmentTime).slice(0, 5)),
      esc(a.patient.name), esc(a.doctor.name), esc(a.reason), badge(a.status)]));
}

async function loadBills() {
  const list = await api('/bills');
  document.getElementById('billList').innerHTML =
    table(['Bill', 'Patient', 'Doctor', 'Consultation', 'Medicine', 'Total', 'Status'],
    list.map(b => [b.id, esc(b.appointment.patient.name), esc(b.appointment.doctor.name),
      money(b.consultationFee), money(b.medicineCharges), '<b>' + money(b.total) + '</b>', badge(b.status)]));
}

if (requireRole('ADMIN')) init();
