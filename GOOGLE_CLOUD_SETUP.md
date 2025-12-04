# Google Cloud Vision API Setup - Quick Start

## Step 1: Create Google Cloud Project & Enable API

1. Go to https://console.cloud.google.com
2. Create new project (or select existing)
3. Enable Cloud Vision API:
   - Search "Cloud Vision API" in API Library
   - Click "Enable"

## Step 2: Create Service Account & Get JSON Key

1. Go to IAM & Admin → Service Accounts
2. Click "Create Service Account"
   - Name: `whereisit-ocr`
   - Role: "Cloud Vision API User"
3. Click on service account → Keys → Add Key → JSON
4. Save downloaded JSON file as: `backend/google-vision-key.json`

## Step 3: Configure Environment Variable

### For Windows (PowerShell):
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\Users\lshan\WhereIsItMobile\backend\google-vision-key.json"
```

### Add to .gitignore:
```
backend/google-vision-key.json
```

## Testing Without OCR

If you don't set up Google Cloud Vision immediately:
- Receipt uploads will still work
- Images will be compressed and stored
- OCR fields will be null (extractedDate, extractedPrice, extractedStore)
- You can add OCR later and re-process receipts

## Cost

- First 1,000 text detections/month: FREE
- After 1,000: $1.50 per 1,000 requests
- Typical household use: $0/month

## Note

The backend is currently running without Google Cloud Vision configured. 
Receipt uploads will work but won't extract purchase data automatically.
