const me = requireRole('PATIENT');

if (me) {
  document.getElementById('date').min = todayStr();
  document.getElementById('bookForm').onsubmit = book;
  loadDoctors();
  loadAll();
}

function loadDoctors() {
  run(async () => {
    const docs = await api('/doctors');
    document.getElementById('doc').innerHTML = docs.map(d =>
      '<option value="' + d.id + '">' + esc(d.name) + ' – ' + esc(d.department.name) +
      ' (' + money(d.consultationFee) + ')</option>').join('');
  });
}

function loadAll() { loadAppointments(); loadBills(); }

function loadAppointments() {
  run(async () => {
    const list = await api('/appointments?patientId=' + me.profileId);
    document.getElementById('appList').innerHTML =
      table(['Date', 'Time', 'Doctor', 'Reason', 'Status', 'Diagnosis / Prescription', 'Action'],
      list.map(a => [esc(a.appointmentDate), esc(String(a.appointmentTime).slice(0, 5)), esc(a.doctor.name),
        esc(a.reason), badge(a.status),
        a.status === 'COMPLETED' ? '<b>Dx:</b> ' + esc(a.diagnosis) + '<br><b>Rx:</b> ' + esc(a.prescription) : '-',
        a.status === 'BOOKED'
          ? '<button class="btn small danger" onclick="cancelApp(' + a.id + ')">Cancel</button>' : '']));
  });
}

function loadBills() {
  run(async () => {
    const list = await api('/bills?patientId=' + me.profileId);
    document.getElementById('billList').innerHTML =
      table(['Bill', 'Doctor', 'Consultation', 'Medicine', 'Total', 'Status', 'Action'],
      list.map(b => [b.id, esc(b.appointment.doctor.name), money(b.consultationFee), money(b.medicineCharges),
        '<b>' + money(b.total) + '</b>', badge(b.status),
        b.status === 'PENDING' ? '<button class="btn small" onclick="pay(' + b.id + ')">Pay now</button>' : '']));
  });
}

function book(e) {
  e.preventDefault();
  run(async () => {
    await api('/appointments', 'POST', {
      patientId: me.profileId,
      doctorId: Number(document.getElementById('doc').value),
      date: document.getElementById('date').value,
      time: document.getElementById('time').value,
      reason: document.getElementById('reason').value
    });
    toast('Appointment booked');
    document.getElementById('reason').value = '';
    loadAppointments();
  });
}

function cancelApp(id) {
  if (!confirm('Cancel this appointment?')) return;
  run(async () => { await api('/appointments/' + id + '/cancel', 'PUT'); toast('Appointment cancelled'); loadAppointments(); });
}

function pay(id) {
  run(async () => { await api('/bills/' + id + '/pay', 'PUT'); toast('Payment recorded'); loadBills(); });
}
