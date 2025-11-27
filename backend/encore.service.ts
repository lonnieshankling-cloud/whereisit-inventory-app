import { api, Gateway } from "encore.dev/api";

export const gateway = new Gateway({
  cors: {
    allowOriginsWithoutCredentials: ["*"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["*"],
    exposeHeaders: ["*"],
  },
});
