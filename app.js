// === CONFIGURACIÓN FIREBASE ===
if (typeof firebase !== 'undefined') {
  const firebaseConfig = {
    apiKey: "AIzaSyBi8SPO7FMPL5gWN0k7LkKwJB97Qo-3_sU",
    authDomain: "psicologos-emergencia.firebaseapp.com",
    projectId: "psicologos-emergencia",
    storageBucket: "psicologos-emergencia.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456"
  };
  
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// === VARIABLES GLOBALES ===
let isAdminAuthenticated = false;
let currentCoordinadorId = '';
let currentCoordinadorEmail = '';
let currentPsicoId = '';
let todosPsicologos = [];

// === UTILIDADES ===
const showError = (message) => {
  alert(`❌ Error: ${message}`);
  if (typeof firebase === 'undefined') console.log('❌ Error:', message);
};

const showSuccess = (message) => {
  alert(`✅ ${message}`);
  if (typeof firebase === 'undefined') console.log('✅ Éxito:', message);
};

const ocultarTodasLasVistas = () => {
  ['login', 'panelAdmin', 'vistaCoordinador', 'vistaPsicologo'].forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.style.display = 'none';
      elemento.classList.add('hidden');
    }
  });
};

const mostrarVista = (vista) => {
  ocultarTodasLasVistas();
  
  // Mapear vistas a IDs correctos
  const vistaMap = {
    'login': 'login',
    'admin': 'panelAdmin',
    'coordinador': 'vistaCoordinador',
    'psicologo': 'vistaPsicologo'
  };
  
  const idVista = vistaMap[vista] || vista;
  const elemento = document.getElementById(idVista);
  
  if (elemento) {
    elemento.style.display = 'block';
    elemento.classList.remove('hidden');
    console.log(`✅ Vista mostrada: ${vista} (${idVista})`);
  } else {
    console.log(`❌ Vista no encontrada: ${vista} (${idVista})`);
  }
};

const determinarRolPorEmail = (email) => {
  if (email.includes('admin')) return 'admin';
  if (email.includes('coordinador')) return 'coordinador';
  return 'psicologo';
};

// === FUNCIONES DE LOGIN ===
const loginUsuarios = async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  
  if (!email || !password) {
    showError('Introduce email y contraseña.');
    return;
  }
  
  try {
    if (typeof firebase === 'undefined') {
      // Modo demo
      const rol = determinarRolPorEmail(email);
      showSuccess(`Login exitoso en modo demo como ${rol}`);
      mostrarVista(rol);
      return;
    }
    
    await auth.signInWithEmailAndPassword(email, password);
    const rol = determinarRolPorEmail(email);
    showSuccess('Login exitoso');
    mostrarVista(rol);
  } catch (error) {
    showError('Credenciales incorrectas: ' + error.message);
  }
};

