export interface ImageQualityResult {
  isAcceptable: boolean;
  brightness: number;
  blurScore: number;
  issues: string[];
}

export interface ImageQualityThresholds {
  minBrightness: number;
  maxBrightness: number;
  minBlurScore: number;
}

const DEFAULT_THRESHOLDS: ImageQualityThresholds = {
  minBrightness: 70,
  maxBrightness: 240,
  minBlurScore: 100,
};

export async function analyzeImageQuality(
  imageDataUrl: string,
  thresholds: ImageQualityThresholds = DEFAULT_THRESHOLDS
): Promise<ImageQualityResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      if (!ctx) {
        resolve({
          isAcceptable: false,
          brightness: 0,
          blurScore: 0,
          issues: ["Failed to analyze image"],
        });
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const brightness = calculateBrightness(imageData);
      const blurScore = calculateBlurScore(imageData);

      const issues: string[] = [];
      let isAcceptable = true;

      if (brightness < thresholds.minBrightness) {
        issues.push("Image is too dark");
        isAcceptable = false;
      } else if (brightness > thresholds.maxBrightness) {
        issues.push("Image is too bright/overexposed");
        isAcceptable = false;
      }

      if (blurScore < thresholds.minBlurScore) {
        issues.push("Image is too blurry");
        isAcceptable = false;
      }

      resolve({
        isAcceptable,
        brightness,
        blurScore,
        issues,
      });
    };

    img.onerror = () => {
      resolve({
        isAcceptable: false,
        brightness: 0,
        blurScore: 0,
        issues: ["Failed to load image"],
      });
    };

    img.src = imageDataUrl;
  });
}

function calculateBrightness(imageData: ImageData): number {
  const data = imageData.data;
  let totalBrightness = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;
    totalBrightness += brightness;
  }

  return totalBrightness / pixelCount;
}

function calculateBlurScore(imageData: ImageData): number {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  const gray = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    gray[idx] = (data[i] + data[i + 1] + data[i + 2]) / 3;
  }

  let sum = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;

      const laplacian =
        -gray[idx - width - 1] +
        -gray[idx - width] +
        -gray[idx - width + 1] +
        -gray[idx - 1] +
        8 * gray[idx] +
        -gray[idx + 1] +
        -gray[idx + width - 1] +
        -gray[idx + width] +
        -gray[idx + width + 1];

      sum += laplacian * laplacian;
      count++;
    }
  }

  return count > 0 ? sum / count : 0;
}

function applyHistogramEqualization(imageData: ImageData): void {
  const data = imageData.data;
  const pixelCount = data.length / 4;

  const histogramR = new Array(256).fill(0);
  const histogramG = new Array(256).fill(0);
  const histogramB = new Array(256).fill(0);

  for (let i = 0; i < data.length; i += 4) {
    histogramR[data[i]]++;
    histogramG[data[i + 1]]++;
    histogramB[data[i + 2]]++;
  }

  const cdfR = new Array(256).fill(0);
  const cdfG = new Array(256).fill(0);
  const cdfB = new Array(256).fill(0);

  cdfR[0] = histogramR[0];
  cdfG[0] = histogramG[0];
  cdfB[0] = histogramB[0];

  for (let i = 1; i < 256; i++) {
    cdfR[i] = cdfR[i - 1] + histogramR[i];
    cdfG[i] = cdfG[i - 1] + histogramG[i];
    cdfB[i] = cdfB[i - 1] + histogramB[i];
  }

  const cdfMinR = cdfR.find(v => v > 0) || 0;
  const cdfMinG = cdfG.find(v => v > 0) || 0;
  const cdfMinB = cdfB.find(v => v > 0) || 0;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(((cdfR[data[i]] - cdfMinR) / (pixelCount - cdfMinR)) * 255);
    data[i + 1] = Math.round(((cdfG[data[i + 1]] - cdfMinG) / (pixelCount - cdfMinG)) * 255);
    data[i + 2] = Math.round(((cdfB[data[i + 2]] - cdfMinB) / (pixelCount - cdfMinB)) * 255);
  }
}

export async function enhanceImageForLowLight(imageDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      if (!ctx) {
        resolve(imageDataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      applyHistogramEqualization(imageData);

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };

    img.onerror = () => {
      resolve(imageDataUrl);
    };

    img.src = imageDataUrl;
  });
}
