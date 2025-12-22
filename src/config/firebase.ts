import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB1JjX58sjyYC5D69h_k2ylyxcQ99G932w",
  authDomain: "labpartners-bc8e7.firebaseapp.com",
  databaseURL: "https://labpartners-bc8e7-default-rtdb.firebaseio.com",
  projectId: "labpartners-bc8e7",
  storageBucket: "labpartners-bc8e7.firebasestorage.app",
  messagingSenderId: "51482194133",
  appId: "1:51482194133:web:0076360816446a7064b25c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
