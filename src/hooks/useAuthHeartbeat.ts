import { useEffect } from "react";
import { getAuth } from "firebase/auth";

type AuthHeartbeatOptions = {
  intervalMs?: number;
  enabled?: boolean;
};

/**
 * Lightweight heartbeat for debugging auth persistence.
 * It only logs auth.currentUser state; it does NOT sign out or clear any session.
 */
export function useAuthHeartbeat(options: AuthHeartbeatOptions = {}) {
  const intervalMs = options.intervalMs ?? 15000;
  const enabled =
    options.enabled ??
    // Default to dev-only unless explicitly enabled via env
    (import.meta.env.DEV || import.meta.env.VITE_AUTH_HEARTBEAT === "true");

  useEffect(() => {
    if (!enabled) return;

    const auth = getAuth();

    const tick = () => {
      const u = auth.currentUser;
      console.log("[AUTH_HEARTBEAT]", {
        ts: new Date().toISOString(),
        hasCurrentUser: !!u,
        uid: u?.uid,
        email: u?.email,
      });
    };

    // immediate tick + interval
    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs]);
}


