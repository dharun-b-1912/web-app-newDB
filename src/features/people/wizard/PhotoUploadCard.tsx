import React, { useRef, useState } from 'react';
import { Camera, Upload, Trash2, User, RefreshCw, X, Check, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { avatarService } from '../../../services/avatar/avatarService';

interface Props {
  photoUrl: string;
  onPhotoChange: (url: string) => void;
  initials?: string;
  employeeName?: string;
}

export const PhotoUploadCard: React.FC<Props> = ({
  photoUrl,
  onPhotoChange,
  initials = 'DB',
  employeeName = 'Employee',
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<boolean>(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPEG, PNG or WebP).', 'error');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showToast('Image size exceeds 15MB limit. Please choose a smaller photo.', 'error');
      return;
    }

    try {
      setIsProcessing(true);
      const processed = await avatarService.processImage(file, 1024, 0.92);
      onPhotoChange(processed.dataUrl);
      showToast(`High quality photo optimized (${Math.round(processed.sizeBytes / 1024)} KB) and ready!`, 'success');
    } catch (err: any) {
      console.error('Image processing error:', err);
      showToast('Could not process this photo. Please try another image.', 'error');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast("Camera isn't available on this device/browser. You can upload a photo instead.", 'info');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1080 }, height: { ideal: 1080 }, facingMode: 'user' },
      });
      setMediaStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      showToast('Camera permission was denied or unavailable. Please upload a file instead.', 'info');
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    try {
      setIsProcessing(true);
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const size = Math.min(video.videoWidth || 400, video.videoHeight || 400);
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        const startX = ((video.videoWidth || 400) - size) / 2;
        const startY = ((video.videoHeight || 400) - size) / 2;
        ctx.drawImage(video, startX, startY, size, size, 0, 0, 1024, 1024);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const processed = await avatarService.processImage(dataUrl, 1024, 0.92);
        onPhotoChange(processed.dataUrl);
        stopCamera();
        showToast('Photo captured and optimized successfully.', 'success');
      }
    } catch (err) {
      showToast('Failed to capture photo. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmRemove = () => {
    onPhotoChange('');
    setShowRemoveConfirm(false);
    showToast('Profile photo removed. Employee will display initials avatar.', 'info');
  };

  return (
    <div className="p-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-gray-50 flex flex-col items-center justify-center text-center space-y-3 transition-colors relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />

      {isProcessing ? (
        <div className="py-8 flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-8 h-8 text-[#07563D] animate-spin" />
          <p className="text-xs font-bold text-gray-700">Optimizing profile photo...</p>
          <p className="text-[10px] text-gray-400">Cropping to 1:1 and compressing WebP</p>
        </div>
      ) : isCameraActive ? (
        <div className="space-y-3 w-full flex flex-col items-center">
          <div className="w-40 h-40 rounded-2xl overflow-hidden bg-black border-2 border-[#07563D] relative shadow-md">
            <video
              ref={(node) => {
                videoRef.current = node;
                if (node && mediaStream) node.srcObject = mediaStream;
              }}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={capturePhoto} className="text-xs bg-[#07563D] hover:bg-[#064e37] font-bold">
              <Camera className="w-3.5 h-3.5 mr-1" />
              Capture Photo
            </Button>
            <Button size="sm" variant="ghost" onClick={stopCamera} className="text-xs text-gray-500">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : photoUrl ? (
        <div className="space-y-3 flex flex-col items-center">
          <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md relative group bg-white">
            <img src={photoUrl} alt="Employee Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setShowRemoveConfirm(true)}
              className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove photo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs h-7 px-2.5 bg-white text-gray-700 font-bold border-gray-200"
            >
              Change Photo
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowRemoveConfirm(true)}
              className="text-xs h-7 px-2 text-rose-600 hover:bg-rose-50 font-bold"
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="w-24 h-24 rounded-2xl bg-emerald-900 border border-emerald-800 shadow-xs flex items-center justify-center text-white font-black text-2xl tracking-wider">
            {initials || 'EM'}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-800">Profile Photo</p>
            <p className="text-[10px] text-gray-400 max-w-[170px]">
              High-resolution 1:1 Headshot (Auto-optimized to ~150KB WebP)
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs h-7 px-2.5 bg-white border-gray-200 shadow-2xs font-semibold text-gray-700"
            >
              <Upload className="w-3 h-3 mr-1 text-[#07563D]" />
              Upload
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={startCamera}
              className="text-xs h-7 px-2.5 bg-white border-gray-200 shadow-2xs font-semibold text-gray-700"
            >
              <Camera className="w-3 h-3 mr-1 text-blue-600" />
              Take Photo
            </Button>
          </div>
        </>
      )}

      {/* Remove Confirmation Overlay */}
      {showRemoveConfirm && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-xs rounded-2xl p-3 flex flex-col items-center justify-center space-y-2 z-10 animate-in fade-in">
          <p className="text-xs font-bold text-gray-900">Remove profile photo?</p>
          <p className="text-[10px] text-gray-500">Employee will return to initials avatar ({initials}).</p>
          <div className="flex gap-2 pt-1">
            <Button size="xs" variant="outline" onClick={() => setShowRemoveConfirm(false)} className="text-[11px] h-6 px-2">
              Cancel
            </Button>
            <Button size="xs" variant="destructive" onClick={handleConfirmRemove} className="text-[11px] h-6 px-2 font-bold">
              Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

