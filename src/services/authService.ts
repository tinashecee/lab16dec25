import { auth, db } from "../config/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { User } from "./userService";

interface AuthService {
  login(
    email: string,
    password: string
  ): Promise<{
    authUser: any;
    userData: User;
  }>;
  logout(): Promise<void>;
  getCurrentUserData(): Promise<User | null>;
}

const authService: AuthService = {
  async login(email: string, password: string) {
    try {
      // First authenticate with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Then fetch user data from users collection
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("User not found in system");
      }

      const userData = querySnapshot.docs[0].data() as User;
      const userId = querySnapshot.docs[0].id;

      // Check if user is active
      if (userData.status === "Inactive") {
        await auth.signOut(); // Sign out if user is inactive
        throw new Error(
          "Your account is inactive. Please contact an administrator."
        );
      }

      // Return both the auth user and the user data
      return {
        authUser: userCredential.user,
        userData: { ...userData, id: userId },
      };
    } catch (error: any) {
      console.error("Login error:", error);

      // Handle specific error messages
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        throw new Error("Invalid email or password");
      }

      throw error;
    }
  },

  async logout() {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  },

  async getCurrentUserData() {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser?.email) return null;

      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", currentUser.email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) return null;

      const userData = querySnapshot.docs[0].data() as User;
      const userId = querySnapshot.docs[0].id;

      return { ...userData, id: userId };
    } catch (error) {
      console.error("Error getting current user data:", error);
      throw error;
    }
  },
};

export { authService };
