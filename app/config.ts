// App configuration
// To use Gemini AI features, add your API key here
// Get a free API key from: https://aistudio.google.com/app/apikey

export const Config = {
  // Gemini API key for shelf analysis and AI features
  // This should match the GeminiApiKey secret in your backend
  GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
  
  // Backend URL (when sync is enabled)
  BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:4000',
};
