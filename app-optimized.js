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
  ['login', 'admin', 'coordinador', 'psicologo'].forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) elemento.style.display = 'none';
  });
};

const mostrarVista = (vista) => {
  ocultarTodasLasVistas();
  const elemento = document.getElementById(vista);
  if (elemento) elemento.style.display = 'block';
  
  // Cargar contenido específico según la vista
  if (vista === 'coordinador') cargarCoordinador();
  else if (vista === 'admin') cargarAdmin();
  else if (vista === 'psicologo') cargarPsicologo();
};

const determinarRolPorEmail = (email) => {
  if (email === 'admin@psicoemergencia.com') return 'admin';
  if (email.includes('coordinador')) return 'coordinador';
  return 'psicologo';
};

const logout = () => {
  if (typeof firebase !== 'undefined' && auth.currentUser) {
    auth.signOut();
  }
  isAdminAuthenticated = false;
  mostrarVista('login');
};

// === CONFIGURACIÓN DE BOTONES ===
const setupEventListeners = () => {
  // Botones de logout
  ['btnSalirPsicologo', 'btnSalirCoordinador'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', logout);
  });

  // Botón crear coordinador
  const btnCrearCoordinador = document.getElementById('btnCrearCoordinador');
  if (btnCrearCoordinador) {
    btnCrearCoordinador.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('emailCoordinador')?.value;
      const password = document.getElementById('passwordCoordinador')?.value;
      const nombre = document.getElementById('nombreCoordinador')?.value;
      const zona = document.getElementById('zonaCoordinador')?.value;
      
      if (!email || !password || !nombre || !zona) {
        showError('Todos los campos son obligatorios');
        return;
      }
      
      try {
        if (typeof firebase !== 'undefined') {
          // Re-autenticar admin primero
          await auth.signInWithEmailAndPassword('admin@psicoemergencia.com', 'admin123');
          
          // Crear coordinador
          const userCredential = await auth.createUserWithEmailAndPassword(email, password);
          await userCredential.user.updateProfile({ displayName: nombre });
          
          // Guardar datos en Firestore
          await db.collection('coordinadores').doc(userCredential.user.uid).set({
            email, nombre, zona, 
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          // Re-autenticar admin
          await auth.signInWithEmailAndPassword('admin@psicoemergencia.com', 'admin123');
        }
        
        showSuccess('Coordinador creado exitosamente');
        document.getElementById('formCoordinador').reset();
        
      } catch (error) {
        showError('Error al crear coordinador: ' + error.message);
      }
    });
  }

  // Login coordinador
  const btnLoginCoord = document.getElementById('btnLoginCoord');
  if (btnLoginCoord) {
    btnLoginCoord.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = document.getElementById('emailCoord')?.value;
      const password = document.getElementById('passwordCoord')?.value;
      
      if (!email || !password) {
        showError('Email y contraseña son obligatorios');
        return;
      }
      
      try {
        if (typeof firebase !== 'undefined') {
          await auth.signInWithEmailAndPassword(email, password);
        }
        mostrarVista('coordinador');
      } catch (error) {
        showError('Error de autenticación: ' + error.message);
      }
    });
  }

  // Borrar todo
  const btnBorrarTodo = document.getElementById('btnBorrarTodo');
  if (btnBorrarTodo) {
    btnBorrarTodo.addEventListener('click', () => {
      if (confirm('¿Estás seguro de que quieres borrar todos los datos?')) {
        if (typeof firebase !== 'undefined') {
          // Lógica para borrar datos de Firebase
        }
        showSuccess('Datos borrados');
      }
    });
  }
};

