// Configuración de Firebase
// Configuración de Firebase (solo objeto, sin imports ni inicialización)
const firebaseConfig = {
  apiKey: "AIzaSyA59Jl1NsshafjLVzuQswpc3-4BsGUgIBI",
  authDomain: "proyecto-psicologos-7f53f.firebaseapp.com",
  projectId: "proyecto-psicologos-7f53f",
  storageBucket: "proyecto-psicologos-7f53f.appspot.com",
  messagingSenderId: "1032754415458",
  appId: "1:1032754415458:web:e0975b2549ec1373584e3b",
  measurementId: "G-DBBG2CJFQ7"
};
// Inicializa Firebase si no está inicializado
if (typeof firebase !== 'undefined' && typeof firebaseConfig !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
