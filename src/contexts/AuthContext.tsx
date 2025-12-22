import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { auth } from "../config/firebase";
import { sessionService } from "../services/sessionService";
import { User as AppUser } from "../services/userService";
import { authService } from "../services/authService";
import { db } from "../config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { activityLogService, formatActivityDetails } from '../services/activityLogService';

type UserData = Omit<AppUser, 'id'> & {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  dateJoined: string;
};

interface AuthContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
  error: string | null;
  signIn: (
    email: string,
    password: string,
    rememberMe: boolean
  ) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: (userData: UserData) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

// Export the useAuth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const restoreSession = useCallback((userData: UserData) => {
    setUserData(userData);
  }, []);

  useEffect(() => {
    // Configure session persistence
    const configurePersistence = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (err) {
        console.error("Error setting auth persistence:", err);
      }
    };

    configurePersistence();

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      
      if (firebaseUser) {
        if (window.location.pathname !== '/auth-redirect') {
          await loadUserData(firebaseUser.email);
        }
        // Refresh token every 30 minutes
        const interval = setInterval(async () => {
          try {
            await firebaseUser.getIdToken(true);
          } catch (err) {
            console.error("Token refresh failed:", err);
          }
        }, 1800000); // 30 minutes
        
        return () => clearInterval(interval);
      }
    });

    return unsubscribe;
  }, []);

  // Setup activity tracking
  useEffect(() => {
    const handleUserActivity = () => sessionService.updateActivity();
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keypress', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);

    return () => {
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keypress', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
    };
  }, []);

  const loadUserData = async (email?: string | null) => {
    if (!email) {
      setUserData(null);
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data() as AppUser;
        const userId = querySnapshot.docs[0].id;
        const userWithData = { ...userData, id: userId };
        setUserData(userWithData);
        if (user) {
          sessionService.initSession(user, userWithData, false);
        }
      } else {
        console.warn("No user data found for:", email);
        setUserData(null);
      }
    } catch (err) {
      console.error("Error loading user data:", err);
      setUserData(null);
    }
  };

  const signIn = async (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => {
    try {
      const { authUser, userData } = await authService.login(email, password);
      
      // Verify we have both auth user and user data before proceeding
      if (!authUser || !userData) {
        throw new Error("Failed to get complete user data");
      }
      
      setUser(authUser);
      setUserData(userData as UserData);
      
      // Initialize session after state is set
      await sessionService.initSession(authUser, userData, !!rememberMe);
      // Log LOGIN activity
      await activityLogService.logActivity({
        userId: userData.id || '',
        userName: userData.name,
        action: 'LOGIN',
        details: formatActivityDetails('LOGIN'),
      });
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await updateProfile(result.user, { displayName: name });
      setUser(result.user);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Log LOGOUT activity before clearing session
      if (userData) {
        await activityLogService.logActivity({
          userId: userData.id || '',
          userName: userData.name,
          action: 'LOGOUT',
          details: formatActivityDetails('LOGOUT'),
        });
      }
      await signOut(auth);
      sessionService.clearSession();
      setUser(null);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    }
  };

  const value = useMemo(
    () => ({
      user,
      userData,
      loading,
      signIn,
      signUp,
      resetPassword,
      logout,
      error,
      restoreSession,
    }),
    [user, userData, loading, error, restoreSession]
  );

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