// === CONFIGURACIÓN ADMIN ===
const setupAdminAccess = () => {
  const btnAdminAccess = document.getElementById('btnAdminAccess');
  if (!btnAdminAccess) return;
  
  btnAdminAccess.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const adminEmail = document.getElementById('adminEmailAccess')?.value;
    const adminPassword = document.getElementById('adminPasswordAccess')?.value;
    
    if (!adminEmail || !adminPassword) {
      showError('Credenciales vacías');
      return;
    }
    
    if (adminEmail === 'admin@psicoemergencia.com' && adminPassword === 'admin123') {
      isAdminAuthenticated = true;
      
      try {
        if (typeof firebase !== 'undefined') {
          await auth.signInWithEmailAndPassword(adminEmail, adminPassword);
        }
        mostrarVista('admin');
      } catch (authError) {
        if (authError.code === 'auth/user-not-found') {
          try {
            const userCredential = await auth.createUserWithEmailAndPassword(adminEmail, adminPassword);
            await userCredential.user.updateProfile({ displayName: 'Administrador' });
            mostrarVista('admin');
          } catch (createError) {
            showError('Error creando cuenta admin: ' + createError.message);
          }
        } else {
          showError('Error de autenticación: ' + authError.message);
        }
      }
    } else {
      showError('Credenciales incorrectas');
    }
  });
};

// === CHAT PSICÓLOGO ===
const setupChatPsicologo = () => {
  const btnSendPsico = document.getElementById('btnSendPsico');
  const msgPsico = document.getElementById('msgPsico1');
  
  if (btnSendPsico && msgPsico) {
    btnSendPsico.addEventListener('click', () => {
      const message = msgPsico.value.trim();
      if (!message) return;
      
      const chatContainer = document.getElementById('chat-psicologo');
      if (chatContainer) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message sent';
        messageElement.innerHTML = `
          <div class="message-content">${message}</div>
          <div class="message-time">${new Date().toLocaleTimeString()}</div>
        `;
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
      
      msgPsico.value = '';
    });
  }
};

const cargarChatPsicologo = () => {
  const chatContainer = document.getElementById('chat-psicologo');
  if (!chatContainer) return;
  
  // Cargar mensajes demo
  const mensajesDemo = [
    { texto: '¡Hola! ¿Cómo puedo ayudarte hoy?', esCoordinador: true, hora: '10:30' },
    { texto: 'Necesito reportar una situación urgente en la zona norte', esCoordinador: false, hora: '10:32' },
    { texto: 'Entendido. ¿Puedes proporcionar más detalles?', esCoordinador: true, hora: '10:33' }
  ];
  
  chatContainer.innerHTML = '';
  mensajesDemo.forEach(msg => {
    const messageElement = document.createElement('div');
    messageElement.className = msg.esCoordinador ? 'message received' : 'message sent';
    messageElement.innerHTML = `
      <div class="message-content">${msg.texto}</div>
      <div class="message-time">${msg.hora}</div>
    `;
    chatContainer.appendChild(messageElement);
  });
};

// === CHAT COORDINADOR ===
const setupChatCoordinador = () => {
  const btnSendCoord = document.getElementById('btnSendCoord');
  const msgCoord = document.getElementById('msgCoord1');
  const selectPsico = document.getElementById('selectPsico');
  
  if (btnSendCoord && msgCoord) {
    btnSendCoord.addEventListener('click', () => {
      const message = msgCoord.value.trim();
      if (!message) return;
      
      const chatContainer = document.getElementById('chat-coordinador');
      if (chatContainer) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message sent';
        messageElement.innerHTML = `
          <div class="message-content">${message}</div>
          <div class="message-time">${new Date().toLocaleTimeString()}</div>
        `;
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
      
      msgCoord.value = '';
    });
  }
  
  if (selectPsico) {
    selectPsico.addEventListener('change', (e) => {
      currentPsicoId = e.target.value;
      cargarChatCoordinador();
    });
  }
};

