import { Bucket } from "encore.dev/storage/objects";

export const itemPhotos = new Bucket("item-photos", {
  public: true,
});

export const images = new Bucket("images", {
  public: true,
});

export const containerPhotos = new Bucket("container-photos", {
  public: true,
});

export const itemReceipts = new Bucket("item-receipts", {
  public: true,
});
