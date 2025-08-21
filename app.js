// Carga la configuración de Firebase desde firebaseConfig.js (no subir este archivo al repositorio)
// Crea un archivo 'firebaseConfig.js' con tu configuración real y agrégalo al .gitignore
// Ejemplo:
// const firebaseConfig = { ... };
// if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
//
// Aquí solo se inicializa si existe firebaseConfig
if (typeof firebaseConfig !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// Variables globales
let isAdminAuthenticated = false; // Para track del admin

// --- Inicialización y funciones de UI ---
document.addEventListener('DOMContentLoaded', function() {
  // Funcionalidad de pestañas
  const tabUsuarios = document.getElementById('tabUsuarios');
  const tabAdmin = document.getElementById('tabAdmin');
  const panelUsuarios = document.getElementById('panelUsuarios');
  const panelAdminTab = document.getElementById('panelAdminTab');

  if (tabUsuarios && tabAdmin) {
    tabUsuarios.onclick = () => {
      tabUsuarios.classList.add('active');
      tabAdmin.classList.remove('active');
      panelUsuarios.classList.add('active');
      panelAdminTab.classList.remove('active');
    };

    tabAdmin.onclick = () => {
      tabAdmin.classList.add('active');
      tabUsuarios.classList.remove('active');
      panelAdminTab.classList.add('active');
      panelUsuarios.classList.remove('active');
    };
  }

  // Panel Admin - autenticación requerida
  const btnAdminAccess = document.getElementById('btnAdminAccess');
  const btnSalirAdmin = document.getElementById('btnSalirAdmin');
  
  // Credenciales de administrador (en producción deberían estar en una base de datos segura)
  const ADMIN_CREDENTIALS = {
    email: 'test@mail.com',
    password: '123456'
  };
  
  if (btnAdminAccess) {
    btnAdminAccess.onclick = async () => {
      const adminEmail = document.getElementById('adminEmailAccess').value.trim();
      const adminPassword = document.getElementById('adminPasswordAccess').value;
      
      // Validar credenciales de administrador
      if (!adminEmail || !adminPassword) {
        showError('Introduce email y contraseña de administrador.');
        return;
      }
      
      if (adminEmail === ADMIN_CREDENTIALS.email && adminPassword === ADMIN_CREDENTIALS.password) {
        console.log('Acceso de administrador autorizado');
        showSuccess('Acceso autorizado. Creando cuenta admin si no existe...');
        
        try {
          // Intentar login primero
          await firebase.auth().signInWithEmailAndPassword(adminEmail, adminPassword);
          console.log('Admin autenticado con Firebase');
          isAdminAuthenticated = true;
        } catch (authError) {
          console.log('Cuenta admin no existe, creándola...', authError.message);
          
          try {
            // Crear cuenta de administrador
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(adminEmail, adminPassword);
            const user = userCredential.user;
            
            // Guardar datos del admin en Firestore
            await db.collection('usuarios').doc(user.uid).set({
              email: adminEmail,
              rol: 'admin',
              fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
              nombre: 'Administrador del Sistema'
            });
            
            console.log('Cuenta admin creada exitosamente');
            isAdminAuthenticated = true;
            showSuccess('Cuenta de administrador creada y autenticada');
          } catch (createError) {
            console.log('Error creando cuenta admin:', createError.message);
            // Si no puede crear cuenta, usar modo local
            isAdminAuthenticated = true;
            showSuccess('Usando modo administrador local');
          }
        }
        
        setTimeout(() => {
          mostrarVista('panelAdmin');
        }, 1500);
      } else {
        showError('Credenciales de administrador incorrectas.');
      }
    };
  } else {
    console.log('Botón btnAdminAccess no encontrado');
  }
  if (btnSalirAdmin) btnSalirAdmin.onclick = logout;
});

// Función para mostrar errores de forma elegante
function showError(message) {
  const errorDiv = document.getElementById('loginError');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }
}

// Función para mostrar mensajes de éxito
function showSuccess(message) {
  const errorDiv = document.getElementById('loginError');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.background = '#d1fae5';
    errorDiv.style.color = '#059669';
    errorDiv.style.display = 'block';
    setTimeout(() => {
      errorDiv.style.display = 'none';
      errorDiv.style.background = '#fee2e2';
      errorDiv.style.color = '#dc2626';
    }, 3000);
  }
}

// --- Funciones de vistas ---
function mostrarVista(vista) {
  document.getElementById('login').classList.add('hidden');
  document.getElementById('vistaPsicologo').classList.add('hidden');
  document.getElementById('vistaCoordinador').classList.add('hidden');
  document.getElementById('panelAdmin').classList.add('hidden');
  if (vista === 'psicologo') document.getElementById('vistaPsicologo').classList.remove('hidden');
  if (vista === 'coordinador') {
    document.getElementById('vistaCoordinador').classList.remove('hidden');
    // Cargar datos del coordinador
    setTimeout(() => {
      cargarEstadisticasCoordinador();
      cargarPsicologosDisponibles();
      cargarChatCoordinadorAdmin(); // Cargar chat con admin
    }, 100);
  }
  if (vista === 'login') document.getElementById('login').classList.remove('hidden');
  if (vista === 'panelAdmin') {
    document.getElementById('panelAdmin').classList.remove('hidden');
    // Solo cargar estadísticas si hay un usuario autenticado
    setTimeout(() => {
      cargarEstadisticas();
      cargarListaCoordinadores();
      cargarCoordinadoresParaChat(); // Cargar coordinadores para chat
    }, 100);
  }
}

// --- Login y registro ---
document.getElementById('btnLogin').onclick = async () => {
  const email = document.getElementById('emailLogin').value.trim();
  const pass = document.getElementById('passwordLogin').value;
  
  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    showError('Por favor, introduce un email válido.');
    return;
  }
  
  // Validar contraseña
  if (!pass) {
    showError('Por favor, introduce una contraseña.');
    return;
  }
  
  try {
    const userCred = await auth.signInWithEmailAndPassword(email, pass);
    const user = userCred.user;
    const doc = await db.collection('usuarios').doc(user.uid).get();
    const rol = doc.exists ? doc.data().rol : 'psicologo';
    mostrarVista(rol);
  } catch (e) {
    showError('Error: ' + e.message);
  }
};

// Determinar rol basado en el dominio del email
function determinarRolPorEmail(email) {
  // Dominios de coordinadores (puedes añadir más)
  const dominiosCoordinadores = ['admin.psico.es', 'coord.psico.es', 'administracion.psico.es'];
  const dominio = email.split('@')[1];
  return dominiosCoordinadores.includes(dominio) ? 'coordinador' : 'psicologo';
}

