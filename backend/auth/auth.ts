import { APIError, Cookie, Gateway, Header } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { secret } from "encore.dev/config";
import db from "../db";

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
      const userID = user.id;
      
      console.log("[Auth] User authenticated:", userID);
      
      // Auto-create user record if it doesn't exist (solves foreign key constraint)
      try {
        await db.exec`
          INSERT INTO users (id, email, image_url)
          VALUES (${userID}, ${user.emailAddresses[0]?.emailAddress ?? null}, ${user.imageUrl})
          ON CONFLICT (id) DO NOTHING
        `;
        console.log("[Auth] User record ensured in database:", userID);
      } catch (dbErr) {
        console.error("[Auth] Failed to create/ensure user record:", dbErr);
        // Don't fail auth if DB operation fails - user might already exist
      }
      
      return {
        userID,
        imageUrl: user.imageUrl,
        email: user.emailAddresses[0]?.emailAddress ?? null,
      };
    } catch (err) {
      console.error("[Auth] Token verification failed:", err);
      throw APIError.unauthenticated("invalid token", err as Error);
    }
  }
);

export const gw = new Gateway({ authHandler: auth });