const registroUsuarios = async () => {
  const email = document.getElementById('emailRegistro').value.trim();
  const password = document.getElementById('passwordRegistro').value;
  const nombre = document.getElementById('nombreRegistro').value.trim();
  const apellido = document.getElementById('apellidoRegistro').value.trim();
  const telefono = document.getElementById('telefonoRegistro').value.trim();
  const zona = document.getElementById('zonaRegistro').value;
  
  if (!email || !password || !nombre || !apellido || !telefono || !zona) {
    showError('Todos los campos son obligatorios.');
    return;
  }
  
  try {
    if (typeof firebase === 'undefined') {
      showSuccess('Registro exitoso en modo demo');
      mostrarVista('login');
      return;
    }
    
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    
    await db.collection('psicologos').doc(userCredential.user.uid).set({
      nombre, apellido, email, telefono, zona,
      estado: 'disponible',
      fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    showSuccess('Registro exitoso');
    mostrarVista('login');
  } catch (error) {
    showError('Error en registro: ' + error.message);
  }
};

const loginAdmin = async () => {
  const email = document.getElementById('adminEmailAccess').value.trim();
  const password = document.getElementById('adminPasswordAccess').value;
  
  const ADMIN_CREDENTIALS = {
    email: 'test@mail.com',
    password: '123456'
  };
  
  if (!email || !password) {
    showError('Introduce email y contraseña de administrador.');
    return;
  }
  
  if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
    showSuccess('Acceso autorizado');
    isAdminAuthenticated = true;
    mostrarVista('admin');
  } else {
    showError('Credenciales de administrador incorrectas.');
  }
};

// === FUNCIONES DE CHAT ===
const enviarMensajePsicologo = async () => {
  const mensaje = document.getElementById('mensajePsicologo').value.trim();
  if (!mensaje) return;
  
  if (typeof firebase === 'undefined') {
    mostrarMensajeLocal('chatPsicologo', mensaje, 'sent');
    document.getElementById('mensajePsicologo').value = '';
    return;
  }
  
  try {
    await db.collection('chats').add({
      mensaje,
      remitente: currentPsicoId,
      rol: 'psicologo',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    document.getElementById('mensajePsicologo').value = '';
  } catch (error) {
    showError('Error al enviar mensaje: ' + error.message);
  }
};

const enviarMensajeCoordinador = async () => {
  const mensaje = document.getElementById('mensajeCoordinador').value.trim();
  if (!mensaje) return;
  
  if (typeof firebase === 'undefined') {
    mostrarMensajeLocal('chatCoordinador', mensaje, 'sent');
    document.getElementById('mensajeCoordinador').value = '';
    return;
  }
  
  try {
    await db.collection('chats').add({
      mensaje,
      remitente: currentCoordinadorId,
      rol: 'coordinador',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    document.getElementById('mensajeCoordinador').value = '';
  } catch (error) {
    showError('Error al enviar mensaje: ' + error.message);
  }
};

const enviarMensajeAdmin = async () => {
  const mensaje = document.getElementById('mensajeAdmin').value.trim();
  if (!mensaje) return;
  
  if (typeof firebase === 'undefined') {
    mostrarMensajeLocal('chatAdmin', mensaje, 'sent');
    document.getElementById('mensajeAdmin').value = '';
    return;
  }
  
  try {
    await db.collection('chats').add({
      mensaje,
      remitente: 'admin',
      rol: 'admin',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    document.getElementById('mensajeAdmin').value = '';
  } catch (error) {
    showError('Error al enviar mensaje: ' + error.message);
  }
};

const enviarMensajeCoordinadorAdmin = async () => {
  const mensaje = document.getElementById('mensajeCoordinadorAdmin').value.trim();
  if (!mensaje) return;
  
  if (typeof firebase === 'undefined') {
    mostrarMensajeLocal('chatCoordinadorAdmin', mensaje, 'sent');
    document.getElementById('mensajeCoordinadorAdmin').value = '';
    return;
  }
  
  try {
    await db.collection('chatCoordinadorAdmin').add({
      mensaje,
      remitente: currentCoordinadorId,
      rol: 'coordinador',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    document.getElementById('mensajeCoordinadorAdmin').value = '';
  } catch (error) {
    showError('Error al enviar mensaje: ' + error.message);
  }
};

const mostrarMensajeLocal = (chatId, mensaje, tipo) => {
  const chat = document.getElementById(chatId);
  if (chat) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${tipo}`;
    messageDiv.innerHTML = `
      <div class="message-content">${mensaje}</div>
      <div class="message-time">${new Date().toLocaleTimeString()}</div>
    `;
    chat.appendChild(messageDiv);
    chat.scrollTop = chat.scrollHeight;
  }
};

// === FUNCIONES ADMINISTRATIVAS ===
const logout = () => {
  if (typeof firebase !== 'undefined' && auth.currentUser) {
    auth.signOut();
  }
  
  isAdminAuthenticated = false;
  currentCoordinadorId = '';
  currentCoordinadorEmail = '';
  currentPsicoId = '';
  
  mostrarVista('login');
  showSuccess('Sesión cerrada exitosamente');
};

const verTodosPsicologos = async () => {
  if (typeof firebase === 'undefined') {
    showSuccess('Función disponible solo con Firebase conectado');
    return;
  }
  
  try {
    const querySnapshot = await db.collection('psicologos').get();
    const psicologos = [];
    
    querySnapshot.forEach((doc) => {
      psicologos.push({ id: doc.id, ...doc.data() });
    });
    
    console.log('Psicólogos encontrados:', psicologos);
    showSuccess(`${psicologos.length} psicólogos encontrados. Ver consola.`);
  } catch (error) {
    showError('Error al obtener psicólogos: ' + error.message);
  }
};

const descargarPDF = () => {
  showSuccess('Función de descarga PDF en desarrollo');
};

const borrarTodo = async () => {
  if (!confirm('¿Estás seguro de que quieres borrar todos los datos? Esta acción no se puede deshacer.')) {
    return;
  }
  
  if (typeof firebase === 'undefined') {
    showSuccess('Función disponible solo con Firebase conectado');
    return;
  }
  
  try {
    const collections = ['psicologos', 'chats', 'chatCoordinadorAdmin'];
    
    for (const collectionName of collections) {
      const querySnapshot = await db.collection(collectionName).get();
      const batch = db.batch();
      
      querySnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    }
    
    showSuccess('Todos los datos han sido eliminados');
  } catch (error) {
    showError('Error al borrar datos: ' + error.message);
  }
};

const filtrarPsico = () => {
  const filtro = document.getElementById('filtroZona')?.value || 'todas';
  if (typeof firebase === 'undefined') {
    showSuccess(`Filtro aplicado: ${filtro} (modo demo)`);
    return;
  }
  
  showSuccess(`Filtrar por zona: ${filtro}`);
};

const refrescarCoordinadores = () => {
  if (typeof firebase === 'undefined') {
    showSuccess('Lista refrescada (modo demo)');
    return;
  }
  
  showSuccess('Lista de coordinadores actualizada');
};

// === SETUP DE EVENT LISTENERS ===
const setupEventListeners = () => {
  // Botones de login
  const btnLogin = document.getElementById('btnLogin');
  const btnRegister = document.getElementById('btnRegister');
  const btnAdminAccess = document.getElementById('btnAdminAccess');
  
  if (btnLogin) btnLogin.addEventListener('click', loginUsuarios);
  if (btnRegister) btnRegister.addEventListener('click', registroUsuarios);
  if (btnAdminAccess) btnAdminAccess.addEventListener('click', loginAdmin);
  
  // Botones de chat
  const btnSendPsico = document.getElementById('btnSendPsico');
  const btnSendCoord = document.getElementById('btnSendCoord');
  const btnSendAdmin = document.getElementById('btnSendAdmin');
  const btnSendCoordinadorAdmin = document.getElementById('btnSendCoordinadorAdmin');
  
  if (btnSendPsico) btnSendPsico.addEventListener('click', enviarMensajePsicologo);
  if (btnSendCoord) btnSendCoord.addEventListener('click', enviarMensajeCoordinador);
  if (btnSendAdmin) btnSendAdmin.addEventListener('click', enviarMensajeAdmin);
  if (btnSendCoordinadorAdmin) btnSendCoordinadorAdmin.addEventListener('click', enviarMensajeCoordinadorAdmin);
  
  // Botones administrativos
  const btnVerTodos = document.getElementById('btnVerTodos');
  const btnDescargarPDF = document.getElementById('btnDescargarPDF');
  const btnBorrarTodo = document.getElementById('btnBorrarTodo');
  const btnFiltrarPsico = document.getElementById('btnFiltrarPsico');
  const btnRefrescarCoordinadores = document.getElementById('btnRefrescarCoordinadores');
  const btnSalirAdmin = document.getElementById('btnSalirAdmin');
  
  if (btnVerTodos) btnVerTodos.addEventListener('click', verTodosPsicologos);
  if (btnDescargarPDF) btnDescargarPDF.addEventListener('click', descargarPDF);
  if (btnBorrarTodo) btnBorrarTodo.addEventListener('click', borrarTodo);
  if (btnFiltrarPsico) btnFiltrarPsico.addEventListener('click', filtrarPsico);
  if (btnRefrescarCoordinadores) btnRefrescarCoordinadores.addEventListener('click', refrescarCoordinadores);
  if (btnSalirAdmin) btnSalirAdmin.addEventListener('click', logout);
  
  // Enter key handlers para campos de texto
  const setupEnterKey = (inputId, buttonElement) => {
    const input = document.getElementById(inputId);
    if (input && buttonElement) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          buttonElement.click();
        }
      });
    }
  };
  
  setupEnterKey('email', btnLogin);
  setupEnterKey('password', btnLogin);
  setupEnterKey('adminEmailAccess', btnAdminAccess);
  setupEnterKey('adminPasswordAccess', btnAdminAccess);
  setupEnterKey('mensajePsicologo', btnSendPsico);
  setupEnterKey('mensajeCoordinador', btnSendCoord);
  setupEnterKey('mensajeAdmin', btnSendAdmin);
  setupEnterKey('mensajeCoordinadorAdmin', btnSendCoordinadorAdmin);
  
  // Configurar tabs
  const setupTabs = () => {
    const tabUsuarios = document.getElementById('tabUsuarios');
    const tabAdmin = document.getElementById('tabAdmin');
    const panelUsuarios = document.getElementById('panelUsuarios');
    const panelAdminTab = document.getElementById('panelAdminTab');
    
    if (tabUsuarios && tabAdmin && panelUsuarios && panelAdminTab) {
      tabUsuarios.addEventListener('click', () => {
        tabUsuarios.classList.add('active');
        tabAdmin.classList.remove('active');
        panelUsuarios.classList.add('active');
        panelAdminTab.classList.remove('active');
      });
      
      tabAdmin.addEventListener('click', () => {
        tabAdmin.classList.add('active');
        tabUsuarios.classList.remove('active');
        panelAdminTab.classList.add('active');
        panelUsuarios.classList.remove('active');
      });
    }
  };
  
  setupTabs();
  
  // Mostrar campos adicionales en registro
  const emailRegistro = document.getElementById('emailRegistro');
  const camposAdicionales = document.getElementById('camposAdicionales');
  
  if (emailRegistro && camposAdicionales) {
    emailRegistro.addEventListener('input', () => {
      if (emailRegistro.value.trim()) {
        camposAdicionales.style.display = 'block';
      } else {
        camposAdicionales.style.display = 'none';
      }
    });
  }
  
  console.log('✅ Event listeners configurados correctamente');
};

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Aplicación iniciando...');
  
  // Configurar event listeners
  setupEventListeners();
  
  // Mostrar vista inicial
  mostrarVista('login');
  
  if (typeof firebase === 'undefined') {
    console.log('🔄 Funcionando en modo demo sin Firebase');
  }
});

// === AUTENTICACIÓN FIREBASE ===
if (typeof firebase !== 'undefined') {
  auth.onAuthStateChanged((user) => {
    if (user && !isAdminAuthenticated) {
      const rol = determinarRolPorEmail(user.email);
      mostrarVista(rol);
    } else if (!user && !isAdminAuthenticated) {
      mostrarVista('login');
    }
  });
}

// === FUNCIÓN DE DIAGNÓSTICO ===
window.diagnosticoSistema = () => {
  console.log('=== DIAGNÓSTICO DEL SISTEMA ===');
  console.log('🔧 Firebase:', typeof firebase !== 'undefined' ? 'OK' : 'NO DISPONIBLE');
  console.log('🔧 Admin autenticado:', isAdminAuthenticated);
  console.log('🔧 Usuario actual:', firebase?.auth?.()?.currentUser?.email || 'Ninguno');
  return 'Diagnóstico completado - revisar consola';
};