document.getElementById('btnRegister').onclick = async () => {
  // Mostrar campos de registro si están ocultos
  const registerFields = document.getElementById('registerFields');
  if (registerFields.style.display === 'none') {
    registerFields.style.display = 'block';
    return;
  }
  
  const email = document.getElementById('emailRegister').value.trim();
  const pass = document.getElementById('passwordRegister').value;
  
  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    showError('Por favor, introduce un email válido.');
    return;
  }
  
  // Validar contraseña
  if (!pass || pass.length < 6) {
    showError('La contraseña debe tener al menos 6 caracteres.');
    return;
  }
  
  // El rol se determina automáticamente como 'psicologo' para registro público
  const rol = 'psicologo';
  
  try {
    const userCred = await auth.createUserWithEmailAndPassword(email, pass);
    const user = userCred.user;
    await db.collection('usuarios').doc(user.uid).set({ rol, email });
    showSuccess('Registro exitoso. Ahora puedes iniciar sesión.');
    registerFields.style.display = 'none';
    // Limpiar campos
    document.getElementById('emailRegister').value = '';
    document.getElementById('passwordRegister').value = '';
  } catch (e) {
    showError(e.message);
  }
};

// --- Salir ---
function logout() {
  auth.signOut();
  isAdminAuthenticated = false; // Limpiar la autenticación del admin
  mostrarVista('login');
}
const btnSalirPsicologo = document.getElementById('btnSalirPsicologo');
const btnSalirCoordinador = document.getElementById('btnSalirCoordinador');
if (btnSalirPsicologo) btnSalirPsicologo.onclick = logout;
if (btnSalirCoordinador) btnSalirCoordinador.onclick = logout;

