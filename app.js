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
// ...existing code for login, chat, CRUD, autocompletado, PDF export...
// For brevity, all logic from your previous script will be placed here, split into functions and event listeners as needed.
