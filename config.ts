// App configuration
// To use Gemini AI features, add your API key here
// Get a free API key from: https://aistudio.google.com/app/apikey

export const Config = {
  // Gemini API key for shelf analysis and AI features
  // This should match the GeminiApiKey secret in your backend
  GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
  
  // Backend URL (when sync is enabled)
  // Default empty so we fall back to cloud env when not provided
  BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL || '',

  // Clerk publishable key for authentication (set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env)
  CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
};
