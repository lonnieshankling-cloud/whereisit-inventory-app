import { api, Gateway } from "encore.dev/api";

export const gateway = new Gateway({
  cors: {
    allowOrigins: ["http://localhost:*"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["*"],
    exposeHeaders: ["*"],
    allowCredentials: true,
  },
});
