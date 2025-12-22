import React, { useState, useRef, useEffect } from "react";
import { X, Camera, AlertCircle, CheckCircle } from "lucide-react";

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  title?: string;
  description?: string;
}

export default function QRScanner({ onScan, onClose, title = "Scan QR Code", description }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    startScanning();
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    try {
      setError("");
      setIsScanning(true);

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });

      setHasPermission(true);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Start scanning loop
      scanLoop();
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Unable to access camera. Please ensure camera permissions are granted.");
      setHasPermission(false);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const scanLoop = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data for QR code detection
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // Simple QR code detection (in a real app, you'd use a library like jsQR)
    // For now, we'll simulate detection
    detectQRCode(imageData);

    if (isScanning) {
      requestAnimationFrame(scanLoop);
    }
  };

  const detectQRCode = (imageData: ImageData) => {
    // This is a simplified version. In a real implementation, you would use a QR code library
    // like jsQR: https://github.com/cozmo/jsQR
    
    // For demonstration purposes, we'll simulate QR detection
    // In practice, you would:
    // 1. Use jsQR library to detect QR codes in the imageData
    // 2. Extract the data from detected QR codes
    // 3. Call onScan with the detected data
    
    // Example implementation with jsQR would look like:
    /*
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code) {
      onScan(code.data);
      stopScanning();
    }
    */
  };

  const handleManualInput = () => {
    const input = prompt("Enter the QR code data manually:");
    if (input && input.trim()) {
      onScan(input.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Camera className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold">{title}</h2>
                {description && (
                  <p className="text-blue-100 text-sm">{description}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          {hasPermission === false && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <p className="text-amber-800 text-sm font-medium">Camera Access Required</p>
              </div>
              <p className="text-amber-700 text-sm mb-3">
                Please grant camera permissions to scan QR codes, or enter the data manually.
              </p>
              <button
                onClick={handleManualInput}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
              >
                Enter Manually
              </button>
            </div>
          )}

          {/* Camera Preview */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4">
            <video
              ref={videoRef}
              className="w-full h-64 object-cover"
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            />
            
            {/* Scanning Overlay */}
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* Scanning Frame */}
                  <div className="w-48 h-48 border-2 border-white border-dashed rounded-lg flex items-center justify-center">
                    <div className="w-40 h-40 border-2 border-blue-400 rounded-lg relative">
                      {/* Corner indicators */}
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg"></div>
                    </div>
                  </div>
                  
                  {/* Scanning Animation */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-40 h-1 bg-blue-400 animate-pulse"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <Camera className="w-4 h-4" />
              <span className="text-sm">Position QR code within the frame</span>
            </div>
            
            <p className="text-xs text-gray-500">
              The QR code will be automatically detected and processed
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={handleManualInput}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              Enter Manually
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
