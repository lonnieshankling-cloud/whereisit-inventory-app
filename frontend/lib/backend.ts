import { useAuth } from "@clerk/clerk-react";
import { useMemo } from "react";
import backend from "~backend/client";

export function useBackend() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  
  return useMemo(() => {
    if (isLoaded && isSignedIn) {
      return backend.with({auth: async () => {
        const token = await getToken();
        return {authorization: `Bearer ${token}`};
      }});
    }
    return backend;
  }, [isLoaded, isSignedIn, getToken]);
}
