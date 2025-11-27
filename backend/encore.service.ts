import { Gateway } from "encore.dev/api";

export const gateway = new Gateway({
  cors: {
    allowOriginsWithoutCredentials: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
  },
});
