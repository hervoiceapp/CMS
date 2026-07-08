import { initializeApp } from "firebase/app";
// @ts-ignore -- Suppress TS error: getReactNativePersistence exists in the SDK but TS might pick web types
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyAczpiYXIIdArBjgm8U4DFeksneG2SMl-U",
  authDomain: "kolado-mis.firebaseapp.com",
  projectId: "kolado-mis",
  storageBucket: "kolado-mis.firebasestorage.app",
  messagingSenderId: "503008539350",
  appId: "1:503008539350:web:7994392e52290348a14f77",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with Persistence (Keeps user logged in)
export const auth = initializeAuth(app, {
//   persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

// Initialize Cloud Firestore (Needed for Media Player Playlist)
export const db = getFirestore(app);

// Initialize Storage (Needed if you want to upload audio files later)
export const storage = getStorage(app);
