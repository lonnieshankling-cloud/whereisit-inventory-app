import { Service } from "encore.dev/service";
import { api, Gateway } from "encore.dev/api";

export default new Service("api");

export const gateway = new Gateway({
  cors: {
    allowOriginsWithoutCredentials: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
  },
});
