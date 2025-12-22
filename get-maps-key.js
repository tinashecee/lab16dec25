import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Import your Firebase config
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
const db = getFirestore(app);

async function getMapsApiKey() {
  try {
    const settingsDoc = await getDoc(doc(db, "settings", "integrations"));
    if (!settingsDoc.exists()) {
      console.log("Integration settings not found");
      return null;
    }

    const data = settingsDoc.data();
    if (!data?.mapsApiKey) {
      console.log("Maps API key not found in settings");
      return null;
    }

    console.log("Google Maps API Key:", data.mapsApiKey);
    console.log("Add this key to your .env file as: VITE_GOOGLE_MAPS_API_KEY=your_api_key_here");
    return data.mapsApiKey;
  } catch (error) {
    console.error("Error getting Maps API key:", error);
    return null;
  }
}

getMapsApiKey(); 