import React, { useRef, useState } from 'react';
import { Camera, Upload, Trash2, User, RefreshCw, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';

interface Props {
  photoUrl: string;
  onPhotoChange: (url: string) => void;
}

export const PhotoUploadCard: React.FC<Props> = ({ photoUrl, onPhotoChange }) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPEG, PNG or WebP).', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5MB limit. Please choose a smaller photo.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        onPhotoChange(result);
        showToast('Photo uploaded successfully.', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast("Camera isn't available on this device/browser. You can upload a photo instead.", 'info');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 400 } });
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

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 320, 320);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      onPhotoChange(dataUrl);
      stopCamera();
      showToast('Photo captured successfully.', 'success');
    }
  };

  return (
    <div className="p-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-gray-50 flex flex-col items-center justify-center text-center space-y-3 transition-colors">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />

      {isCameraActive ? (
        <div className="space-y-3 w-full flex flex-col items-center">
          <div className="w-36 h-36 rounded-2xl overflow-hidden bg-black border-2 border-[#07563D] relative shadow-md">
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
            <Button size="sm" variant="primary" onClick={capturePhoto} className="text-xs bg-[#07563D] hover:bg-[#064e37]">
              <Camera className="w-3.5 h-3.5 mr-1" />
              Capture
            </Button>
            <Button size="sm" variant="ghost" onClick={stopCamera} className="text-xs text-gray-500">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : photoUrl ? (
        <div className="space-y-3 flex flex-col items-center">
          <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md relative group">
            <img src={photoUrl} alt="Employee Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onPhotoChange('')}
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
              className="text-xs h-7 px-2.5 bg-white text-gray-700"
            >
              Change Photo
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onPhotoChange('')}
              className="text-xs h-7 px-2 text-rose-600 hover:bg-rose-50"
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="w-24 h-24 rounded-2xl bg-white border border-gray-200 shadow-xs flex items-center justify-center text-gray-300">
            <User className="w-12 h-12" />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-800">Add Profile Photo</p>
            <p className="text-[10px] text-gray-400 max-w-[170px]">
              JPG, PNG, WebP · Max 5MB Front-facing headshot
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
    </div>
  );
};
