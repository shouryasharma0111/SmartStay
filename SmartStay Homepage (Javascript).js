const LOCAL_USERS_KEY = 'smartstay_local_users';
const DEMO_ADMIN = {
  id: 'local-admin-demo',
  name: 'SmartStay Admin',
  email: 'admin@smartstay.test',
  password: 'AdminDemo2026!',
  role: 'admin'
};

function getLocalUsers() {
  let users = [];
  try {
    const savedUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
    if (Array.isArray(savedUsers)) users = savedUsers;
  } catch (error) {
    console.error('Unable to read locally registered accounts:', error);
  }

  if (!users.some(user => user.email === DEMO_ADMIN.email)) {
    users.push(DEMO_ADMIN);
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  }
  return users;
}

// Sticky navbar transparency on scroll
  const nav = document.getElementById('mainNav');
  window.addEventListener('scroll', () => {
    if(window.scrollY > 40){ nav.classList.add('scrolled'); }
    else{ nav.classList.remove('scrolled'); }
  });

  // Show the Owner Profile section only when "Owner" role is selected
  const ownerProfileSection = document.getElementById('ownerProfileSection');
  const roleTenant = document.getElementById('roleTenant');
  const roleOwner = document.getElementById('roleOwner');
  function toggleOwnerProfile(){
    if(roleOwner.checked){ ownerProfileSection.classList.add('active'); }
    else{ ownerProfileSection.classList.remove('active'); }
  }
  roleTenant.addEventListener('change', toggleOwnerProfile);
  roleOwner.addEventListener('change', toggleOwnerProfile);
  toggleOwnerProfile(); // set correct initial state

  // Registration Logic
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = registerForm.querySelector('input[type="email"]').value.trim().toLowerCase();
      const name = registerForm.querySelector('input[placeholder="Enter your full name"]').value.trim();
      const role = document.getElementById('roleOwner').checked ? 'owner' : 'tenant';
      const password = registerForm.querySelector('input[type="password"]').value;
      const users = getLocalUsers();
      if (users.some(user => user.email === email)) {
        alert('An account with this email already exists. Please log in.');
        return;
      }

      const user = { id: `local-${Date.now()}`, name, email, password, role };
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify([...users, user]));
      completeSignIn(user);
    });
  }

  // Login Logic
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = loginForm.querySelector('input[type="email"]').value.trim().toLowerCase();
      const password = loginForm.querySelector('input[type="password"]').value;
      const user = getLocalUsers().find(account => account.email === email && account.password === password);
      if (!user) {
        alert('Email or password is incorrect.');
        return;
      }
      completeSignIn(user);
    });
  }

  function completeSignIn(user) {
    localStorage.setItem('currentUser', JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      authMode: 'local'
    }));
    redirectForRole(user.role);
  }

  function redirectForRole(role) {
    const destinations = {
      owner: 'SmartStay OwnerDashboard (HTML).html',
      tenant: 'SmartStay TenantDashboard (HTML).html',
      admin: 'SmartStay AdminDashboard (HTML).html'
    };
    window.location.assign(destinations[role] || destinations.tenant);
  }

  // Collapse mobile menu after link click
  document.querySelectorAll('#navMenu .nav-link').forEach(link => {

    link.addEventListener('click', () => {
      const menu = document.getElementById('navMenu');
      if(menu.classList.contains('show')){
        bootstrap.Collapse.getOrCreateInstance(menu).hide();
      }
    });
  });
