const me = requireRole('DOCTOR');
const dlg = document.getElementById('dlg');
let currentId = null;
let cache = [];

if (me) load();

function load() {
  run(async () => {
    cache = await api('/appointments?doctorId=' + me.profileId);
    document.getElementById('appList').innerHTML =
      table(['ID', 'Date', 'Time', 'Patient', 'Age', 'Reason', 'Status', 'Details / Action'],
      cache.map(a => [a.id, esc(a.appointmentDate), esc(String(a.appointmentTime).slice(0, 5)),
        esc(a.patient.name), esc(a.patient.age), esc(a.reason), badge(a.status),
        a.status === 'BOOKED'
          ? '<button class="btn small" onclick="openComplete(' + a.id + ')">Complete</button>'
          : (a.status === 'COMPLETED'
              ? '<b>Dx:</b> ' + esc(a.diagnosis) + '<br><b>Rx:</b> ' + esc(a.prescription) : '-')]));
  });
}

function openComplete(id) {
  currentId = id;
  const a = cache.find(x => x.id === id);
  document.getElementById('dlgInfo').textContent =
    a.patient.name + ' – ' + a.appointmentDate + ' ' + String(a.appointmentTime).slice(0, 5);
  document.getElementById('cForm').reset();
  dlg.showModal();
}

document.getElementById('cForm').onsubmit = e => {
  e.preventDefault();
  run(async () => {
    await api('/appointments/' + currentId + '/complete', 'PUT', {
      diagnosis: document.getElementById('diag').value,
      prescription: document.getElementById('presc').value,
      medicineCharges: Number(document.getElementById('med').value || 0)
    });
    dlg.close();
    toast('Appointment completed and bill generated');
    load();
  });
};
