import { api, Gateway } from "encore.dev/api";

export const gateway = new Gateway({
  cors: {
    allowOrigins: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
    ],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length"],
    allowCredentials: true,
  },
});
