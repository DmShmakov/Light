import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// TODO: Заменить на реальные конфигурационные данные из Firebase Console
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Инициализация Firebase приложения
const app = initializeApp(firebaseConfig)

// Инициализация сервисов
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Messaging инициализируется лениво (только когда нужен)
let _messaging: ReturnType<typeof import('firebase/messaging').getMessaging> | null = null
export const getMessagingService = () => {
  if (!_messaging) {
    const { getMessaging } = require('firebase/messaging')
    _messaging = getMessaging(app)
  }
  return _messaging
}

export default app
