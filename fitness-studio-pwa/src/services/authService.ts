import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { User } from '../types'
import { useAuthStore } from '../store/authStore'

const googleProvider = new GoogleAuthProvider()

// Конвертация Firebase User в наш тип User
const convertFirebaseUser = async (firebaseUser: FirebaseUser): Promise<User> => {
  const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
  
  if (userDoc.exists()) {
    return userDoc.data() as User
  }

  // Если документа нет, создаём его
  const newUser: User = {
    uid: firebaseUser.uid,
    name: firebaseUser.displayName || '',
    email: firebaseUser.email,
    phone: '',
    photoUrl: firebaseUser.photoURL,
    roles: ['client'],
    createdAt: new Date(),
    preferences: {
      notificationsEnabled: true,
    },
  }

  await setDoc(doc(db, 'users', firebaseUser.uid), newUser)
  return newUser
}

// Регистрация по email
export const registerWithEmail = async (
  email: string,
  password: string,
  name: string,
  phone: string
): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  
  await updateProfile(userCredential.user, { displayName: name })
  
  const user: User = {
    uid: userCredential.user.uid,
    name,
    email,
    phone,
    photoUrl: null,
    roles: ['client'],
    createdAt: new Date(),
    preferences: {
      notificationsEnabled: true,
    },
  }

  await setDoc(doc(db, 'users', userCredential.user.uid), user)
  
  useAuthStore.getState().setUser(user)
  return user
}

// Вход по email
export const loginWithEmail = async (email: string, password: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  const user = await convertFirebaseUser(userCredential.user)
  
  useAuthStore.getState().setUser(user)
  return user
}

// Вход через Google
export const loginWithGoogle = async (): Promise<User> => {
  const result = await signInWithPopup(auth, googleProvider)
  const user = await convertFirebaseUser(result.user)
  
  useAuthStore.getState().setUser(user)
  return user
}

// Восстановление пароля
export const resetPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email)
}

// Выход
export const logout = async (): Promise<void> => {
  await signOut(auth)
  useAuthStore.getState().logout()
}

// Проверка авторизации при загрузке приложения
export const checkAuthState = async (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      unsubscribe()
      
      if (firebaseUser) {
        try {
          const user = await convertFirebaseUser(firebaseUser)
          useAuthStore.getState().setUser(user)
          resolve(user)
        } catch (error) {
          console.error('Ошибка загрузки профиля:', error)
          useAuthStore.getState().setUser(null)
          resolve(null)
        }
      } else {
        useAuthStore.getState().setUser(null)
        resolve(null)
      }
    })

    // Таймаут на случай если Firebase не настроен
    setTimeout(() => {
      unsubscribe()
      useAuthStore.getState().setLoading(false)
      resolve(null)
    }, 5000)
  })
}
