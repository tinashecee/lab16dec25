import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function getGoogleMapsApiKey(): Promise<string> {
  try {
    const settingsDoc = await getDoc(doc(db, "settings", "integrations"));
    if (!settingsDoc.exists()) {
      throw new Error("Integration settings not found");
    }

    const data = settingsDoc.data();
    if (!data?.mapsApiKey) {
      // Fallback to environment variable if not set in settings
      return import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    }

    return data.mapsApiKey;
  } catch (error) {
    console.error("Error getting Maps API key:", error);
    // Fallback to environment variable
    return import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  }
} 