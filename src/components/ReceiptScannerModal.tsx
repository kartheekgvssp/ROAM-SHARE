import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  Sparkles,
  RefreshCw,
  Check,
  AlertCircle,
  FileText,
  DollarSign,
  Calendar,
  Tag,
  SwitchCamera,
  Image as ImageIcon,
} from 'lucide-react';
import { ExpenseCategory } from '../types';
import { formatDateDDMMYYYY } from '../lib/dateUtils';

export interface ScannedReceiptData {
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  notes?: string;
  confidence?: number;
}

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  onReceiptScanned: (data: ScannedReceiptData) => void;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  currency,
  onReceiptScanned,
}) => {
  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScannedReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera stream utility
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Start WebRTC live camera
  const startCamera = async (facing: 'environment' | 'user' = facingMode) => {
    stopCameraStream();
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        setMode('upload');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setHasCameraPermission(true);
    } catch (err: unknown) {
      console.warn('Live camera access failed or denied, fallback to file/system camera:', err);
      setHasCameraPermission(false);
      setMode('upload');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setScanResult(null);
      setCapturedImage(null);
      setIsScanning(false);
      if (mode === 'camera') {
        startCamera(facingMode);
      }
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen, mode]);

  if (!isOpen) return null;

  // Toggle rear vs front camera
  const handleToggleFacingMode = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Capture frame from live video
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    stopCameraStream();
    performOCR(dataUrl);
  };

  // Handle image file selection (from phone camera or gallery)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCapturedImage(dataUrl);
        stopCameraStream();
        performOCR(dataUrl, file.type || 'image/jpeg');
      }
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  // Call Server-Side Gemini API OCR Endpoint
  const performOCR = async (imageBase64: string, mimeType = 'image/jpeg') => {
    try {
      setIsScanning(true);
      setError(null);

      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to analyze receipt');
      }

      const data = json.data;
      const validCategories: ExpenseCategory[] = [
        'Food',
        'Transport',
        'Lodging',
        'Activities',
        'Shopping',
        'Misc',
      ];
      const category: ExpenseCategory = validCategories.includes(data.category)
        ? data.category
        : 'Misc';

      const result: ScannedReceiptData = {
        amount: Number(data.amount) || 0,
        description: data.description || 'Receipt Expense',
        date: data.date || new Date().toISOString().split('T')[0],
        category,
        notes: data.notes || '',
        confidence: data.confidence || 0.95,
      };

      setScanResult(result);
    } catch (err: unknown) {
      console.error('Scan OCR error:', err);
      setError(err instanceof Error ? err.message : 'Receipt scan failed. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  // User confirms the OCR results to auto-populate the form
  const handleApplyScan = () => {
    if (scanResult) {
      onReceiptScanned(scanResult);
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setScanResult(null);
    setError(null);
    if (mode === 'camera') {
      startCamera(facingMode);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-white p-4 sm:p-6 shadow-2xl my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base sm:text-lg font-black text-gray-900">Receipt OCR Scanner</h2>
                <span className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  <Sparkles className="w-3 h-3" />
                  AI Powered
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Snap or upload a receipt to auto-extract amount, vendor &amp; date
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher (Live Camera vs. File / Mobile Photo) */}
        {!capturedImage && (
          <div className="mt-3 flex rounded-xl bg-gray-100 p-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setMode('camera');
                startCamera(facingMode);
              }}
              className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'camera'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Live Camera</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('upload');
                stopCameraStream();
              }}
              className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'upload'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload / Camera Roll</span>
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="mt-3 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="mt-3 flex-1 overflow-y-auto space-y-3">
          {/* STEP 1: Live Camera Viewfinder */}
          {!capturedImage && mode === 'camera' && (
            <div className="relative rounded-2xl bg-black overflow-hidden aspect-3/4 max-h-[380px] flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Guide Overlay */}
              <div className="pointer-events-none absolute inset-6 sm:inset-10 border-2 border-emerald-400/70 rounded-2xl shadow-2xl flex flex-col justify-between p-3">
                <div className="flex justify-between items-center text-[10px] font-mono text-emerald-300 font-bold tracking-widest uppercase">
                  <span>RECEIPT TARGET</span>
                  <span>ALIGN EDGES</span>
                </div>
                <div className="text-center text-[11px] text-white/80 font-medium bg-black/40 backdrop-blur-xs py-1 px-2 rounded-lg self-center">
                  Hold receipt steady under good lighting
                </div>
              </div>

              {/* Camera Action Buttons Overlay */}
              <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 px-4 z-10">
                {/* Switch Front/Rear Camera */}
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/30 transition active:scale-95 cursor-pointer"
                  title="Switch camera"
                >
                  <SwitchCamera className="w-5 h-5" />
                </button>

                {/* Shutter Button */}
                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  className="h-16 w-16 rounded-full bg-white p-1 shadow-xl active:scale-90 transition cursor-pointer hover:bg-emerald-50"
                  title="Snap photo"
                >
                  <div className="h-full w-full rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center text-white">
                    <Camera className="w-6 h-6" />
                  </div>
                </button>

                {/* Switch to native phone camera upload */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/30 transition active:scale-95 cursor-pointer"
                  title="Choose from photo library"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: File Upload / Mobile Native Camera Area */}
          {!capturedImage && mode === 'upload' && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/70 p-8 text-center cursor-pointer transition flex flex-col items-center justify-center group"
              >
                <div className="h-14 w-14 rounded-2xl bg-emerald-100 group-hover:bg-emerald-200 text-emerald-700 flex items-center justify-center mb-3 transition shadow-sm">
                  <Upload className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-gray-900">Choose Receipt Photo</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  Tap to launch your phone camera or select an existing photo of a receipt or invoice
                </p>
                <div className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-600/20 group-hover:bg-emerald-700 transition">
                  Browse or Take Photo
                </div>
              </div>
            </div>
          )}

          {/* Hidden File Input for Native Camera and File Picker */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* STEP 3: Scanning / Processing State with Animated Scanning Beam */}
          {capturedImage && (
            <div className="space-y-3">
              {/* Receipt Preview Thumbnail with Laser Scanning Effect */}
              <div className="relative rounded-2xl bg-gray-950 overflow-hidden max-h-56 sm:max-h-64 flex items-center justify-center border border-gray-200 shadow-md">
                <img
                  src={capturedImage}
                  alt="Receipt Preview"
                  className="max-h-56 sm:max-h-64 w-full object-contain"
                />

                {isScanning && (
                  <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-2xs flex flex-col items-center justify-center p-4">
                    {/* Animated laser line */}
                    <div className="w-full h-1 bg-emerald-400 shadow-lg shadow-emerald-400 animate-pulse absolute top-1/2 -translate-y-1/2" />
                    <div className="relative z-10 flex flex-col items-center bg-slate-950/80 px-4 py-3 rounded-2xl border border-emerald-400/40 shadow-xl">
                      <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mb-2" />
                      <span className="text-xs font-bold text-white tracking-wide">
                        Gemini AI OCR Analyzing Receipt...
                      </span>
                      <span className="text-[10px] text-emerald-300 mt-0.5">
                        Detecting total amount, merchant &amp; date
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 4: OCR Extracted Results Card */}
              {scanResult && !isScanning && (
                <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 p-4 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                      <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                        Extracted Receipt Details
                      </span>
                    </div>
                    {scanResult.confidence && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900">
                        {Math.round(scanResult.confidence * 100)}% Match
                      </span>
                    )}
                  </div>

                  {/* Highlighted Results Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Amount */}
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Total Amount
                      </span>
                      <div className="text-base sm:text-lg font-black text-emerald-700 font-mono mt-0.5">
                        {currency}
                        {scanResult.amount.toFixed(2)}
                      </div>
                    </div>

                    {/* Merchant / Description */}
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Merchant / Title
                      </span>
                      <div className="text-xs sm:text-sm font-bold text-gray-900 truncate mt-0.5">
                        {scanResult.description}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Date (DD-MM-YYYY)
                      </span>
                      <div className="text-xs font-bold text-gray-800 font-mono mt-0.5">
                        {formatDateDDMMYYYY(scanResult.date)}
                      </div>
                    </div>

                    {/* Category */}
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Category
                      </span>
                      <div className="text-xs font-bold text-gray-800 mt-0.5 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-emerald-600" />
                        <span>{scanResult.category}</span>
                      </div>
                    </div>
                  </div>

                  {/* Itemized Notes */}
                  {scanResult.notes && (
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-xs text-gray-600 shadow-2xs">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                        Detected Items / Notes
                      </span>
                      <p className="italic text-gray-700">{scanResult.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2 shrink-0">
          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                disabled={isScanning}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>

              {scanResult && !isScanning && (
                <button
                  type="button"
                  onClick={handleApplyScan}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-700/20 hover:from-emerald-700 hover:to-teal-700 active:scale-98 transition cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Auto-Populate Expense Form</span>
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] text-gray-400">
                Supports photos of physical receipts, digital invoices &amp; bills
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Hidden canvas for image extraction */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
