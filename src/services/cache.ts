import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { Message } from '../models/Message';
import { Platform } from 'react-native';

const CACHE_KEYS = {
  CHAT_MESSAGES: (chatId: string) => `chat_messages_${chatId}`,
  CHAT_IMAGES: (chatId: string) => `chat_images_${chatId}`,
  LAST_SYNC: (chatId: string) => `last_sync_${chatId}`,
};

const IMAGE_CACHE_DIR = Platform.select({
  ios: `${RNFS.DocumentDirectoryPath}/image_cache`,
  android: `${RNFS.CachesDirectoryPath}/image_cache`,
}) || '';

export class CacheService {
  private static imageProcessingQueue: Array<{
    imageUrl: string;
    chatId: string;
    resolve: (value: string | null) => void;
    reject: (reason?: any) => void;
  }> = [];
  private static isProcessingQueue = false;

  private static async processNextImage(): Promise<void> {
    if (this.isProcessingQueue || this.imageProcessingQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    const { imageUrl, chatId, resolve, reject } = this.imageProcessingQueue[0];

    try {
      await this.initializeImageCache();
      
      // Generar nombre único para la imagen
      const imageName = `${chatId}_${Date.now()}.jpg`;
      const localPath = `${IMAGE_CACHE_DIR}/${imageName}`;

      // Descargar y guardar la imagen
      const downloadResult = await RNFS.downloadFile({
        fromUrl: imageUrl,
        toFile: localPath,
        background: true,
        begin: (res) => {
          console.log('Iniciando descarga:', res);
        },
        //progress: (res) => {
          //console.log('Progreso:', res);
        //}
      }).promise;

      if (downloadResult.statusCode === 200) {
        // Verificar que el archivo existe
        const exists = await RNFS.exists(localPath);
        if (exists) {
          // En Android, necesitamos usar file:// para las rutas
          resolve(Platform.OS === 'android' ? `file://${localPath}` : localPath);
        } else {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    } catch (error) {
      console.error('Error al guardar imagen localmente:', error);
      reject(error);
    } finally {
      this.imageProcessingQueue.shift();
      this.isProcessingQueue = false;
      this.processNextImage();
    }
  }

  // Inicializar el directorio de caché de imágenes
  static async initializeImageCache(): Promise<void> {
    try {
      const exists = await RNFS.exists(IMAGE_CACHE_DIR);
      if (!exists) {
        await RNFS.mkdir(IMAGE_CACHE_DIR);
      }
    } catch (error) {
      console.error('Error al inicializar directorio de caché:', error);
    }
  }

  // Guardar imagen localmente
  static async saveImageLocally(imageUrl: string, chatId: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.imageProcessingQueue.push({ imageUrl, chatId, resolve, reject });
      this.processNextImage();
    });
  }

  // Obtener imagen local
  static async getLocalImage(imageUrl: string, chatId: string): Promise<string | null> {
    try {
      const images = await this.getChatImages(chatId);
      if (!images) return null;

      const imageInfo = images.find(img => img.url === imageUrl);
      if (!imageInfo?.localPath) return null;

      // Manejar correctamente las rutas en Android
      const path = Platform.OS === 'android' 
        ? imageInfo.localPath.startsWith('file://') 
          ? imageInfo.localPath 
          : `file://${imageInfo.localPath}`
        : imageInfo.localPath;

      const exists = await RNFS.exists(path.replace('file://', ''));
      return exists ? path : null;
    } catch (error) {
      console.error('Error al obtener imagen local:', error);
      return null;
    }
  }

  // Guardar URL de imagen en caché con su ruta local
  static async saveChatImage(chatId: string, imageUrl: string): Promise<void> {
    try {
      const images = await this.getChatImages(chatId) || [];
      if (!images.some(img => img.url === imageUrl)) {
        const localPath = await this.saveImageLocally(imageUrl, chatId);
        if (localPath) {
          images.push({
            url: imageUrl,
            localPath,
            timestamp: new Date().toISOString()
          });
          await AsyncStorage.setItem(
            CACHE_KEYS.CHAT_IMAGES(chatId),
            JSON.stringify(images)
          );
        }
      }
    } catch (error) {
      console.error('Error al guardar imagen en caché:', error);
    }
  }

  // Obtener URLs de imágenes de un chat desde caché
  static async getChatImages(chatId: string): Promise<Array<{url: string, localPath: string | null, timestamp: string}> | null> {
    try {
      const imagesData = await AsyncStorage.getItem(CACHE_KEYS.CHAT_IMAGES(chatId));
      return imagesData ? JSON.parse(imagesData) : null;
    } catch (error) {
      console.error('Error al obtener imágenes de caché:', error);
      return null;
    }
  }

  // Limpiar imágenes antiguas
  static async cleanupOldImages(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const now = Date.now();
      const files = await RNFS.readDir(IMAGE_CACHE_DIR);
      
      for (const file of files) {
        const stats = await RNFS.stat(file.path);
        const fileAge = now - (stats.mtime || now);
        
        if (fileAge > maxAge) {
          await RNFS.unlink(file.path);
        }
      }
    } catch (error) {
      console.error('Error al limpiar imágenes antiguas:', error);
    }
  }

