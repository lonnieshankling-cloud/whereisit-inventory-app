import { GoogleGenerativeAI } from "@google/generative-ai";
import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { images } from "../storage";

const geminiApiKey = secret("GeminiApiKey");

export async function analyzeImage(imageData: string, mimeType: string): Promise<string> {
  const apiKey = geminiApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
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
