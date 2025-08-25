// === CONFIGURACIÓN FIREBASE ===
// La configuración se carga desde firebaseConfig.js

// === INICIALIZACIÓN GLOBAL ===
let auth, db;
let isAdminAuthenticated = false;
let currentUser = null;
let currentUserRole = null;

// === UTILIDADES ===
const showError = (message) => {
  const errorDiv = document.getElementById('loginError');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.style.color = '#f56565';
  }
  console.error(' Error:', message);
};

const showSuccess = (message) => {
  const errorDiv = document.getElementById('loginError');
  if (errorDiv) {
    errorDiv.textContent = ` ${message}`;
    errorDiv.style.display = 'block';
    errorDiv.style.color = '#48bb78';
  }
  console.log(' Éxito:', message);
};

const clearMessages = () => {
  const errorDiv = document.getElementById('loginError');
  if (errorDiv) {
    errorDiv.style.display = 'none';
  }
};

const ocultarTodasLasVistas = () => {
  const vistas = ['login', 'vistaPsicologo', 'vistaCoordinador', 'panelAdmin'];
  vistas.forEach(vistaId => {
    const vista = document.getElementById(vistaId);
    if (vista) {
      vista.classList.add('hidden');
      vista.style.display = 'none';
    }
  });
};

const mostrarVista = (vistaId) => {
  ocultarTodasLasVistas();
  const vista = document.getElementById(vistaId);
  if (vista) {
    vista.classList.remove('hidden');
    vista.style.display = 'block';
    console.log(` Vista mostrada: ${vistaId}`);
  } else {
    console.error(` Vista no encontrada: ${vistaId}`);
  }
};

const determinarRolPorEmail = (email) => {
  if (!email) return 'psicologo';
  if (email.includes('admin')) return 'admin';
  if (email.includes('coordinador')) return 'coordinador';
  return 'psicologo';
};

// === FUNCIONES DE AUTENTICACIÓN ===
const loginUsuarios = async () => {
  clearMessages();
  
  const email = document.getElementById('emailLogin').value.trim();
  const password = document.getElementById('passwordLogin').value;
  
  if (!email || !password) {
    showError('Introduce email y contraseña.');
    return;
  }
  
  try {
    if (typeof firebase === 'undefined' || !firebase.apps.length) {
      // Modo demo
      const rol = determinarRolPorEmail(email);
      showSuccess(`Login exitoso en modo demo como ${rol}`);
      currentUser = { email, uid: 'demo-user' };
      currentUserRole = rol;
      
      setTimeout(() => {
        if (rol === 'admin') {
          mostrarVista('panelAdmin');
        } else if (rol === 'coordinador') {
          mostrarVista('vistaCoordinador');
        } else {
          mostrarVista('vistaPsicologo');
        }
      }, 1000);
      return;
    }
    
    // Autenticación con Firebase
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const rol = determinarRolPorEmail(email);
    currentUser = userCredential.user;
    currentUserRole = rol;
    
    showSuccess('Login exitoso');
    setTimeout(() => {
      if (rol === 'admin') {
        mostrarVista('panelAdmin');
      } else if (rol === 'coordinador') {
        mostrarVista('vistaCoordinador');
      } else {
        mostrarVista('vistaPsicologo');
      }
    }, 1000);
    
  } catch (error) {
    showError('Credenciales incorrectas: ' + error.message);
  }
};

const toggleRegisterFields = () => {
  const registerFields = document.getElementById('registerFields');
  const btnRegister = document.getElementById('btnRegister');
  
  if (registerFields && btnRegister) {
    const isVisible = registerFields.style.display !== 'none';
    registerFields.style.display = isVisible ? 'none' : 'block';
    btnRegister.textContent = isVisible ? 'Registrarse como Psicólogo' : 'Cancelar Registro';
  }
};

const loginAdmin = async () => {
  clearMessages();
  
  const email = document.getElementById('adminEmailAccess').value.trim();
  const password = document.getElementById('adminPasswordAccess').value;
  
  // Credenciales hardcodeadas para demo
  const ADMIN_CREDENTIALS = {
    email: 'admin@psicologos.com',
    password: 'admin123'
  };
  
  if (!email || !password) {
    showError('Introduce email y contraseña de administrador.');
    return;
  }
  
  if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
    showSuccess('Acceso administrativo autorizado');
    isAdminAuthenticated = true;
    currentUser = { email, uid: 'admin-user' };
    currentUserRole = 'admin';
    
    setTimeout(() => {
      mostrarVista('panelAdmin');
    }, 1000);
  } else {
    showError('Credenciales de administrador incorrectas.');
  }
};

const logout = () => {
  if (typeof firebase !== 'undefined' && firebase.apps.length && auth.currentUser) {
    auth.signOut();
  }
  
  isAdminAuthenticated = false;
  currentUser = null;
  currentUserRole = null;
  
  mostrarVista('login');
  showSuccess('Sesión cerrada exitosamente');
};

// === CONFIGURACIÓN DE EVENTOS ===
document.addEventListener('DOMContentLoaded', () => {
  console.log(' Sistema de Psicólogos Emergencia iniciado');
  
  // Verificar Firebase
  if (typeof firebase !== 'undefined' && firebase.apps.length) {
    auth = firebase.auth();
    db = firebase.firestore();
    console.log(' Firebase disponible');
  } else {
    console.log(' Modo demo - Firebase no disponible');
  }
  
  // Configurar eventos
  const btnLogin = document.getElementById('btnLogin');
  const btnRegister = document.getElementById('btnRegister');
  const btnAdminAccess = document.getElementById('btnAdminAccess');
  const btnSalirPsicologo = document.getElementById('btnSalirPsicologo');
  
  if (btnLogin) btnLogin.addEventListener('click', loginUsuarios);
  if (btnRegister) btnRegister.addEventListener('click', toggleRegisterFields);
  if (btnAdminAccess) btnAdminAccess.addEventListener('click', loginAdmin);
  if (btnSalirPsicologo) btnSalirPsicologo.addEventListener('click', logout);
  
  // Configurar tabs
  const tabUsuarios = document.getElementById('tabUsuarios');
  const tabAdmin = document.getElementById('tabAdmin');
  const panelUsuarios = document.getElementById('panelUsuarios');
  const panelAdminTab = document.getElementById('panelAdminTab');
  
  if (tabUsuarios && tabAdmin) {
    tabUsuarios.addEventListener('click', () => {
      tabUsuarios.classList.add('active');
      tabAdmin.classList.remove('active');
      if (panelUsuarios) panelUsuarios.style.display = 'block';
      if (panelAdminTab) panelAdminTab.style.display = 'none';
    });
    
    tabAdmin.addEventListener('click', () => {
      tabAdmin.classList.add('active');
      tabUsuarios.classList.remove('active');
      if (panelAdminTab) panelAdminTab.style.display = 'block';
      if (panelUsuarios) panelUsuarios.style.display = 'none';
    });
  }
  
  console.log(' Configuración completada');
});

// === FUNCIÓN DE DIAGNÓSTICO ===
window.diagnosticoSistema = () => {
  console.log('=== DIAGNÓSTICO DEL SISTEMA ===');
  console.log(' Firebase:', typeof firebase !== 'undefined' && firebase.apps.length ? 'OK' : 'NO DISPONIBLE');
  console.log(' Usuario actual:', currentUser?.email || 'Ninguno');
  console.log(' Rol actual:', currentUserRole || 'Ninguno');
  console.log(' Admin autenticado:', isAdminAuthenticated);
  return 'Diagnóstico completado - revisar consola';
};