// Crear coordinador desde panel admin
const btnCrearCoordinador = document.getElementById('btnCrearCoordinador');
if (btnCrearCoordinador) {
  btnCrearCoordinador.onclick = async () => {
    const email = document.getElementById('adminEmail').value.trim();
    const pass = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('adminError');
    
    if (!email || !pass) {
      errorDiv.textContent = 'Completa todos los campos.';
      errorDiv.style.color = 'red';
      return;
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errorDiv.textContent = 'Formato de email inválido.';
      errorDiv.style.color = 'red';
      return;
    }
    
    // Validar contraseña
    if (pass.length < 6) {
      errorDiv.textContent = 'La contraseña debe tener al menos 6 caracteres.';
      errorDiv.style.color = 'red';
      return;
    }
    
    try {
      // Crear usuario temporalmente
      const userCred = await auth.createUserWithEmailAndPassword(email, pass);
      const user = userCred.user;
      
      // Guardar información del coordinador
      await db.collection('usuarios').doc(user.uid).set({ 
        rol: 'coordinador',
        email: email,
        creadoPor: 'admin',
        fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Mostrar mensaje de éxito
      errorDiv.textContent = `✅ Coordinador ${email} creado exitosamente.`;
      errorDiv.style.color = 'green';
      
      // Limpiar campos
      document.getElementById('adminEmail').value = '';
      document.getElementById('adminPassword').value = '';
      
      // Re-autenticar al admin para mantener la sesión
      try {
        if (ADMIN_CREDENTIALS.email && ADMIN_CREDENTIALS.password) {
          await auth.signInWithEmailAndPassword(ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
          console.log('Admin re-autenticado exitosamente');
        }
      } catch (reAuthError) {
        console.log('No se pudo re-autenticar admin, usando modo local');
        isAdminAuthenticated = true;
      }
      
      // Recargar estadísticas y lista de coordinadores
      setTimeout(() => {
        cargarEstadisticas();
        cargarListaCoordinadores();
        cargarCoordinadoresParaChat(); // Nueva función para el chat
      }, 500);
      
      console.log('Coordinador creado, admin permanece en panel');
      
    } catch (e) {
      errorDiv.textContent = `Error: ${e.message}`;
      errorDiv.style.color = 'red';
    }
  };
}

// Login coordinador desde panel admin
const btnLoginCoord = document.getElementById('btnLoginCoord');
if (btnLoginCoord) {
  btnLoginCoord.onclick = async () => {
    const email = document.getElementById('coordEmail').value.trim();
    const pass = document.getElementById('coordPassword').value;
    
    try {
      const userCred = await auth.signInWithEmailAndPassword(email, pass);
      const user = userCred.user;
      const doc = await db.collection('usuarios').doc(user.uid).get();
      if (doc.exists && doc.data().rol === 'coordinador') {
        mostrarVista('coordinador');
      } else {
        document.getElementById('adminError').textContent = 'Este usuario no es coordinador.';
        document.getElementById('adminError').style.color = 'red';
      }
    } catch (e) {
      document.getElementById('adminError').textContent = e.message;
      document.getElementById('adminError').style.color = 'red';
    }
  };
}

// --- Mantener sesión ---
auth.onAuthStateChanged(async user => {
  if (user) {
    const doc = await db.collection('usuarios').doc(user.uid).get();
    const rol = doc.exists ? doc.data().rol : 'psicologo';
    mostrarVista(rol);
  } else {
    mostrarVista('login');
    // No necesitamos mostrar elemento 'acceso' porque usamos las vistas
  }
});

// --- Botón Borrar Todo con confirmación ---
const btnBorrarTodo = document.getElementById('btnBorrarTodo');
if (btnBorrarTodo) {
  btnBorrarTodo.onclick = () => {
    if (confirm('¿Estás seguro de que quieres borrar TODOS los registros? Esta acción no se puede deshacer.')) {
      db.collection('disponibilidad').get().then(snapshot => {
        const batch = db.batch();
        snapshot.forEach(doc => batch.delete(doc.ref));
        batch.commit().then(() => {
          // Actualiza la vista si tienes función para ello
          if (typeof mostrarListadoFirestoreFirestore === 'function') mostrarListadoFirestoreFirestore({});
          if (typeof mostrarListadoFirestore === 'function') mostrarListadoFirestore({});
        });
      });
    }
  };
}

// --- Botones de chat (plantilla básica) ---
const btnSendPsico = document.getElementById('btnSendPsico');
const msgPsico = document.getElementById('msgPsico1');
if (btnSendPsico && msgPsico) {
  btnSendPsico.onclick = () => {
    const text = msgPsico.value.trim();
    if (!text || !auth.currentUser) return;
    db.collection('conversaciones').doc(auth.currentUser.uid + '_coordinador').collection('mensajes').add({
      text,
      userType: 'psicologo',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    msgPsico.value = '';
  };
}

// --- Chat coordinador con filtros múltiples ---
const btnSendCoord = document.getElementById('btnSendCoord');
const msgCoord = document.getElementById('msgCoord1');
const selectPsico = document.getElementById('selectPsico');
let currentPsicoId = '';
let todosPsicologos = [];

// Cargar estadísticas avanzadas para panel admin
async function cargarEstadisticas() {
  try {
    // Verificar si el usuario está autenticado o es admin
    if (!firebase.auth().currentUser && !isAdminAuthenticated) {
      console.log('Usuario no autenticado, saltando estadísticas');
      return;
    }

    // Si es admin local sin Firebase auth, mostrar datos de demostración
    if (isAdminAuthenticated && !firebase.auth().currentUser) {
      console.log('Cargando estadísticas en modo demo para admin local');
      mostrarEstadisticasDemo();
      return;
    }

    // Estadísticas básicas de usuarios
    const usuariosSnap = await db.collection('usuarios').get();
    let psicologos = 0, coordinadores = 0;
    
    usuariosSnap.forEach(doc => {
      const data = doc.data();
      if (data.rol === 'psicologo') psicologos++;
      if (data.rol === 'coordinador') coordinadores++;
    });
    
    // Estadísticas de informes
    const informesSnap = await db.collection('informes').get();
    let salidasMes = 0, pacientesTotales = 0, tiempoTotal = 0;
    
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    
    const informesMesSnap = await db.collection('informes')
      .where('fechaCreacion', '>=', inicioMes)
      .get();
    
    informesSnap.forEach(doc => {
      const data = doc.data();
      pacientesTotales += data.pacientesAtendidos || 0;
      tiempoTotal += data.duracion || 0;
    });
    
    salidasMes = informesMesSnap.size;
    
    // Registros de esta semana
    const inicioSemana = new Date();
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
    inicioSemana.setHours(0, 0, 0, 0);
    
    const registrosSnap = await db.collection('disponibilidad')
      .where('timestamp', '>=', inicioSemana)
      .get();
    
    // Actualizar elementos
    const statPsicologos = document.getElementById('statPsicologos');
    const statCoordinadores = document.getElementById('statCoordinadores');
    const statSalidasMes = document.getElementById('statSalidasMes');
    const statSemana = document.getElementById('statSemana');
    const statPacientesTotales = document.getElementById('statPacientesTotales');
    const statTiempoPromedio = document.getElementById('statTiempoPromedio');
    
    if (statPsicologos) statPsicologos.textContent = psicologos;
    if (statCoordinadores) statCoordinadores.textContent = coordinadores;
    if (statSalidasMes) statSalidasMes.textContent = salidasMes;
    if (statSemana) statSemana.textContent = registrosSnap.size;
    if (statPacientesTotales) statPacientesTotales.textContent = pacientesTotales;
    if (statTiempoPromedio) {
      const promedio = salidasMes > 0 ? Math.round(tiempoTotal / salidasMes) : 0;
      statTiempoPromedio.textContent = promedio;
    }
    
    // Cargar estadísticas por psicólogo
    await cargarEstadisticasPsicologos();
    
    // Cargar estadísticas por zonas
    await cargarEstadisticasZonas();
    
  } catch (e) {
    console.error('Error cargando estadísticas:', e);
    // Mostrar valores por defecto en caso de error
    const elementos = ['statPsicologos', 'statCoordinadores', 'statSalidasMes', 'statSemana', 'statPacientesTotales', 'statTiempoPromedio'];
    elementos.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.textContent = '--';
    });
  }
}

// Mostrar estadísticas de demostración para admin local
function mostrarEstadisticasDemo() {
  console.log('Mostrando estadísticas de demo');
  
  // Datos de ejemplo
  const datosDemo = {
    psicologos: 12,
    coordinadores: 3,
    salidasMes: 45,
    registrosSemana: 8,
    pacientesTotales: 89,
    tiempoPromedio: 75
  };
  
  // Actualizar elementos
  const elementos = [
    { id: 'statPsicologos', valor: datosDemo.psicologos },
    { id: 'statCoordinadores', valor: datosDemo.coordinadores },
    { id: 'statSalidasMes', valor: datosDemo.salidasMes },
    { id: 'statSemana', valor: datosDemo.registrosSemana },
    { id: 'statPacientesTotales', valor: datosDemo.pacientesTotales },
    { id: 'statTiempoPromedio', valor: datosDemo.tiempoPromedio }
  ];
  
  elementos.forEach(({ id, valor }) => {
    const element = document.getElementById(id);
    if (element) element.textContent = valor;
  });
  
  // Mostrar tabla de demo
  mostrarTablaPsicologosDemo();
  
  // Mostrar estadísticas de zonas demo
  mostrarEstadisticasZonasDemo();
}

// Tabla de psicólogos demo
function mostrarTablaPsicologosDemo() {
  const tbody = document.getElementById('tablaPsicologosBody');
  if (!tbody) return;
  
  const psicologosDemo = [
    { nombre: 'Dr. Ana García', email: 'ana.garcia@demo.com', salidas: 15, pacientes: 28, zonas: 4, tiempo: '22.5h', actividad: '20/08/2025' },
    { nombre: 'Dr. Carlos López', email: 'carlos.lopez@demo.com', salidas: 12, pacientes: 22, zonas: 3, tiempo: '18.0h', actividad: '19/08/2025' },
    { nombre: 'Dra. María Santos', email: 'maria.santos@demo.com', salidas: 18, pacientes: 35, zonas: 5, tiempo: '27.0h', actividad: '21/08/2025' },
    { nombre: 'Dr. Pedro Ruiz', email: 'pedro.ruiz@demo.com', salidas: 8, pacientes: 16, zonas: 2, tiempo: '12.5h', actividad: '18/08/2025' }
  ];
  
  let html = '';
  psicologosDemo.forEach(psi => {
    html += `
      <tr>
        <td><strong>${psi.nombre}</strong><br><small>${psi.email}</small></td>
        <td>${psi.salidas}</td>
        <td>${psi.pacientes}</td>
        <td>${psi.zonas}</td>
        <td>${psi.tiempo}</td>
        <td>${psi.actividad}</td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
}

// Estadísticas de zonas demo
function mostrarEstadisticasZonasDemo() {
  const container = document.getElementById('estadisticasZonas');
  if (!container) return;
  
  const zonasDemo = [
    { zona: 'Centro Histórico', salidas: 18, pacientes: 34, tiempo: 27.5, psicologos: 4 },
    { zona: 'Zona Norte', salidas: 15, pacientes: 28, tiempo: 22.0, psicologos: 3 },
    { zona: 'Barrio Sur', salidas: 12, pacientes: 23, tiempo: 18.5, psicologos: 3 },
    { zona: 'Periferia Este', salidas: 8, pacientes: 16, tiempo: 12.0, psicologos: 2 }
  ];
  
  let html = '';
  zonasDemo.forEach(zona => {
    html += `
      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:15px;margin-bottom:10px;background:white;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <h4 style="margin:0;color:#2d3748;">${zona.zona}</h4>
          <span style="background:#4299e1;color:white;padding:4px 8px;border-radius:4px;font-size:0.8em;">
            ${zona.salidas} salidas
          </span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;font-size:0.9em;">
          <div><strong>Pacientes:</strong> ${zona.pacientes}</div>
          <div><strong>Tiempo total:</strong> ${zona.tiempo}h</div>
          <div><strong>Psicólogos:</strong> ${zona.psicologos}</div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

// === SISTEMA DE CHAT ADMIN-COORDINADORES ===

// Variables globales para el chat
let currentCoordinadorId = '';
let currentCoordinadorEmail = '';

// Cargar coordinadores para el selector de chat
async function cargarCoordinadoresParaChat() {
  try {
    const select = document.getElementById('selectCoordinador');
    if (!select) return;
    
    // Si es modo demo
    if (isAdminAuthenticated && !firebase.auth().currentUser) {
      select.innerHTML = `
        <option value="">-- Selecciona un coordinador --</option>
        <option value="demo1">coord1@hospital.com</option>
        <option value="demo2">coord2@emergencias.com</option>
        <option value="demo3">coord3@salud.gov</option>
      `;
      return;
    }
    
    // Modo real con Firebase
    const coordinadoresSnap = await db.collection('usuarios')
      .where('rol', '==', 'coordinador')
      .get();
    
    select.innerHTML = '<option value="">-- Selecciona un coordinador --</option>';
    
    coordinadoresSnap.forEach(doc => {
      const data = doc.data();
      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = data.email;
      option.dataset.email = data.email;
      select.appendChild(option);
    });
    
  } catch (e) {
    console.error('Error cargando coordinadores para chat:', e);
  }
}

// Manejar selección de coordinador
const selectCoordinador = document.getElementById('selectCoordinador');
if (selectCoordinador) {
  selectCoordinador.onchange = () => {
    const selectedOption = selectCoordinador.options[selectCoordinador.selectedIndex];
    currentCoordinadorId = selectCoordinador.value;
    currentCoordinadorEmail = selectedOption.dataset?.email || selectedOption.textContent;
    
    if (currentCoordinadorId) {
      cargarChatAdmin();
    } else {
      const chatDiv = document.getElementById('chatAdmin');
      if (chatDiv) {
        chatDiv.innerHTML = '<p style="color:#666;text-align:center;">Selecciona un coordinador para iniciar el chat</p>';
      }
    }
  };
}

// Cargar mensajes del chat admin
function cargarChatAdmin() {
  const chatDiv = document.getElementById('chatAdmin');
  if (!chatDiv || !currentCoordinadorId) return;
  
  // Si es modo demo
  if (isAdminAuthenticated && !firebase.auth().currentUser) {
    chatDiv.innerHTML = `
      <div style="margin-bottom:10px;padding:8px;background:#e3f2fd;border-radius:8px;">
        <strong>Admin:</strong> Hola, ¿cómo van las operaciones hoy?
        <small style="color:#666;display:block;">10:30 AM</small>
      </div>
      <div style="margin-bottom:10px;padding:8px;background:#f1f8e9;border-radius:8px;">
        <strong>${currentCoordinadorEmail}:</strong> Todo bien, 3 salidas programadas para esta tarde.
        <small style="color:#666;display:block;">10:35 AM</small>
      </div>
      <div style="margin-bottom:10px;padding:8px;background:#e3f2fd;border-radius:8px;">
        <strong>Admin:</strong> Perfecto, mantén informado sobre cualquier emergencia.
        <small style="color:#666;display:block;">10:36 AM</small>
      </div>
    `;
    return;
  }
  
  // Modo real con Firebase
  try {
    const chatRef = db.collection('chats')
      .doc(`admin_${currentCoordinadorId}`)
      .collection('mensajes')
      .orderBy('timestamp', 'asc');
    
    chatRef.onSnapshot(snapshot => {
      let html = '';
      snapshot.forEach(doc => {
        const msg = doc.data();
        const isAdmin = msg.remitente === 'admin';
        const bgColor = isAdmin ? '#e3f2fd' : '#f1f8e9';
        const tiempo = msg.timestamp ? msg.timestamp.toDate().toLocaleTimeString() : 'Ahora';
        
        html += `
          <div style="margin-bottom:10px;padding:8px;background:${bgColor};border-radius:8px;">
            <strong>${isAdmin ? 'Admin' : currentCoordinadorEmail}:</strong> ${msg.texto}
            <small style="color:#666;display:block;">${tiempo}</small>
          </div>
        `;
      });
      
      if (!html) {
        html = '<p style="color:#666;text-align:center;">No hay mensajes. ¡Inicia la conversación!</p>';
      }
      
      chatDiv.innerHTML = html;
      chatDiv.scrollTop = chatDiv.scrollHeight;
    });
  } catch (e) {
    console.error('Error cargando chat:', e);
    chatDiv.innerHTML = '<p style="color:#dc2626;text-align:center;">Error cargando el chat</p>';
  }
}

// Enviar mensaje del admin
const btnSendAdmin = document.getElementById('btnSendAdmin');
const msgAdmin = document.getElementById('msgAdmin');

if (btnSendAdmin && msgAdmin) {
  btnSendAdmin.onclick = async () => {
    const mensaje = msgAdmin.value.trim();
    if (!mensaje || !currentCoordinadorId) return;
    
    // Si es modo demo
    if (isAdminAuthenticated && !firebase.auth().currentUser) {
      const chatDiv = document.getElementById('chatAdmin');
      if (chatDiv) {
        const nuevoMensaje = `
          <div style="margin-bottom:10px;padding:8px;background:#e3f2fd;border-radius:8px;">
            <strong>Admin:</strong> ${mensaje}
            <small style="color:#666;display:block;">${new Date().toLocaleTimeString()}</small>
          </div>
        `;
        chatDiv.innerHTML += nuevoMensaje;
        chatDiv.scrollTop = chatDiv.scrollHeight;
      }
      msgAdmin.value = '';
      return;
    }
    
    // Modo real con Firebase
    try {
      await db.collection('chats')
        .doc(`admin_${currentCoordinadorId}`)
        .collection('mensajes')
        .add({
          texto: mensaje,
          remitente: 'admin',
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      
      msgAdmin.value = '';
    } catch (e) {
      console.error('Error enviando mensaje:', e);
      showError('Error enviando mensaje');
    }
  };
  
  // Enviar con Enter
  msgAdmin.onkeypress = (e) => {
    if (e.key === 'Enter') {
      btnSendAdmin.click();
    }
  };
}

// Botón refrescar coordinadores del chat
const btnRefrescarCoordinadoresChat = document.getElementById('btnRefrescarCoordinadoresChat');
if (btnRefrescarCoordinadoresChat) {
  btnRefrescarCoordinadoresChat.onclick = cargarCoordinadoresParaChat;
}

// === CHAT DEL COORDINADOR CON ADMIN ===

// Chat del coordinador con el admin
const btnSendCoordinadorAdmin = document.getElementById('btnSendCoordinadorAdmin');
const msgCoordinadorAdmin = document.getElementById('msgCoordinadorAdmin');

if (btnSendCoordinadorAdmin && msgCoordinadorAdmin) {
  btnSendCoordinadorAdmin.onclick = async () => {
    const mensaje = msgCoordinadorAdmin.value.trim();
    if (!mensaje || !auth.currentUser) return;
    
    try {
      await db.collection('chats')
        .doc(`admin_${auth.currentUser.uid}`)
        .collection('mensajes')
        .add({
          texto: mensaje,
          remitente: 'coordinador',
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      
      msgCoordinadorAdmin.value = '';
    } catch (e) {
      console.error('Error enviando mensaje coordinador:', e);
    }
  };
  
  msgCoordinadorAdmin.onkeypress = (e) => {
    if (e.key === 'Enter') {
      btnSendCoordinadorAdmin.click();
    }
  };
}

// Cargar chat del coordinador cuando entra a su vista
function cargarChatCoordinadorAdmin() {
  if (!auth.currentUser) return;
  
  const chatDiv = document.getElementById('chatCoordinadorAdmin');
  if (!chatDiv) return;
  
  try {
    const chatRef = db.collection('chats')
      .doc(`admin_${auth.currentUser.uid}`)
      .collection('mensajes')
      .orderBy('timestamp', 'asc');
    
    chatRef.onSnapshot(snapshot => {
      let html = '';
      snapshot.forEach(doc => {
        const msg = doc.data();
        const isCoordinador = msg.remitente === 'coordinador';
        const bgColor = isCoordinador ? '#f1f8e9' : '#e3f2fd';
        const tiempo = msg.timestamp ? msg.timestamp.toDate().toLocaleTimeString() : 'Ahora';
        
        html += `
          <div style="margin-bottom:10px;padding:8px;background:${bgColor};border-radius:8px;">
            <strong>${isCoordinador ? 'Tú' : 'Admin'}:</strong> ${msg.texto}
            <small style="color:#666;display:block;">${tiempo}</small>
          </div>
        `;
      });
      
      if (!html) {
        html = '<p style="color:#666;text-align:center;">No hay mensajes. ¡Escribe algo al admin!</p>';
      }
      
      chatDiv.innerHTML = html;
      chatDiv.scrollTop = chatDiv.scrollHeight;
    });
  } catch (e) {
    console.error('Error cargando chat coordinador:', e);
  }

// Mostrar coordinadores de demostración
function mostrarCoordinadoresDemo() {
  const listaDiv = document.getElementById('listaCoordinadores');
  if (!listaDiv) return;
  
  const coordinadoresDemo = [
    { email: 'coord1@hospital.com', fecha: '15/08/2025' },
    { email: 'coord2@emergencias.com', fecha: '18/08/2025' },
    { email: 'coord3@salud.gov', fecha: '20/08/2025' }
  ];
  
  let html = '';
  coordinadoresDemo.forEach(coord => {
    html += `
      <div style="padding:8px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <strong>${coord.email}</strong>
          <br><small style="color:#666;">Creado: ${coord.fecha}</small>
        </div>
        <span style="background:#4299e1;color:white;padding:2px 8px;border-radius:4px;font-size:0.8em;">
          Coordinador
        </span>
      </div>
    `;
  });
  
  listaDiv.innerHTML = html;
}

// Cargar estadísticas detalladas por psicólogo
async function cargarEstadisticasPsicologos() {
  try {
    const informesSnap = await db.collection('informes').get();
    const psicologosStats = new Map();
    
    // Procesar informes
    informesSnap.forEach(doc => {
      const data = doc.data();
      const email = data.psicologoEmail || 'No especificado';
      const nombre = data.psicologoNombre || 'No especificado';
      
      if (!psicologosStats.has(email)) {
        psicologosStats.set(email, {
          nombre: nombre,
          email: email,
          salidas: 0,
          pacientes: 0,
          zonas: new Set(),
          tiempoTotal: 0,
          ultimaActividad: null
        });
      }
      
      const stats = psicologosStats.get(email);
      stats.salidas++;
      stats.pacientes += data.pacientesAtendidos || 0;
      stats.zonas.add(data.ubicacion || 'No especificada');
      stats.tiempoTotal += data.duracion || 0;
      
      const fechaSalida = data.fechaSalida?.toDate();
      if (fechaSalida && (!stats.ultimaActividad || fechaSalida > stats.ultimaActividad)) {
        stats.ultimaActividad = fechaSalida;
      }
    });
    
    // Actualizar tabla
    const tbody = document.getElementById('tablaPsicologosBody');
    if (!tbody) return;
    
    if (psicologosStats.size === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#666;">No hay datos disponibles</td></tr>';
      return;
    }
    
    let html = '';
    psicologosStats.forEach(stats => {
      const ultimaActividad = stats.ultimaActividad ? 
        stats.ultimaActividad.toLocaleDateString() : 'Nunca';
      const tiempoHoras = Math.round(stats.tiempoTotal / 60 * 10) / 10;
      
      html += `
        <tr>
          <td><strong>${stats.nombre}</strong><br><small>${stats.email}</small></td>
          <td>${stats.salidas}</td>
          <td>${stats.pacientes}</td>
          <td>${stats.zonas.size}</td>
          <td>${tiempoHoras}h</td>
          <td>${ultimaActividad}</td>
        </tr>
      `;
    });
    
    tbody.innerHTML = html;
  } catch (e) {
    console.error('Error cargando estadísticas de psicólogos:', e);
    const tbody = document.getElementById('tablaPsicologosBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#dc2626;">Error cargando datos</td></tr>';
    }
  }
}

// Cargar estadísticas por zonas
async function cargarEstadisticasZonas() {
  try {
    const informesSnap = await db.collection('informes').get();
    const zonasStats = new Map();
    
    informesSnap.forEach(doc => {
      const data = doc.data();
      const zona = data.ubicacion || 'No especificada';
      
      if (!zonasStats.has(zona)) {
        zonasStats.set(zona, {
          salidas: 0,
          pacientes: 0,
          tiempoTotal: 0,
          psicologos: new Set()
        });
      }
      
      const stats = zonasStats.get(zona);
      stats.salidas++;
      stats.pacientes += data.pacientesAtendidos || 0;
      stats.tiempoTotal += data.duracion || 0;
      stats.psicologos.add(data.psicologoEmail || 'No especificado');
    });
    
    const container = document.getElementById('estadisticasZonas');
    if (!container) return;
    
    if (zonasStats.size === 0) {
      container.innerHTML = '<p style="text-align:center;color:#666;">No hay datos de zonas disponibles</p>';
      return;
    }
    
    // Convertir a array y ordenar por número de salidas
    const zonasArray = Array.from(zonasStats.entries())
      .sort((a, b) => b[1].salidas - a[1].salidas);
    
    let html = '';
    zonasArray.forEach(([zona, stats]) => {
      const tiempoHoras = Math.round(stats.tiempoTotal / 60 * 10) / 10;
      html += `
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:15px;margin-bottom:10px;background:white;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <h4 style="margin:0;color:#2d3748;">${zona}</h4>
            <span style="background:#4299e1;color:white;padding:4px 8px;border-radius:4px;font-size:0.8em;">
              ${stats.salidas} salidas
            </span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;font-size:0.9em;">
            <div><strong>Pacientes:</strong> ${stats.pacientes}</div>
            <div><strong>Tiempo total:</strong> ${tiempoHoras}h</div>
            <div><strong>Psicólogos:</strong> ${stats.psicologos.size}</div>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  } catch (e) {
    console.error('Error cargando estadísticas de zonas:', e);
    const container = document.getElementById('estadisticasZonas');
    if (container) {
      container.innerHTML = '<p style="color:#dc2626;text-align:center;">Error cargando estadísticas de zonas</p>';
    }
  }
}

// === FUNCIONES DEL COORDINADOR ===

// Cargar estadísticas para el panel coordinador
async function cargarEstadisticasCoordinador() {
  try {
    if (!firebase.auth().currentUser) {
      console.log('Usuario no autenticado para coordinador');
      return;
    }

    // Estadísticas básicas
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const inicioSemana = new Date();
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
    inicioSemana.setHours(0, 0, 0, 0);
    
    // Contar psicólogos activos (con registros recientes)
    const usuariosSnap = await db.collection('usuarios')
      .where('rol', '==', 'psicologo')
      .get();
    
    // Salidas de hoy
    const salidasHoySnap = await db.collection('informes')
      .where('fechaCreacion', '>=', hoy)
      .get();
    
    // Pacientes de esta semana
    const pacientesSemanaSnap = await db.collection('informes')
      .where('fechaCreacion', '>=', inicioSemana)
      .get();
    
    let pacientesSemana = 0;
    pacientesSemanaSnap.forEach(doc => {
      pacientesSemana += doc.data().pacientesAtendidos || 0;
    });
    
    // Actualizar elementos
    const statPsicologosActivos = document.getElementById('statPsicologosActivos');
    const statSalidasHoy = document.getElementById('statSalidasHoy');
    const statPacientesSemana = document.getElementById('statPacientesSemana');
    
    if (statPsicologosActivos) statPsicologosActivos.textContent = usuariosSnap.size;
    if (statSalidasHoy) statSalidasHoy.textContent = salidasHoySnap.size;
    if (statPacientesSemana) statPacientesSemana.textContent = pacientesSemana;
    
  } catch (e) {
    console.error('Error cargando estadísticas del coordinador:', e);
    const elementos = ['statPsicologosActivos', 'statSalidasHoy', 'statPacientesSemana'];
    elementos.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.textContent = '--';
    });
  }
}

// Cargar lista de psicólogos disponibles
async function cargarPsicologosDisponibles() {
  try {
    if (!firebase.auth().currentUser) return;
    
    const disponibilidadSnap = await db.collection('disponibilidad')
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();
    
    const container = document.getElementById('listaPsicologosDisponibles');
    if (!container) return;
    
    if (disponibilidadSnap.empty) {
      container.innerHTML = '<p style="text-align:center;color:#666;padding:20px;">No hay psicólogos registrados</p>';
      return;
    }
    
    let html = '';
    disponibilidadSnap.forEach(doc => {
      const data = doc.data();
      const fecha = data.timestamp ? data.timestamp.toDate().toLocaleDateString() : 'Fecha no disponible';
      
      html += `
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:8px;background:white;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <strong>${data.nombre}</strong>
              <br><small>📞 ${data.telefono}</small>
              <br><small>📍 ${data.zona} | 🕐 ${data.turno}</small>
            </div>
            <div style="text-align:right;">
              <span style="background:#38a169;color:white;padding:4px 8px;border-radius:4px;font-size:0.8em;">
                Disponible
              </span>
              <br><small style="color:#666;">${fecha}</small>
            </div>
          </div>
          ${data.notas ? `<div style="margin-top:8px;padding:8px;background:#f7fafc;border-radius:4px;font-size:0.9em;color:#2d3748;">📝 ${data.notas}</div>` : ''}
        </div>
      `;
    });
    
    container.innerHTML = html;
  } catch (e) {
    console.error('Error cargando psicólogos disponibles:', e);
    const container = document.getElementById('listaPsicologosDisponibles');
    if (container) {
      container.innerHTML = '<p style="color:#dc2626;text-align:center;padding:20px;">Error cargando psicólogos</p>';
    }
  }

// Cargar lista de coordinadores
async function cargarListaCoordinadores() {
  try {
    // Verificar si el usuario está autenticado o es admin
    if (!firebase.auth().currentUser && !isAdminAuthenticated) {
      console.log('Usuario no autenticado, saltando lista de coordinadores');
      return;
    }

    // Si es admin local sin Firebase auth, mostrar datos de demostración
    if (isAdminAuthenticated && !firebase.auth().currentUser) {
      console.log('Mostrando coordinadores de demo para admin local');
      mostrarCoordinadoresDemo();
      return;
    }

    const listaDiv = document.getElementById('listaCoordinadores');
    if (!listaDiv) return;
    
    const usuariosSnap = await db.collection('usuarios')
      .where('rol', '==', 'coordinador')
      .orderBy('fechaCreacion', 'desc')
      .get();
    
    if (usuariosSnap.empty) {
      listaDiv.innerHTML = '<p style="color:#666;text-align:center;">No hay coordinadores registrados</p>';
      return;
    }
    
    let html = '';
    usuariosSnap.forEach(doc => {
      const data = doc.data();
      const fecha = data.fechaCreacion ? 
        data.fechaCreacion.toDate().toLocaleDateString() : 
        'Fecha no disponible';
      
      html += `
        <div style="padding:8px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <strong>${data.email}</strong>
            <br><small style="color:#666;">Creado: ${fecha}</small>
          </div>
          <span style="background:#4299e1;color:white;padding:2px 8px;border-radius:4px;font-size:0.8em;">
            Coordinador
          </span>
        </div>
      `;
    });
    
    listaDiv.innerHTML = html;
  } catch (e) {
    console.error('Error cargando coordinadores:', e);
    const listaDiv = document.getElementById('listaCoordinadores');
    if (listaDiv) {
      listaDiv.innerHTML = '<p style="color:#dc2626;">Error cargando coordinadores</p>';
    }
  }
}

// Botón para refrescar lista de coordinadores
const btnRefrescarCoordinadores = document.getElementById('btnRefrescarCoordinadores');
if (btnRefrescarCoordinadores) {
  btnRefrescarCoordinadores.onclick = cargarListaCoordinadores;
}

// Cargar psicólogos para el selector
async function cargarPsicologos() {
  try {
    // Verificar si el usuario está autenticado o es admin
    if (!firebase.auth().currentUser && !isAdminAuthenticated) {
      console.log('Usuario no autenticado, saltando carga de psicólogos');
      return;
    }

    const disponibilidadSnap = await db.collection('disponibilidad').get();
    const psicologosMap = new Map();
    
    disponibilidadSnap.forEach(doc => {
      const data = doc.data();
      const key = data.nombre + '_' + data.telefono;
      if (!psicologosMap.has(key)) {
        psicologosMap.set(key, {
          nombre: data.nombre,
          telefono: data.telefono,
          turnos: new Set()
        });
      }
      psicologosMap.get(key).turnos.add(data.turno);
    });
    
    todosPsicologos = Array.from(psicologosMap.values()).map(p => ({
      ...p,
      turnos: Array.from(p.turnos)
    }));
    
    actualizarSelectorPsicologos();
  } catch (e) {
    console.error('Error cargando psicólogos:', e);
    // Mostrar selector vacío en caso de error
    const selectPsico = document.getElementById('selectPsico');
    if (selectPsico) {
      selectPsico.innerHTML = '<option value="">Error cargando psicólogos</option>';
    }
  }
}

// Actualizar selector de psicólogos basado en filtros
function actualizarSelectorPsicologos(turnosFiltrados = []) {
  if (!selectPsico) return;
  
  selectPsico.innerHTML = '<option value="">-- Selecciona un psicólogo --</option>';
  
  let psicologosFiltrados = todosPsicologos;
  
  if (turnosFiltrados.length > 0) {
    psicologosFiltrados = todosPsicologos.filter(p => 
      turnosFiltrados.some(turno => p.turnos.includes(turno))
    );
  }
  
  psicologosFiltrados.forEach(p => {
    const option = document.createElement('option');
    option.value = p.telefono;
    option.textContent = `${p.nombre} (${p.turnos.join(', ')})`;
    selectPsico.appendChild(option);
  });
}

// Filtro de turnos para psicólogos
const btnFiltrarPsico = document.getElementById('btnFiltrarPsico');
if (btnFiltrarPsico) {
  btnFiltrarPsico.onclick = () => {
    const checkboxes = document.querySelectorAll('#filtroTurnoPsico input[type="checkbox"]:checked');
    const turnosSeleccionados = Array.from(checkboxes).map(cb => cb.value);
    actualizarSelectorPsicologos(turnosSeleccionados);
  };
}

if (btnSendCoord && msgCoord && selectPsico) {
  selectPsico.onchange = () => {
    currentPsicoId = selectPsico.value;
  };
  btnSendCoord.onclick = () => {
    const text = msgCoord.value.trim();
    if (!text || !currentPsicoId) return;
    db.collection('conversaciones').doc(currentPsicoId + '_coordinador').collection('mensajes').add({
      text,
      userType: 'coordinador',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    msgCoord.value = '';
  };
  
  // Cargar psicólogos al inicio
  cargarPsicologos();
}
// --- Autocompletado de zonas ---
const zonasDisponibles = [
  "Ávila Zona Sur - Arenas de San Pedro",
  "Ávila Zona Norte - Ávila/Arévalo",
  "Burgos Zona Norte - Miranda de Ebro",
  "Burgos Zona Centro - Burgos",
  "Burgos Zona Sureste - Aranda de Duero",
  "León Zona Suroeste - La Bañeza",
  "León Zona Nordeste - León",
  "León Zona Astorga",
  "León Zona Noroeste - Bierzo",
  "Palencia Zona Norte - Herrera de Pisuerga",
  "Palencia Zona Sur - Palencia",
  "Salamanca Zona Suroeste - Ciudad Rodrigo",
  "Salamanca Zona Sureste - Béjar",
  "Salamanca Zona Norte - Salamanca",
  "Segovia Zona Sur - Segovia",
  "Segovia Zona Norte - Cuéllar",
  "Soria Zona Este - Soria",
  "Soria Zona Oeste - Burgo de Osma",
  "Valladolid Zona Norte - Valladolid/Rioseco",
  "Valladolid Zona Sur - Medina/Olmedo",
  "Valladolid Zona Este - Peñafiel",
  "Zamora Zona Nordeste - Benavente",
  "Zamora Zona Noroeste - Puebla de Sanabria",
  "Zamora Zona Sur - Zamora"
];
const zonaInput = document.getElementById('zona1');
const zonaSugerencias = document.getElementById('zona-sugerencias');
if(zonaInput && zonaSugerencias){
  zonaInput.addEventListener('input', function() {
    const valor = zonaInput.value.toLowerCase();
    zonaSugerencias.innerHTML = '';
    if (!valor) {
      zonaSugerencias.style.display = 'none';
      return;
    }
    const sugerencias = zonasDisponibles.filter(z => z.toLowerCase().includes(valor));
    if (sugerencias.length === 0) {
      zonaSugerencias.style.display = 'none';
      return;
    }
    sugerencias.forEach(zona => {
      const div = document.createElement('div');
      div.textContent = zona;
      div.style.padding = '8px';
      div.style.cursor = 'pointer';
      div.addEventListener('mousedown', function(e) {
        zonaInput.value = zona;
        zonaSugerencias.style.display = 'none';
      });
      zonaSugerencias.appendChild(div);
    });
    zonaSugerencias.style.display = 'block';
  });
  zonaInput.addEventListener('blur', function() {
    setTimeout(() => zonaSugerencias.style.display = 'none', 100);
  });
}

// --- Selector de turno dependiente de la fecha ---
const semanaInput = document.getElementById('semana1');
const turnoSelect = document.getElementById('turno1');
if(semanaInput && turnoSelect){
  semanaInput.addEventListener('change', function() {
    turnoSelect.innerHTML = '';
    const base = ["Mañana", "Tarde", "Noche"];
    base.forEach(turno => {
      const opt = document.createElement('option');
      opt.value = turno;
      opt.textContent = turno;
      turnoSelect.appendChild(opt);
    });
  });
}

// --- Guardar disponibilidad (CRUD) ---
const formPsico = document.getElementById('formPsico1');
if(formPsico){
  formPsico.addEventListener('submit', async e => {
    e.preventDefault();
    const registro = {
      nombre: document.getElementById('nombre1').value.trim(),
      telefono: document.getElementById('telefono1').value.trim(),
      zona: document.getElementById('zona1').value,
      semana: document.getElementById('semana1').value,
      turno: document.getElementById('turno1').value,
      notas: document.getElementById('notas1').value.trim(),
      userId: auth.currentUser ? auth.currentUser.uid : null
    };
    if (!registro.nombre || !registro.telefono || !registro.zona || !registro.semana || !registro.turno) {
      alert('Completa todos los campos obligatorios');
      return;
    }
    try {
      await db.collection('disponibilidad').add(registro);
      formPsico.reset();
      mostrarListadoDisponibilidad();
    } catch (e) {
      alert('Error al guardar: ' + e.message);
    }
  });
}

// --- Sistema de Informes para Psicólogos ---
const formInforme = document.getElementById('formInforme');
if (formInforme) {
  formInforme.addEventListener('submit', async e => {
    e.preventDefault();
    
    if (!auth.currentUser) {
      alert('Debes estar logueado para subir informes');
      return;
    }
    
    const informe = {
      psicologoId: auth.currentUser.uid,
      psicologoEmail: auth.currentUser.email,
      psicologoNombre: document.getElementById('nombre1').value.trim() || 'No especificado',
      tipoSalida: document.getElementById('tipoSalida').value,
      ubicacion: document.getElementById('ubicacionSalida').value.trim(),
      fechaSalida: new Date(document.getElementById('fechaSalida').value),
      duracion: parseInt(document.getElementById('duracionSalida').value),
      pacientesAtendidos: parseInt(document.getElementById('pacientesAtendidos').value),
      observaciones: document.getElementById('observacionesInforme').value.trim(),
      fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (!informe.tipoSalida || !informe.ubicacion || !informe.fechaSalida || !informe.duracion || !informe.pacientesAtendidos) {
      alert('Completa todos los campos obligatorios');
      return;
    }
    
    try {
      await db.collection('informes').add(informe);
      formInforme.reset();
      showSuccess('Informe subido correctamente');
    } catch (e) {
      showError('Error al subir el informe: ' + e.message);
    }
  });
}

// --- Mostrar listado de disponibilidad ---
const listaCont = document.getElementById('listadoContainer');
function mostrarListadoDisponibilidad(filtros={}){
  if(!listaCont) return;
  db.collection('disponibilidad').get().then(snapshot => {
    let datos = snapshot.docs.map(doc => ({...doc.data(), id: doc.id}));
    if (filtros.dia) {
      const filtroFecha = new Date(filtros.dia);
      datos = datos.filter(r => {
        const [year, week] = r.semana.split('-W').map(Number);
        const primerDia = new Date(year, 0, 1);
        const diaSemana = primerDia.getDay();
        const primerLunes = new Date(primerDia);
        let diff = 1 - diaSemana;
        if (diff > 0) diff -= 7;
        primerLunes.setDate(primerDia.getDate() + diff);
        const inicioSemana = new Date(primerLunes);
        inicioSemana.setDate(primerLunes.getDate() + (week - 1) * 7);
        const finSemana = new Date(inicioSemana);
        finSemana.setDate(inicioSemana.getDate() + 6);
        return filtroFecha >= inicioSemana && filtroFecha <= finSemana;
      });
    }
    if (filtros.zona) {
      datos = datos.filter(r => r.zona === filtros.zona);
    }
    if (filtros.turno) {
      datos = datos.filter(r => r.turno === filtros.turno);
    }
    listaCont.innerHTML = '';
    if (!datos.length) {
      listaCont.innerHTML = '<div class="empty">No hay registros.</div>';
      return;
    }
    const grupos = {};
    datos.forEach(r => {
      grupos[r.semana] = grupos[r.semana] || [];
      grupos[r.semana].push(r);
    });
    Object.keys(grupos).sort().forEach(sem => {
      const header = document.createElement('div');
      header.style.fontWeight = '700';
      header.style.marginTop = '10px';
      header.textContent = `Semana ${sem}`;
      listaCont.appendChild(header);
      const ul = document.createElement('ul');
      grupos[sem].forEach((r, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
          <div>
            <strong>${r.nombre}</strong> — ${r.zona} — <em>${r.telefono}</em>
            <div class="meta">Turno: ${r.turno}${r.notas ? ' · ' + r.notas : ''}</div>
          </div>
        `;
        ul.appendChild(li);
      });
      listaCont.appendChild(ul);
    });
  });
}

// --- Filtros ---
const filtroDia = document.getElementById('filtroDia');
const filtroZonaInput = document.getElementById('filtroZona');
const filtroTurno = document.getElementById('filtroTurno');
if(filtroDia) filtroDia.addEventListener('change', () => mostrarListadoDisponibilidad({ dia: filtroDia.value, zona: filtroZonaInput.value, turno: filtroTurno.value }));
if(filtroZonaInput) filtroZonaInput.addEventListener('change', () => mostrarListadoDisponibilidad({ dia: filtroDia.value, zona: filtroZonaInput.value, turno: filtroTurno.value }));
if(filtroTurno) filtroTurno.addEventListener('change', () => mostrarListadoDisponibilidad({ dia: filtroDia.value, zona: filtroZonaInput.value, turno: filtroTurno.value }));
const btnVerTodos = document.getElementById('btnVerTodos');
if(btnVerTodos){
  btnVerTodos.onclick = () => {
    filtroDia.value = '';
    filtroZonaInput.value = '';
    filtroTurno.value = '';
    mostrarListadoDisponibilidad({});
  };
}

// --- Exportar a PDF ---
const btnDescargarPDF = document.getElementById('btnDescargarPDF');
if(btnDescargarPDF){
  btnDescargarPDF.onclick = () => {
    db.collection('disponibilidad').get().then(snapshot => {
      let datos = snapshot.docs.map(doc => doc.data());
      let datosFiltrados = datos;
      if (filtroDia.value) {
        const filtroFecha = new Date(filtroDia.value);
        datosFiltrados = datosFiltrados.filter(r => {
          const [year, week] = r.semana.split('-W').map(Number);
          const primerDia = new Date(year, 0, 1);
          const diaSemana = primerDia.getDay();
          const primerLunes = new Date(primerDia);
          let diff = 1 - diaSemana;
          if (diff > 0) diff -= 7;
          primerLunes.setDate(primerDia.getDate() + diff);
          const inicioSemana = new Date(primerLunes);
          inicioSemana.setDate(primerLunes.getDate() + (week - 1) * 7);
          const finSemana = new Date(inicioSemana);
          finSemana.setDate(inicioSemana.getDate() + 6);
          return filtroFecha >= inicioSemana && filtroFecha <= finSemana;
        });
      }
      if (filtroZonaInput.value) {
        datosFiltrados = datosFiltrados.filter(r => r.zona === filtroZonaInput.value);
      }
      if (filtroTurno.value) {
        datosFiltrados = datosFiltrados.filter(r => r.turno === filtroTurno.value);
      }
      if (!datosFiltrados.length) {
        alert('No hay datos para descargar con los filtros actuales.');
        return;
      }
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text('Listado Psicólogos de Emergencia', 14, 20);
      let y = 30;
      const grupos = {};
      datosFiltrados.forEach(r => {
        grupos[r.semana] = grupos[r.semana] || [];
        grupos[r.semana].push(r);
      });
      Object.keys(grupos).sort().forEach(sem => {
        doc.setFontSize(12);
        doc.text(`Semana ${sem}`, 14, y);
        y += 8;
        doc.setFontSize(10);
        grupos[sem].forEach(r => {
          const texto = `${r.nombre} | ${r.zona} | ${r.telefono} | Turno: ${r.turno}${r.notas ? ' | ' + r.notas : ''}`;
          const splitTexto = doc.splitTextToSize(texto, 180);
          doc.text(splitTexto, 14, y);
          y += splitTexto.length * 7;
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
        });
        y += 6;
      });
      doc.save('listado_psicologos.pdf');
    });
  };
}

// Función para cargar chat coordinador con admin
function cargarChatCoordinadorAdmin() {
  console.log('Cargando chat coordinador con admin...');
  const lista = document.getElementById('listaCoordinadoresChat');
  if (lista) {
    lista.innerHTML = '<li><a href="#" onclick="seleccionarAdminParaChat()">Administrador</a></li>';
  }
}

// Función para seleccionar admin para chat
function seleccionarAdminParaChat() {
  console.log('Seleccionando admin para chat...');
  document.getElementById('coordinadorSeleccionadoName').textContent = 'Administrador';
  document.getElementById('coordinadorSeleccionadoId').value = 'admin';
  document.getElementById('chatCoordinador').style.display = 'block';
  
  // Cargar mensajes con admin
  cargarMensajesCoordinadorAdmin();
}

// Función para cargar mensajes entre coordinador y admin
function cargarMensajesCoordinadorAdmin() {
  const coordinadorId = currentUser.uid;
  const adminId = 'admin';
  const chatId = [adminId, coordinadorId].sort().join('_');
  
  db.collection('chats').doc(chatId).collection('messages')
    .orderBy('timestamp', 'asc')
    .onSnapshot((snapshot) => {
      const messagesDiv = document.getElementById('messagesCoordinador');
      messagesDiv.innerHTML = '';
      
      snapshot.forEach((doc) => {
        const message = doc.data();
        const messageElement = document.createElement('div');
        messageElement.className = message.senderId === coordinadorId ? 'message sent' : 'message received';
        
        const time = message.timestamp ? new Date(message.timestamp.toDate()).toLocaleTimeString() : 'Ahora';
        messageElement.innerHTML = `
          <div class="message-content">${message.text}</div>
          <div class="message-time">${time}</div>
        `;
        
        messagesDiv.appendChild(messageElement);
      });
      
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, (error) => {
      console.error('Error al cargar mensajes:', error);
    });
}

// Event listener para envío de mensaje desde coordinador
document.getElementById('chatFormCoordinador').addEventListener('submit', function(e) {
  e.preventDefault();
  const messageInput = document.getElementById('messageInputCoordinador');
  const message = messageInput.value.trim();
  
  if (message && currentUser) {
    const coordinadorId = currentUser.uid;
    const adminId = 'admin';
    const chatId = [adminId, coordinadorId].sort().join('_');
    
    db.collection('chats').doc(chatId).collection('messages').add({
      text: message,
      senderId: coordinadorId,
      senderName: currentUser.displayName || 'Coordinador',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      messageInput.value = '';
    })
    .catch((error) => {
      console.error('Error al enviar mensaje:', error);
    });
  }
});