const cargarChatCoordinador = () => {
  // Cargar estadísticas demo
  mostrarEstadisticasDemo();
  
  // Cargar psicólogos demo
  const selectPsico = document.getElementById('selectPsico');
  if (selectPsico) {
    todosPsicologos = [
      { id: '1', nombre: 'Dr. Juan Pérez', zona: 'Norte' },
      { id: '2', nombre: 'Dra. María García', zona: 'Sur' },
      { id: '3', nombre: 'Dr. Carlos López', zona: 'Centro' }
    ];
    
    selectPsico.innerHTML = '<option value="">Seleccionar psicólogo...</option>';
    todosPsicologos.forEach(p => {
      selectPsico.innerHTML += `<option value="${p.id}">${p.nombre} - ${p.zona}</option>`;
    });
  }
};

// === ESTADÍSTICAS DEMO ===
const mostrarEstadisticasDemo = () => {
  const stats = [
    { zona: 'Norte', activos: 15, emergencias: 8, promedio: 2.3 },
    { zona: 'Sur', activos: 12, emergencias: 5, promedio: 1.8 },
    { zona: 'Centro', activos: 18, emergencias: 12, promedio: 3.1 },
    { zona: 'Este', activos: 10, emergencias: 4, promedio: 1.5 }
  ];
  
  const tabla = document.getElementById('tablaEstadisticas');
  if (tabla) {
    tabla.innerHTML = `
      <tr><th>Zona</th><th>Psicólogos Activos</th><th>Emergencias Hoy</th><th>Promedio Tiempo</th></tr>
      ${stats.map(s => `
        <tr>
          <td>${s.zona}</td>
          <td>${s.activos}</td>
          <td>${s.emergencias}</td>
          <td>${s.promedio}h</td>
        </tr>
      `).join('')}
    `;
  }
  
  mostrarTablaPsicologosDemo();
  mostrarEstadisticasZonasDemo();
};

const mostrarTablaPsicologosDemo = () => {
  const psicologos = [
    { nombre: 'Dr. Juan Pérez', zona: 'Norte', telefono: '555-0101', estado: 'Disponible' },
    { nombre: 'Dra. María García', zona: 'Sur', telefono: '555-0102', estado: 'En emergencia' },
    { nombre: 'Dr. Carlos López', zona: 'Centro', telefono: '555-0103', estado: 'Disponible' }
  ];
  
  const tabla = document.getElementById('tablaPsicologos');
  if (tabla) {
    tabla.innerHTML = `
      <tr><th>Nombre</th><th>Zona</th><th>Teléfono</th><th>Estado</th></tr>
      ${psicologos.map(p => `
        <tr>
          <td>${p.nombre}</td>
          <td>${p.zona}</td>
          <td>${p.telefono}</td>
          <td><span class="estado ${p.estado.toLowerCase()}">${p.estado}</span></td>
        </tr>
      `).join('')}
    `;
  }
};

const mostrarEstadisticasZonasDemo = () => {
  const zonas = [
    { zona: 'Norte', emergencias: 8, resueltas: 6, pendientes: 2 },
    { zona: 'Sur', emergencias: 5, resueltas: 5, pendientes: 0 },
    { zona: 'Centro', emergencias: 12, resueltas: 9, pendientes: 3 },
    { zona: 'Este', emergencias: 4, resueltas: 3, pendientes: 1 }
  ];
  
  const container = document.getElementById('estadisticasZonas');
  if (container) {
    container.innerHTML = zonas.map(z => `
      <div class="zona-card">
        <h4>${z.zona}</h4>
        <p>Emergencias: ${z.emergencias}</p>
        <p>Resueltas: ${z.resueltas}</p>
        <p>Pendientes: ${z.pendientes}</p>
      </div>
    `).join('');
  }
};

// === CHAT ADMIN-COORDINADORES ===
const setupChatAdmin = () => {
  const selectCoordinador = document.getElementById('selectCoordinador');
  if (selectCoordinador) {
    selectCoordinador.addEventListener('change', (e) => {
      const selectedValue = e.target.value;
      if (selectedValue) {
        const [id, email] = selectedValue.split('|');
        currentCoordinadorId = id;
        currentCoordinadorEmail = email;
        cargarChatAdmin();
      }
    });
  }
};

