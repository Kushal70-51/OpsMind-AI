import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA6qQHbwNrmGPgkUb6AFNjeVpdNZpKUU6E",
  authDomain: "opsmind-ai-f1cf6.firebaseapp.com",
  projectId: "opsmind-ai-f1cf6",
  storageBucket: "opsmind-ai-f1cf6.firebasestorage.app",
  messagingSenderId: "378354833317",
  appId: "1:378354833317:web:4be9ce60bd12106d67fa4c",
  measurementId: "G-QFZC0GE368"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
googleProvider.addScope('email');
googleProvider.addScope('profile');
