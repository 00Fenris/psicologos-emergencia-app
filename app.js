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
  const tabPsicologo = document.getElementById('tabPsicologo');
  const tabAdmin = document.getElementById('tabAdmin');
  const panelPsicologo = document.getElementById('panelPsicologo');
  const panelAdminTab = document.getElementById('panelAdminTab'); // Cambié aquí

  if (tabPsicologo && tabAdmin) {
    tabPsicologo.onclick = () => {
      tabPsicologo.classList.add('active');
      tabAdmin.classList.remove('active');
      panelPsicologo.classList.add('active');
      panelAdminTab.classList.remove('active');
    };

    tabAdmin.onclick = () => {
      tabAdmin.classList.add('active');
      tabPsicologo.classList.remove('active');
      panelAdminTab.classList.add('active');
      panelPsicologo.classList.remove('active');
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
        showSuccess('Acceso autorizado. Accediendo al panel...');
        
        // Marcar que el admin está autenticado
        isAdminAuthenticated = true;
        
        // Intentar autenticar con Firebase si es posible
        try {
          await firebase.auth().signInWithEmailAndPassword(adminEmail, adminPassword);
          console.log('Admin autenticado con Firebase');
        } catch (authError) {
          console.log('Admin usando autenticación local:', authError.message);
        }
        
        setTimeout(() => {
          mostrarVista('panelAdmin');
        }, 1000);
      } else {
        showError('Credenciales de administrador incorrectas.');
      }
    };
  } else {
    console.log('Botón btnAdminAccess no encontrado');
  }
  if (btnSalirAdmin) btnSalirAdmin.onclick = logout;

  // Login coordinador rápido
  const btnLoginCoordQuick = document.getElementById('btnLoginCoordQuick');
  if (btnLoginCoordQuick) {
    btnLoginCoordQuick.onclick = async () => {
      const email = document.getElementById('coordEmailQuick').value.trim();
      const pass = document.getElementById('coordPasswordQuick').value;
      
      if (!email || !pass) {
        showError('Completa todos los campos.');
        return;
      }
      
      try {
        const userCred = await auth.signInWithEmailAndPassword(email, pass);
        const user = userCred.user;
        const doc = await db.collection('usuarios').doc(user.uid).get();
        if (doc.exists && doc.data().rol === 'coordinador') {
          mostrarVista('coordinador');
        } else {
          showError('Este usuario no es coordinador.');
        }
      } catch (e) {
        showError('Error: ' + e.message);
      }
    };
  }
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
  if (vista === 'coordinador') document.getElementById('vistaCoordinador').classList.remove('hidden');
  if (vista === 'login') document.getElementById('login').classList.remove('hidden');
  if (vista === 'panelAdmin') {
    document.getElementById('panelAdmin').classList.remove('hidden');
    // Solo cargar estadísticas si hay un usuario autenticado
    setTimeout(() => {
      cargarEstadisticas();
      cargarListaCoordinadores();
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
      
      // Cerrar sesión del coordinador recién creado
      await auth.signOut();
      
      // Mostrar mensaje de éxito
      errorDiv.textContent = `✅ Coordinador ${email} creado exitosamente.`;
      errorDiv.style.color = 'green';
      
      // Limpiar campos
      document.getElementById('adminEmail').value = '';
      document.getElementById('adminPassword').value = '';
      
      // Recargar estadísticas y lista de coordinadores
      cargarEstadisticas();
      cargarListaCoordinadores();
      
      // El admin no necesita volver a loguearse, solo se mantiene en el panel
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

// Cargar estadísticas para panel admin
async function cargarEstadisticas() {
  try {
    // Verificar si el usuario está autenticado o es admin
    if (!firebase.auth().currentUser && !isAdminAuthenticated) {
      console.log('Usuario no autenticado, saltando estadísticas');
      return;
    }

    const usuariosSnap = await db.collection('usuarios').get();
    let psicologos = 0, coordinadores = 0;
    
    usuariosSnap.forEach(doc => {
      const data = doc.data();
      if (data.rol === 'psicologo') psicologos++;
      if (data.rol === 'coordinador') coordinadores++;
    });
    
    // Registros de esta semana
    const inicioSemana = new Date();
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
    inicioSemana.setHours(0, 0, 0, 0);
    
    const registrosSnap = await db.collection('disponibilidad')
      .where('timestamp', '>=', inicioSemana)
      .get();
    
    const statPsicologos = document.getElementById('statPsicologos');
    const statCoordinadores = document.getElementById('statCoordinadores');
    const statSemana = document.getElementById('statSemana');
    
    if (statPsicologos) statPsicologos.textContent = psicologos;
    if (statCoordinadores) statCoordinadores.textContent = coordinadores;
    if (statSemana) statSemana.textContent = registrosSnap.size;
  } catch (e) {
    console.error('Error cargando estadísticas:', e);
    // Mostrar valores por defecto en caso de error
    const statPsicologos = document.getElementById('statPsicologos');
    const statCoordinadores = document.getElementById('statCoordinadores');
    const statSemana = document.getElementById('statSemana');
    
    if (statPsicologos) statPsicologos.textContent = '--';
    if (statCoordinadores) statCoordinadores.textContent = '--';
    if (statSemana) statSemana.textContent = '--';
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
