import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";

export interface Center {
  id: string;
  name: string;
  address: string;
  contactPerson: string;
  phoneNumber: string;
}

export const centerService = {
  async getCenters(): Promise<Center[]> {
    try {
      const centersCollection = collection(db, "centers");
      const snapshot = await getDocs(centersCollection);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Center[];
    } catch (error) {
      console.error("Error fetching centers:", error);
      throw new Error("Failed to fetch centers");
    }
  },
};
