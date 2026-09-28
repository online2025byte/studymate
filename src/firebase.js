import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCj9HF1zyH2FrsJCU0uPpsCi5V8OdmyN4w",
  authDomain: "studymate-online.firebaseapp.com",
  projectId: "studymate-online",
  storageBucket: "studymate-online.firebasestorage.app",
  messagingSenderId: "723358233011",
  appId: "1:723358233011:web:159cd1a3e218c6a02bdbc6",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence);

export default app;