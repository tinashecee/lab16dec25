import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function getApiToken(): Promise<string> {
  try {
    const settingsDoc = await getDoc(doc(db, "settings", "integrations"));
    if (!settingsDoc.exists()) {
      throw new Error("Integration settings not found");
    }

    const data = settingsDoc.data();
    if (!data?.crelioToken) {
      throw new Error("Crelio token not found in settings");
    }

    return data.crelioToken;
  } catch (error) {
    console.error("Error getting API token:", error);
    throw new Error("Failed to get API token from settings");
  }
} 