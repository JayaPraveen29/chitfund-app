import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // ← ADD THIS

const firebaseConfig = {
  apiKey: "AIzaSyBdEDs-T76NpaIX_hywS33zx1njUpswvXs",
  authDomain: "chitfund-app-335e7.firebaseapp.com",
  projectId: "chitfund-app-335e7",
  storageBucket: "chitfund-app-335e7.firebasestorage.app",
  messagingSenderId: "240675520191",
  appId: "1:240675520191:web:bc8a7b104ee1e125b0d00a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); // ← ADD THIS