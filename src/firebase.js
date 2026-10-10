import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ==========================================
// 🔴 TODO: PASTE YOUR FIREBASE CONFIG HERE
// ==========================================
const firebaseConfig = {
  projectId: "doom-generation",
  appId: "1:447032774744:web:20a2a41215f253b460ba2d",
  storageBucket: "doom-generation.firebasestorage.app",
  apiKey: "AIzaSyD9b5olrraCm8qRPnc8a4V9YVoxeSCW0e4",
  authDomain: "doom-generation.firebaseapp.com",
  messagingSenderId: "447032774744",
};

let app, auth, db, storage, provider;

if (Object.keys(firebaseConfig).length > 0) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  provider = new GoogleAuthProvider();
}

export { auth, db, storage, provider };
