import { Gateway } from "encore.dev/api";

export const gateway = new Gateway({
  cors: {
    allowOrigins: [
      { origin: "http://localhost:5173" },
      { origin: "http://localhost:5174" },
      { origin: "http://localhost:3000" }
    ],
  },
});
