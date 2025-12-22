import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

interface UserData {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  dateJoined: string;
}

export function useCurrentUser() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error("useCurrentUser must be used within an AuthProvider");
  }

  return {
    id: auth.userData?.id || "",
    name: auth.userData?.name || "",
    email: auth.userData?.email || "",
    department: auth.userData?.department || "",
    role: auth.userData?.role || "",
    dateJoined: auth.userData?.dateJoined || "",
    loading: auth.loading,
    error: auth.error,
  };
}
