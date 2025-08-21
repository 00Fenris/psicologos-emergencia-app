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
<<<<<<< HEAD
const auth = firebase.auth();
const db = firebase.firestore();

// --- Funciones de vistas ---
function mostrarVista(vista) {
  document.getElementById('login').classList.add('hidden');
  document.getElementById('acceso').classList.add('hidden');
  document.getElementById('vistaPsicologo').classList.add('hidden');
  document.getElementById('vistaCoordinador').classList.add('hidden');
  if (vista === 'psicologo') document.getElementById('vistaPsicologo').classList.remove('hidden');
  if (vista === 'coordinador') document.getElementById('vistaCoordinador').classList.remove('hidden');
  if (vista === 'login') document.getElementById('login').classList.remove('hidden');
  if (vista === 'acceso') document.getElementById('acceso').classList.remove('hidden');
}

// --- Login y registro ---
document.getElementById('btnLogin').onclick = async () => {
  const email = document.getElementById('email').value;
  const pass = document.getElementById('password').value;
  try {
    const userCred = await auth.signInWithEmailAndPassword(email, pass);
    const user = userCred.user;
    const doc = await db.collection('usuarios').doc(user.uid).get();
    const rol = doc.exists ? doc.data().rol : 'psicologo';
    mostrarVista(rol);
  } catch (e) {
    document.getElementById('loginError').textContent = e.message;
  }
};

document.getElementById('btnRegister').onclick = async () => {
  const email = document.getElementById('email').value;
  const pass = document.getElementById('password').value;
  const rol = document.getElementById('rol').value;
  try {
    const userCred = await auth.createUserWithEmailAndPassword(email, pass);
    const user = userCred.user;
    await db.collection('usuarios').doc(user.uid).set({ rol });
    mostrarVista('login');
    document.getElementById('loginError').textContent = 'Registro exitoso. Ahora puedes iniciar sesión.';
  } catch (e) {
    document.getElementById('loginError').textContent = e.message;
  }
};

// --- Salir ---
function logout() {
  auth.signOut();
  mostrarVista('login');
}
document.getElementById('btnSalirPsicologo').onclick = logout;
document.getElementById('btnSalirCoordinador').onclick = logout;

// --- Cambio de vistas desde acceso ---
document.getElementById('btnPsicologo').onclick = () => mostrarVista('psicologo');
document.getElementById('btnCoordinador').onclick = () => mostrarVista('coordinador');

// --- Mantener sesión ---
auth.onAuthStateChanged(async user => {
  if (user) {
    const doc = await db.collection('usuarios').doc(user.uid).get();
    const rol = doc.exists ? doc.data().rol : 'psicologo';
    mostrarVista(rol);
    document.getElementById('acceso').style.display = 'none';
  } else {
    mostrarVista('login');
    document.getElementById('acceso').style.display = '';
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
const msgPsico = document.getElementById('msgPsico');
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

const btnSendCoord = document.getElementById('btnSendCoord');
const msgCoord = document.getElementById('msgCoord');
const selectPsico = document.getElementById('selectPsico');
let currentPsicoId = '';
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
}

=======
// --- Modo local automático ---
const LOCAL_MODE = (typeof firebase === 'undefined' || typeof firebaseConfig === 'undefined');

// Utilidades para localStorage
const LS_KEY_USERS = 'psicologos_app_usuarios';
const LS_KEY_DISP = 'psicologos_app_disponibilidad';
function lsGet(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } }
function lsSet(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// --- Login y registro modo local ---
if (LOCAL_MODE) {
  document.getElementById('btnLogin').onclick = () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const users = lsGet(LS_KEY_USERS);
    const user = users.find(u => u.email === email && u.pass === pass);
    if (user) {
      mostrarVista(user.rol);
      document.getElementById('loginError').textContent = '';
    } else {
      document.getElementById('loginError').textContent = 'Usuario o contraseña incorrectos.';
    }
  };
  document.getElementById('btnRegister').onclick = () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const rol = document.getElementById('rol').value;
    let users = lsGet(LS_KEY_USERS);
    if (users.find(u => u.email === email)) {
      document.getElementById('loginError').textContent = 'El email ya está registrado.';
      return;
    }
    users.push({ email, pass, rol });
    lsSet(LS_KEY_USERS, users);
    document.getElementById('loginError').textContent = 'Registro exitoso. Ahora puedes iniciar sesión.';
    mostrarVista('login');
  };
}
>>>>>>> c6a8ca0 (Modo local automático con localStorage para login y registro)
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
const zonaInput = document.getElementById('zona');
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
const semanaInput = document.getElementById('semana');
const turnoSelect = document.getElementById('turno');
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
const formPsico = document.getElementById('formPsico');
if(formPsico){
  formPsico.addEventListener('submit', async e => {
    e.preventDefault();
    const registro = {
      nombre: formPsico.nombre.value.trim(),
      telefono: formPsico.telefono.value.trim(),
      zona: formPsico.zona.value,
      semana: formPsico.semana.value,
      turno: formPsico.turno.value,
      notas: formPsico.notas.value.trim(),
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
