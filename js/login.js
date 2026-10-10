const loginForm = document.getElementById('loginForm');
const regForm = document.getElementById('regForm');
const tabLogin = document.getElementById('tabLogin');
const tabReg = document.getElementById('tabReg');

function showTab(login) {
  loginForm.classList.toggle('hide', !login);
  regForm.classList.toggle('hide', login);
  tabLogin.classList.toggle('active', login);
  tabReg.classList.toggle('active', !login);
}
tabLogin.onclick = () => showTab(true);
tabReg.onclick = () => showTab(false);

const pages = { ADMIN: 'admin.html', DOCTOR: 'doctor.html', PATIENT: 'patient.html' };

loginForm.onsubmit = e => {
  e.preventDefault();
  run(async () => {
    const user = await api('/auth/login', 'POST', {
      username: document.getElementById('lu').value,
      password: document.getElementById('lp').value
    });
    sessionStorage.setItem('hmsUser', JSON.stringify(user));
    location.href = pages[user.role];
  });
};

regForm.onsubmit = e => {
  e.preventDefault();
  run(async () => {
    const age = document.getElementById('ra').value;
    await api('/auth/register', 'POST', {
      fullName: document.getElementById('rn').value,
      username: document.getElementById('ru').value,
      password: document.getElementById('rp').value,
      age: age === '' ? null : Number(age),
      gender: document.getElementById('rg').value,
      phone: document.getElementById('rph').value,
      address: document.getElementById('rad').value
    });
    toast('Account created. Please login.');
    document.getElementById('lu').value = document.getElementById('ru').value;
    regForm.reset();
    showTab(true);
  });
};

// If already logged in, go to the dashboard
const existing = getUser();
if (existing && pages[existing.role]) location.href = pages[existing.role];

// Reset all saved data (patients, appointments, bills) and go back to the demo data
document.getElementById('resetData').onclick = e => {
  e.preventDefault();
  if (!confirm('Delete all saved data and restore the demo data?')) return;
  localStorage.removeItem(DB_KEY);
  sessionStorage.removeItem('hmsUser');
  toast('Demo data restored');
};