  // Limpiar caché de un chat
  static async clearChatCache(chatId: string): Promise<void> {
    try {
      // Eliminar imágenes locales
      const images = await this.getChatImages(chatId);
      if (images) {
        for (const image of images) {
          if (image.localPath) {
            await RNFS.unlink(image.localPath).catch(() => {});
          }
        }
      }

      // Eliminar datos de AsyncStorage
      await AsyncStorage.multiRemove([
        CACHE_KEYS.CHAT_MESSAGES(chatId),
        CACHE_KEYS.CHAT_IMAGES(chatId),
        CACHE_KEYS.LAST_SYNC(chatId),
      ]);
    } catch (error) {
      console.error('Error al limpiar caché del chat:', error);
    }
  }

  // Guardar mensajes de un chat
  static async saveChatMessages(chatId: string, messages: Message[]): Promise<void> {
    try {
      const messagesData = messages.map(msg => ({
        ...msg,
        createdAt: msg.createdAt?.toISOString(), // Convertir Date a string para almacenamiento
      }));
      await AsyncStorage.setItem(
        CACHE_KEYS.CHAT_MESSAGES(chatId),
        JSON.stringify(messagesData)
      );
      await this.updateLastSync(chatId);
    } catch (error) {
      console.error('Error al guardar mensajes en caché:', error);
    }
  }

  // Obtener mensajes de un chat desde caché
  static async getChatMessages(chatId: string): Promise<Message[] | null> {
    try {
      const messagesData = await AsyncStorage.getItem(CACHE_KEYS.CHAT_MESSAGES(chatId));
      if (!messagesData) return null;

      const messages = JSON.parse(messagesData).map((msg: any) => ({
        ...msg,
        createdAt: msg.createdAt ? new Date(msg.createdAt) : undefined, // Convertir string a Date
      }));
      return messages;
    } catch (error) {
      console.error('Error al obtener mensajes de caché:', error);
      return null;
    }
  }

  // Actualizar timestamp de última sincronización
  private static async updateLastSync(chatId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(
        CACHE_KEYS.LAST_SYNC(chatId),
        new Date().toISOString()
      );
    } catch (error) {
      console.error('Error al actualizar timestamp de sincronización:', error);
    }
  }

  // Obtener timestamp de última sincronización
  static async getLastSync(chatId: string): Promise<Date | null> {
    try {
      const lastSync = await AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC(chatId));
      return lastSync ? new Date(lastSync) : null;
    } catch (error) {
      console.error('Error al obtener timestamp de sincronización:', error);
      return null;
    }
  }
} 