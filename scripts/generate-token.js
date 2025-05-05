const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// UID específico que queremos usar
const uid = 'gmaTRZUdXYW3fPE9ZP28vyx621A3';

// Generar el token personalizado
admin.auth().createCustomToken(uid)
  .then((customToken) => {
    console.log('Token generado:', customToken);
  })
  .catch((error) => {
    console.error('Error al generar el token:', error);
  }); 