const cargarChatAdmin = () => {
  // Cargar coordinadores demo
  const coordinadores = [
    { id: 'coord1', email: 'coordinador.norte@ejemplo.com', nombre: 'Coord. Norte' },
    { id: 'coord2', email: 'coordinador.sur@ejemplo.com', nombre: 'Coord. Sur' }
  ];
  
  const select = document.getElementById('selectCoordinador');
  if (select) {
    select.innerHTML = '<option value="">Seleccionar coordinador...</option>';
    coordinadores.forEach(c => {
      select.innerHTML += `<option value="${c.id}|${c.email}">${c.nombre} (${c.email})</option>`;
    });
  }
  
  // Cargar chat demo
  const chatContainer = document.getElementById('chat-admin');
  if (chatContainer && currentCoordinadorId) {
    const mensajes = [
      { texto: 'Hola, necesito reportar la situación actual', esAdmin: false, hora: '14:30' },
      { texto: '¿Qué está pasando? Dame los detalles', esAdmin: true, hora: '14:31' },
      { texto: 'Tenemos 3 emergencias activas en la zona norte', esAdmin: false, hora: '14:32' }
    ];
    
    chatContainer.innerHTML = '';
    mensajes.forEach(msg => {
      const messageElement = document.createElement('div');
      messageElement.className = msg.esAdmin ? 'message sent' : 'message received';
      messageElement.innerHTML = `
        <div class="message-content">${msg.texto}</div>
        <div class="message-time">${msg.hora}</div>
      `;
      chatContainer.appendChild(messageElement);
    });
  }
};

// === CHAT COORDINADOR CON ADMIN ===
const setupChatCoordinadorAdmin = () => {
  const btnSendAdmin = document.getElementById('btnSendAdmin');
  const msgAdmin = document.getElementById('msgAdmin1');
  
  if (btnSendAdmin && msgAdmin) {
    btnSendAdmin.addEventListener('click', () => {
      const message = msgAdmin.value.trim();
      if (!message) return;
      
      const chatContainer = document.getElementById('chat-coordinador-admin');
      if (chatContainer) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message sent';
        messageElement.innerHTML = `
          <div class="message-content">${message}</div>
          <div class="message-time">${new Date().toLocaleTimeString()}</div>
        `;
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
      
      msgAdmin.value = '';
    });
  }
};

const cargarChatCoordinadorAdmin = () => {
  const chatContainer = document.getElementById('chat-coordinador-admin');
  if (!chatContainer) return;
  
  const mensajes = [
    { texto: 'Buenos días, ¿cómo está la situación hoy?', esAdmin: true, hora: '09:00' },
    { texto: 'Todo bajo control. Tenemos 5 psicólogos activos', esAdmin: false, hora: '09:02' },
    { texto: 'Perfecto. Mantente en contacto', esAdmin: true, hora: '09:03' }
  ];
  
  chatContainer.innerHTML = '';
  mensajes.forEach(msg => {
    const messageElement = document.createElement('div');
    messageElement.className = msg.esAdmin ? 'message received' : 'message sent';
    messageElement.innerHTML = `
      <div class="message-content">${msg.texto}</div>
      <div class="message-time">${msg.hora}</div>
    `;
    chatContainer.appendChild(messageElement);
  });
};

// === CARGA DE CONTENIDO POR VISTA ===
const cargarAdmin = () => {
  cargarChatAdmin();
  mostrarEstadisticasDemo();
};

const cargarCoordinador = () => {
  cargarChatCoordinador();
  cargarChatCoordinadorAdmin();
};

const cargarPsicologo = () => {
  cargarChatPsicologo();
};

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', () => {
  setupAdminAccess();
  setupEventListeners();
  setupChatPsicologo();
  setupChatCoordinador();
  setupChatAdmin();
  setupChatCoordinadorAdmin();
  
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
