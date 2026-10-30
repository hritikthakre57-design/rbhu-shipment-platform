import { useContext } from "react";
import { AuthContext } from "./contextValue";
import type { AuthState } from "./contextValue";

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
