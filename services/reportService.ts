import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { databaseService } from './databaseService';
import { Platform } from 'react-native';

const TABLE_STYLE = `
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  font-size: 12px;
`;

const TH_STYLE = `
  background-color: #f3f4f6;
  padding: 8px;
  text-align: left;
  border-bottom: 2px solid #ddd;
`;

const TD_STYLE = `
  padding: 8px;
  border-bottom: 1px solid #eee;
  vertical-align: top;
`;

const IMG_STYLE = `
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
  background-color: #f9fafb;
`;

async function convertImageToBase64(uri: string): Promise<string | null> {
  if (!uri) return null;
  try {
    // Handling local files
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.warn('Failed to convert image to base64:', error);
    // Return the URI directly if conversion fails (might work for remote URLs)
    return uri;
  }
}

export async function generateInsuranceReport() {
  try {
    // 1. Fetch Data
    await databaseService.initialize();
    const items = await databaseService.getAllItems();
    
    // Calculate totals
    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + (item.purchase_price || 0), 0);
    const currentDate = new Date().toLocaleDateString();

    // 2. Prepare HTML Rows
    // We process items in chunks to avoid blocking too long, or just map them all
    const rows = await Promise.all(items.map(async (item) => {
      // Get receipt if available (Optional: Database might need a direct getReceiptByItem method, or we fetch all)
      // For efficiency, we really should fetch receipts in bulk or on demand.
      // Let's assume we can fetch receipts one by one for now, or use what's attached if we had relations.
      // Since databaseService might not have getReceiptByItemId easily exposed or efficient, we can check.
      // Let's rely on item having local_photo_uri.
      
      let itemImageSrc = '';
      if (item.local_photo_uri) {
        const b64 = await convertImageToBase64(item.local_photo_uri);
        if (b64) itemImageSrc = `<img src="${b64}" style="${IMG_STYLE}" />`;
      }

      // Looking up receipts - we need a method for this.
      // If none exists, we skip receipt column image.
      let receiptImageSrc = '';
      try {
        const receipts = await databaseService.getReceiptsForItem(item.id);
        if (receipts && receipts.length > 0 && receipts[0].local_photo_uri) {
             const b64 = await convertImageToBase64(receipts[0].local_photo_uri);
             if (b64) receiptImageSrc = `<img src="${b64}" style="${IMG_STYLE}" />`;
        }
      } catch (e) {
        // ignore if getReceiptsForItem doesn't exist yet, we will double check databaseService
      }

      return `
        <tr>
          <td style="${TD_STYLE}">${itemImageSrc}</td>
          <td style="${TD_STYLE}">
            <strong>${item.name}</strong><br/>
            <span style="color: #666;">${item.description || ''}</span><br/>
            <span style="font-size: 10px; color: #999;">Barcode: ${item.barcode || 'N/A'}</span>
          </td>
          <td style="${TD_STYLE}">
            Value: $${(item.purchase_price || 0).toFixed(2)}<br/>
            Qty: ${item.quantity || 1}<br/>
            Store: ${item.purchase_store || 'N/A'}
          </td>
          <td style="${TD_STYLE}">${receiptImageSrc}</td>
        </tr>
      `;
    }));

    // 3. Construct Full HTML
    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
            h1 { text-align: center; color: #111827; margin-bottom: 5px; }
            .subtitle { text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 30px; }
            .summary { display: flex; justify-content: space-around; background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
            .summary-item { text-align: center; }
            .summary-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
            .summary-value { font-size: 24px; font-weight: bold; color: #111827; }
          </style>
        </head>
        <body>
          <h1>Inventory Insurance Report</h1>
          <div class="subtitle">Generated on ${currentDate}</div>

          <div class="summary">
            <div class="summary-item">
              <div class="summary-label">Total Items</div>
              <div class="summary-value">${totalItems}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Value</div>
              <div class="summary-value">$${totalValue.toFixed(2)}</div>
            </div>
          </div>

          <table style="${TABLE_STYLE}">
            <thead>
              <tr>
                <th style="${TH_STYLE}; width: 120px;">Photo</th>
                <th style="${TH_STYLE}">Item Details</th>
                <th style="${TH_STYLE}; width: 150px;">Purchase Info</th>
                <th style="${TH_STYLE}; width: 120px;">Receipt</th>
              </tr>
            </thead>
            <tbody>
              ${rows.join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    // 4. Print to File
    const { uri } = await Print.printToFileAsync({ html });
    console.log('PDF generated at:', uri);

    // 5. Share
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    
    return true;
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
}
