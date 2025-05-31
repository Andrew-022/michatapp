const functions = require("firebase-functions");
const admin = require("firebase-admin");
const CryptoJS = require('crypto-js');
admin.initializeApp();

exports.sendMessageNotification = functions.firestore
  .document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const receiverId = message.to; // ID del destinatario
    const senderName = message.fromName;
    const chatId = context.params.chatId; // Obtener el ID del chat
    const senderId = message.senderId; // ID del remitente

    // Descifrar el mensaje
    let decryptedText;
    try {
      const decrypted = CryptoJS.AES.decrypt(message.text, chatId);
      decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      if (!decryptedText) {
        decryptedText = 'Mensaje cifrado';
      }
    } catch (error) {
      console.error('Error al descifrar mensaje:', error);
      decryptedText = 'Mensaje cifrado';
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
        body: decryptedText,
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