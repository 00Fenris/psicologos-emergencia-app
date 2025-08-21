# Psicólogos Emergencia App

Web app para la gestión de disponibilidad y chat entre psicólogos y coordinadores en situaciones de emergencia. Utiliza Firebase para autenticación y base de datos.

## Características
- Registro y login de usuarios (psicólogo/coordinador)
- Gestión de disponibilidad semanal
- Chat en tiempo real entre psicólogos y coordinadores
- Filtrado y exportación de datos a PDF
- Autocompletado de zonas

## Estructura del proyecto
- `index.html`: Estructura principal y vistas
- `styles.css`: Estilos visuales
- `app.js`: Lógica de la aplicación (Firebase, chat, CRUD, autocompletado, PDF)
- `firebase.rules`: Reglas de seguridad para Firestore

## Configuración de Firebase
1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Copia la configuración de tu proyecto en `app.js`.
3. Sube las reglas de seguridad desde `firebase.rules` en la sección Firestore Rules.
4. Habilita Authentication (Email/Password) y Firestore Database.

## Despliegue
Puedes publicar el proyecto usando GitHub Pages:
1. Ve a la configuración del repositorio en GitHub.
2. Activa GitHub Pages y seleccion la rama `main`.
3. Accede a la URL pública que te proporciona GitHub.

## Uso
1. Abre `index.html` en tu navegador o accede a la URL de GitHub Pages.
2. Regístrate como psicólogo o coordinador.
3. Usa las vistas y funcionalidades según tu rol.

## Contacto y soporte
Para dudas o mejoras, abre un issue en el repositorio o contacta al autor.
