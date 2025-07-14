const functions = require("firebase-functions");
const admin = require("firebase-admin");
const CryptoJS = require('crypto-js');
admin.initializeApp();

// Función para enviar notificaciones de chat individual
exports.sendMessageNotification = functions.firestore
  .document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const receiverId = message.to; // ID del destinatario
    const senderName = message.fromName;
    const chatId = context.params.chatId; // Obtener el ID del chat
    const senderId = message.senderId; // ID del remitente

    // Determinar el texto de la notificación
    let notificationText;
    if (message.type === 'image') {
      notificationText = '📷 Imagen';
    } else {
      // Descifrar el mensaje
      try {
        const decrypted = CryptoJS.AES.decrypt(message.text, chatId);
        notificationText = decrypted.toString(CryptoJS.enc.Utf8);
        if (!notificationText) {
          notificationText = 'Mensaje cifrado';
        }
      } catch (error) {
        console.error('Error al descifrar mensaje:', error);
        notificationText = 'Mensaje cifrado';
      }
    }

    // Obtener token del usuario receptor
    const userDoc = await admin.firestore().collection("users").doc(receiverId).get();
    const fcmToken = userDoc.data().fcmToken;

    if (!fcmToken) {
      console.log("No FCM token for user:", receiverId);
      return null;
    }

    // Crear el payload
    const payload = {
      notification: {
        title: `${senderName} te ha enviado un mensaje`,
        body: notificationText,
      },
      data: {
        chatId: chatId,
        type: 'chat_message',
        otherParticipantId: senderId, // ID del remitente para la navegación
      },
      token: fcmToken,
    };

    // Enviar la notificación
    try {
      await admin.messaging().send(payload);
      console.log("Notificación enviada a", receiverId);
    } catch (error) {
      console.error("Error enviando notificación:", error);
    }

    return null;
  });

// Función para enviar notificaciones de chat grupal
exports.sendGroupMessageNotification = functions.firestore
  .document("groupChats/{groupId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    console.log('Iniciando notificación de grupo');
    const message = snap.data();
    console.log('Mensaje recibido:', message);
    
    const senderName = message.fromName;
    const groupId = context.params.groupId;
    const senderId = message.senderId;
    console.log('Datos básicos:', { senderName, groupId, senderId });

    // Determinar el texto de la notificación
    let notificationText;
    if (message.type === 'image') {
      notificationText = '📷 Imagen';
    } else {
      // Descifrar el mensaje
      try {
        const decrypted = CryptoJS.AES.decrypt(message.text, groupId);
        notificationText = decrypted.toString(CryptoJS.enc.Utf8);
        if (!notificationText) {
          notificationText = 'Mensaje cifrado';
        }
        console.log('Mensaje descifrado:', notificationText);
      } catch (error) {
        console.error('Error al descifrar mensaje:', error);
        notificationText = 'Mensaje cifrado';
      }
    }

    // Obtener información del grupo
    const groupDoc = await admin.firestore().collection("groupChats").doc(groupId).get();
    const groupData = groupDoc.data();
    console.log('Datos del grupo:', groupData);
    
    if (!groupData || !groupData.participants) {
      console.log("No se encontró el grupo o no tiene participantes");
      return null;
    }

    // Obtener tokens de todos los participantes excepto el remitente
    const participants = groupData.participants.filter(id => id !== senderId);
    console.log('Participantes a notificar:', participants);
    
    // Obtener tokens FCM de todos los participantes
    const userDocs = await Promise.all(
      participants.map(userId => 
        admin.firestore().collection("users").doc(userId).get()
      )
    );

    const fcmTokens = userDocs
      .map(doc => doc.data()?.fcmToken)
      .filter(token => token);
    
    console.log('Tokens FCM encontrados:', fcmTokens);

    if (fcmTokens.length === 0) {
      console.log("No hay tokens FCM disponibles para los participantes");
      return null;
    }

    // Enviar notificaciones individualmente
    const sendPromises = fcmTokens.map(token => {
      const message = {
        notification: {
          title: `${senderName} en ${groupData.name}`,
          body: notificationText,
        },
        data: {
          groupId: groupId,
          type: 'group_message',
          senderId: senderId,
        },
        token: token,
      };

      return admin.messaging().send(message)
        .then(() => {
          console.log(`Notificación enviada exitosamente a token: ${token}`);
        })
        .catch(error => {
          console.error(`Error enviando notificación a token ${token}:`, error);
        });
    });

    try {
      await Promise.all(sendPromises);
      console.log("Todas las notificaciones han sido procesadas");
    } catch (error) {
      console.error("Error en el proceso de envío de notificaciones:", error);
    }

    return null;
  }); 

// Función para notificar cambios en la configuración del grupo
exports.sendGroupConfigUpdateNotification = functions.firestore
  .document("groupChats/{groupId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const groupId = context.params.groupId;

    // Verificar si alguno de los campos relevantes cambió
    const campos = ["isPublic", "location", "name", "photoURL", "description"];
    let cambios = [];
    for (const campo of campos) {
      if (before[campo] !== after[campo]) {
        cambios.push(campo);
      }
    }
    if (cambios.length === 0) {
      // No hay cambios relevantes
      return null;
    }

    // Determinar quién hizo el cambio (opcional, si tienes este dato en after.lastModifiedBy)
    const modificadorId = after.lastModifiedBy || null;
    let modificadorNombre = after.lastModifiedByName || "Alguien";

    // Obtener participantes
    if (!after.participants || !Array.isArray(after.participants)) {
      console.log("No hay participantes en el grupo");
      return null;
    }
    // Excluir al modificador si se conoce
    const participantes = modificadorId
      ? after.participants.filter(id => id !== modificadorId)
      : after.participants;

    // Obtener tokens FCM de los participantes
    const userDocs = await Promise.all(
      participantes.map(userId =>
        admin.firestore().collection("users").doc(userId).get()
      )
    );
    const fcmTokens = userDocs
      .map(doc => doc.data()?.fcmToken)
      .filter(token => token);
    if (fcmTokens.length === 0) {
      console.log("No hay tokens FCM disponibles para los participantes");
      return null;
    }

    // Construir el texto de la notificación
    const camposTraducidos = {
      isPublic: "privacidad",
      location: "ubicación",
      name: "nombre",
      photoURL: "foto",
      description: "descripción"
    };
    const cambiosTexto = cambios.map(c => camposTraducidos[c] || c).join(", ");
    const notificationText = `${modificadorNombre} actualizó la configuración del grupo: ${cambiosTexto}`;

    // Enviar notificaciones
    const sendPromises = fcmTokens.map(token => {
      const message = {
        notification: {
          title: `Grupo actualizado: ${after.name}`,
          body: notificationText,
        },
        data: {
          groupId: groupId,
          type: 'group_config_update',
          modificadorId: modificadorId || '',
        },
        token: token,
      };
      return admin.messaging().send(message)
        .then(() => {
          console.log(`Notificación de actualización enviada a token: ${token}`);
        })
        .catch(error => {
          console.error(`Error enviando notificación a token ${token}:`, error);
        });
    });

    try {
      await Promise.all(sendPromises);
      console.log("Todas las notificaciones de actualización han sido procesadas");
    } catch (error) {
      console.error("Error en el proceso de envío de notificaciones de actualización:", error);
    }
    return null;
  }); 