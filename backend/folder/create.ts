import { api } from "encore.dev/api";
import db from "../db";

interface CreateFolderRequest {
  name: string;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: Date;
}

export const create = api<CreateFolderRequest, Folder>(
  { expose: true, method: "POST", path: "/folders" },
  async (req) => {
    const folder = await db.queryRow<Folder>`
      INSERT INTO folders (name)
      VALUES (${req.name})
      RETURNING
        id,
        name,
        created_at as "createdAt"
    `;

    if (!folder) {
      throw new Error("Failed to create folder");
    }

    return folder;
  }
);
