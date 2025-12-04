import { useAuth } from "@clerk/clerk-react";
import { useMemo } from "react";
import Client, { Local } from "~backend/client";

const backend = new Client(Local);

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
