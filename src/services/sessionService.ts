import { getAuth } from "firebase/auth";
import type { User as FirebaseUser } from "firebase/auth";
import type { User as AppUser } from "../services/userService";

export interface SessionConfig {
  rememberMe: boolean;
  lastActivity: number;
}

export const sessionService = {
  initSession(user: FirebaseUser, userData: AppUser, rememberMe: boolean): void {
    const session = {
      uid: user.uid,
      userData: userData,
      lastActivity: Date.now(),
      rememberMe,
    };
    localStorage.setItem("userSession", JSON.stringify(session));
  },

  getSession() {
    const session = localStorage.getItem("userSession");
    return session ? JSON.parse(session) : null;
  },

  updateActivity() {
    const session = this.getSession();
    if (session) {
      session.lastActivity = Date.now();
      localStorage.setItem("userSession", JSON.stringify(session));
    }
  },

  clearSession() {
    localStorage.removeItem("userSession");
  },

  isSessionValid() {
    try {
      const session = this.getSession();
      if (!session) return false;

      const auth = getAuth();
      if (!auth.currentUser) return false;

      const inactivityLimit = session.rememberMe
        ? 7 * 24 * 60 * 60 * 1000 // 7 days
        : 30 * 60 * 1000; // 30 minutes
      
      // Check both session activity and Firebase auth state
      const isActive = Date.now() - session.lastActivity < inactivityLimit;
      return isActive && !!auth.currentUser;
    } catch (err) {
      console.error("Session validation error:", err);
      return false;
    }
  },

  validateSession() {
    if (!this.isSessionValid()) {
      this.clearSession();
      return false;
    }
    return true;
  },
};
