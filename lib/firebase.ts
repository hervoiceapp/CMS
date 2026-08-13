import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAczpiYXIIdArBjgm8U4DFeksneG2SMl-U",
  authDomain: "kolado-mis.firebaseapp.com",
  projectId: "kolado-mis",
  storageBucket: "kolado-mis.firebasestorage.app",
  messagingSenderId: "503008539350",
  appId: "1:503008539350:web:7994392e52290348a14f77",
};

const app = initializeApp(firebaseConfig);

export { app };
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
