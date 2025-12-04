import { useToast } from '@/components/ui/use-toast';
import { useBackend } from '@/lib/backend';
import { useAuth } from '@clerk/clerk-react';
import { BookOpen, Camera, Loader2, Upload, Video } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface BookAnalysis {
  guessed_title: string;
  guessed_author: string;
  visual_signature: string;
  shelf_location: string;
  search_query: string;
}

interface BookshelfAnalyzerProps {
  onBooksAnalyzed?: (books: BookAnalysis[]) => void;
}

export function BookshelfAnalyzer({ onBooksAnalyzed }: BookshelfAnalyzerProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<BookAnalysis[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backend = useBackend();
  const { getToken } = useAuth();
  const { toast } = useToast();
  
  const API_BASE_URL = import.meta.env.VITE_CLIENT_TARGET || 'http://localhost:4000';

  useEffect(() => {
    return () => {
      // Clean up camera stream on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      setStream(mediaStream);
      setShowCamera(true);
      
      // Wait for next tick to ensure video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(e => console.error('Video play failed:', e));
        }
      }, 100);
    } catch (error) {
      console.error('Failed to start camera:', error);
      alert('Failed to access camera. Please check permissions or try a different browser.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      stopCamera();
      
      const file = new File([blob], 'bookshelf.jpg', { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      
      await analyzeImage(file);
    }, 'image/jpeg', 0.9);
  };

  const analyzeImage = async (file: File) => {
    setAnalyzing(true);
    setResults([]);

    try {
      // Upload the image to storage
      const { uploadUrl, fileUrl } = await backend.image.getUploadUrl({
        filename: `bookshelf-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`,
        contentType: file.type,
      });
      
      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      // Analyze the bookshelf using raw fetch since the endpoint is new
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/items/analyze-bookshelf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageUrls: [fileUrl],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const { books } = await response.json();
      setResults(books);
      
      if (onBooksAnalyzed) {
        onBooksAnalyzed(books);
      }

      toast({
        title: "Analysis Complete",
        description: `Found ${books.length} book${books.length !== 1 ? 's' : ''} on the shelf`,
      });
    } catch (error: any) {
      console.error('Analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || 'Failed to analyze bookshelf. Please try again.',
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    await analyzeImage(file);
  };

  const handleClear = () => {
    setResults([]);
    setImagePreview(null);
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Camera View */}
      {showCamera && (
        <div className="space-y-4">
          <div className="relative border rounded-lg overflow-hidden bg-black" style={{ minHeight: '400px' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto"
              style={{ display: 'block' }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={capturePhoto}
              disabled={analyzing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Camera size={20} />
              Capture Photo
            </button>
            <button
              onClick={stopCamera}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!showCamera && !imagePreview && (
        <div className="flex gap-2">
          <button
            onClick={startCamera}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Video size={20} />
            Use Camera
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Upload size={20} />
            Upload Photo
          </button>
        </div>
      )}

      {/* Analyzing State */}
      {analyzing && (
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 size={24} className="animate-spin text-blue-600" />
          <span className="text-gray-600">Analyzing bookshelf...</span>
        </div>
      )}

      {/* Clear Button */}
      {(results.length > 0 || imagePreview) && !showCamera && (
        <button
          onClick={handleClear}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Clear
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />
      
      <canvas ref={canvasRef} className="hidden" />

      {/* Image Preview */}
      {imagePreview && (
        <div className="border rounded-lg overflow-hidden">
          <img 
            src={imagePreview} 
            alt="Bookshelf preview" 
            className="w-full h-auto max-h-96 object-contain bg-gray-50"
          />
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-blue-600" />
            <h3 className="font-semibold text-lg">
              Found {results.length} book{results.length !== 1 ? 's' : ''}
            </h3>
          </div>

          <div className="space-y-2">
            {results.map((book, idx) => (
              <div 
                key={idx} 
                className="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <h4 className="font-semibold text-gray-900">
                      {book.guessed_title || 'Unknown Title'}
                    </h4>
                    {book.guessed_author && (
                      <p className="text-sm text-gray-600">
                        by {book.guessed_author}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {book.shelf_location}
                  </span>
                </div>

                <div className="mt-2 space-y-1">
                  {book.visual_signature && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-medium">Visual:</span>
                      <span>{book.visual_signature}</span>
                    </div>
                  )}
                  {book.search_query && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-medium">Search:</span>
                      <span className="italic">{book.search_query}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!analyzing && !imagePreview && results.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">Take a photo of your bookshelf</p>
          <p className="text-sm text-gray-500">
            AI will identify each book's title, author, and location
          </p>
        </div>
      )}
    </div>
  );
}
