import admin from 'firebase-admin';
import serviceAccount from '../../serviceAccountKey.json';

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
  });
}

export const sendPushNotification = async (
  token: string,
  title: string,
  body: string,
  data: {
    chatId: string;
    senderId: string;
    type: string;
  }
) => {
  try {
    const message = {
      token,
      notification: {
        title,
        body,
      },
      data,
      android: {
        priority: 'high',
        notification: {
          channelId: 'chat_messages',
          priority: 'high',
          sound: 'default',
          defaultSound: true,
          defaultVibrateTimings: true,
          defaultLightSettings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('Notificación enviada exitosamente:', response);
    return response;
  } catch (error) {
    console.error('Error al enviar notificación:', error);
    throw error;
  }
};
