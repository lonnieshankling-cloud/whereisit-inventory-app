import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { images } from "../storage";

const geminiApiKey = secret("GEMINI_API_KEY");

async function getGenAI() {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const key = geminiApiKey();
  return new GoogleGenerativeAI(key);
}

export async function analyzeImage(imageData: string, mimeType: string): Promise<string> {
  const genAI = await getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
  
  const result = await model.generateContent([
    {
      inlineData: {
        data: imageData,
        mimeType: mimeType,
      },
    },
    "Describe what is in this image",
  ]);
  
  const response = await result.response;
  return response.text();
}

interface AnalyzeRequest {
  imageData: string;
  mimeType: string;
}

interface AnalyzeResponse {
  result: string;
}

export const analyze = api<AnalyzeRequest, AnalyzeResponse>(
  { method: "POST", path: "/analyze", expose: true },
  async (req) => {
    const result = await analyzeImage(req.imageData, req.mimeType);
    return { result };
  }
);

interface GetUploadUrlRequest {
  filename: string;
  contentType: string;
}

interface GetUploadUrlResponse {
  uploadUrl: string;
  fileUrl: string;
}

export const getUploadUrl = api<GetUploadUrlRequest, GetUploadUrlResponse>(
  { method: "POST", path: "/image/upload-url", expose: true },
  async (req) => {
    const { url: signedUploadUrl } = await images.signedUploadUrl(req.filename, {
      ttl: 300,
    });
    
    const fileUrl = images.publicUrl(req.filename);
    
    return {
      uploadUrl: signedUploadUrl,
      fileUrl,
    };
  }
);
