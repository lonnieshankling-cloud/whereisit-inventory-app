# Setting Up Gemini API Key

The shelf analyzer feature uses Google's Gemini AI to detect items in photos. To use this feature, you need to configure your Gemini API key.

## Quick Setup

1. **Get a Gemini API Key** (free):
   - Visit https://aistudio.google.com/app/apikey
   - Click "Create API Key"
   - Copy the key

2. **Add to your mobile app**:
   - Open `.env.local` in the root directory
   - Replace `your_gemini_api_key_here` with your actual key:
     ```
     EXPO_PUBLIC_GEMINI_API_KEY=AIzaSyAbc123YourActualKeyHere
     ```

3. **Restart Expo**:
   - Stop the Expo dev server (Ctrl+C)
   - Run `npx expo start --clear` to restart with new env vars

## Using the Same Key as Backend

If you've already set up the Gemini API key in your Encore backend, you can use the same key:

```bash
# In backend directory
encore secret list

# Copy the GeminiApiKey value and add it to .env.local
```

## Testing

1. Tap the "📸 Scan Shelf" button on the home screen
2. Take a photo of a shelf with multiple items
3. Tap "Analyze Items"
4. Wait for AI to detect and list all items
5. Items will be automatically saved to your inventory

## Troubleshooting

- **"API Key Required" alert**: Make sure `.env.local` exists and has the correct key
- **"Analysis Failed" error**: Check that your API key is valid and has Gemini API enabled
- **No items detected**: Try better lighting or a clearer photo of the shelf
