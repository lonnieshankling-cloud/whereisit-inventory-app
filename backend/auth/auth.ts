import { Header, Cookie, APIError, Gateway } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { secret } from "encore.dev/config";

const clerkSecretKey = secret("ClerkSecretKey");

async function getClerkClient() {
  const { createClerkClient } = await import("@clerk/backend");
  return createClerkClient({ secretKey: clerkSecretKey() });
}

async function verifyClerkToken(token: string) {
  const { verifyToken } = await import("@clerk/backend");
  return verifyToken(token, { secretKey: clerkSecretKey() });
}

interface AuthParams {
  authorization?: Header<"Authorization">;
  session?: Cookie<"session">;
}

export interface AuthData {
  userID: string;
  imageUrl: string;
  email: string | null;
}

export const auth = authHandler<AuthParams, AuthData>(
  async (data) => {
    const token = data.authorization?.replace("Bearer ", "") ?? data.session?.value;
    if (!token) {
      throw APIError.unauthenticated("missing token");
    }

    try {
      const verifiedToken = await verifyClerkToken(token);
      const clerkClient = await getClerkClient();

      const user = await clerkClient.users.getUser(verifiedToken.sub);
      return {
        userID: user.id,
        imageUrl: user.imageUrl,
        email: user.emailAddresses[0]?.emailAddress ?? null,
      };
    } catch (err) {
      throw APIError.unauthenticated("invalid token", err as Error);
    }
  }
);

export const gw = new Gateway({ authHandler: auth });
