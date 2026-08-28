import React, { useState, useRef } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { avatarService } from '../../services/avatar/avatarService';
import { Employee } from '../../types';
import {
  Camera,
  Upload,
  Trash2,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  X,
  Check,
  Loader2,
  Sparkles,
  User,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  onUpdated: (updatedEmployee: Employee) => void;
}

export const ProfilePhotoPreviewModal: React.FC<Props> = ({
  isOpen,
  onClose,
  employee,
  onUpdated,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<boolean>(false);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);

  const currentPhoto = pendingPreviewUrl || employee.avatar_url;
  const initials = `${employee.first_name?.[0] || 'D'}${employee.last_name?.[0] || 'B'}`.toUpperCase();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPEG, PNG, WebP).', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const processed = await avatarService.processImage(file, 1024, 0.92);
      setPendingPreviewUrl(processed.dataUrl);

      const res = await avatarService.uploadAndActivateAvatar({
        employeeId: employee.id,
        imageInput: processed.dataUrl,
        tenantId: employee.organization_id || 'org-joy-01',
        orgId: employee.organization_id || 'org-joy-01',
        currentVersion: (employee as any).avatar_version || 1,
      });

      const updated = {
        ...employee,
        avatar_url: res.url,
        avatar_version: res.version,
      };
      onUpdated(updated);
      showToast('Profile photo updated in high-definition & synced.', 'success');
    } catch (err: any) {
      console.error('Photo upload error:', err);
      showToast('Failed to update photo. Please try again.', 'error');
    } finally {
      setIsSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast("Camera not supported on this browser. Please use Upload.", 'info');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1080 }, height: { ideal: 1080 }, facingMode: 'user' },
      });
      setMediaStream(stream);
      setIsCameraActive(true);
    } catch (err) {
      showToast('Camera permission denied or unavailable.', 'error');
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
    setIsCameraActive(false);
  };

  const captureCameraPhoto = async () => {
    if (!videoRef.current) return;
    try {
      setIsSaving(true);
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const size = Math.min(video.videoWidth || 600, video.videoHeight || 600);
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        const startX = ((video.videoWidth || 600) - size) / 2;
        const startY = ((video.videoHeight || 600) - size) / 2;
        ctx.drawImage(video, startX, startY, size, size, 0, 0, 1024, 1024);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        stopCamera();

        const res = await avatarService.uploadAndActivateAvatar({
          employeeId: employee.id,
          imageInput: dataUrl,
          tenantId: employee.organization_id || 'org-joy-01',
          orgId: employee.organization_id || 'org-joy-01',
          currentVersion: (employee as any).avatar_version || 1,
        });

        const updated = {
          ...employee,
          avatar_url: res.url,
          avatar_version: res.version,
        };
        onUpdated(updated);
        showToast('Photo captured and synced successfully.', 'success');
      }
    } catch (err) {
      showToast('Failed to capture photo.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setIsSaving(true);
      await avatarService.removeAvatar({
        employeeId: employee.id,
        tenantId: employee.organization_id || 'org-joy-01',
        orgId: employee.organization_id || 'org-joy-01',
      });
      const updated = {
        ...employee,
        avatar_url: '',
        avatar_version: ((employee as any).avatar_version || 1) + 1,
      };
      setPendingPreviewUrl(null);
      onUpdated(updated);
      setShowRemoveConfirm(false);
      showToast('Profile photo removed. Initial avatar active.', 'info');
    } catch (err) {
      showToast('Failed to remove photo.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    if (!currentPhoto) return;
    const a = document.createElement('a');
    a.href = currentPhoto;
    a.download = `${employee.first_name}_${employee.last_name}_photo.jpg`;
    a.click();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      title="Employee Profile Photo"
      maxWidth="md"
    >
      <div className="space-y-6">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />

        {/* Photo Container */}
        <div className="relative w-full aspect-square max-w-[340px] mx-auto rounded-3xl overflow-hidden bg-slate-900 border-4 border-slate-800 shadow-2xl flex items-center justify-center group">
          {isSaving ? (
            <div className="flex flex-col items-center justify-center text-white space-y-3">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
              <p className="text-xs font-bold tracking-wide text-emerald-200">
                Optimizing & Syncing High-Res Photo...
              </p>
            </div>
          ) : isCameraActive ? (
            <div className="relative w-full h-full">
              <video
                ref={(node) => {
                  videoRef.current = node;
                  if (node && mediaStream) node.srcObject = mediaStream;
                }}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-4 flex justify-center gap-3">
                <Button size="sm" variant="primary" onClick={captureCameraPhoto} className="bg-[#07563D] hover:bg-[#064e37] shadow-lg font-bold">
                  <Camera className="w-4 h-4 mr-1.5" />
                  Capture Photo
                </Button>
                <Button size="sm" variant="secondary" onClick={stopCamera} className="bg-white/90 text-gray-800">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : currentPhoto ? (
            <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
              <img
                src={currentPhoto}
                alt={`${employee.first_name} ${employee.last_name}`}
                style={{
                  transform: `scale(${zoomLevel})`,
                  transition: 'transform 0.2s ease-out',
                }}
                className="w-full h-full object-cover select-none"
              />
              {/* Zoom Controls Overlay */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full p-1 border border-white/20">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(1, z - 0.25))}
                  className="p-1.5 text-white/80 hover:text-white rounded-full transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono text-white px-1">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                  className="p-1.5 text-white/80 hover:text-white rounded-full transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#073B2A] to-[#0B563D] flex flex-col items-center justify-center text-white space-y-2">
              <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center text-3xl font-black tracking-wider border-2 border-white/20">
                {initials}
              </div>
              <p className="text-xs font-bold text-emerald-200">No profile photo uploaded</p>
            </div>
          )}

          {/* Remove Confirm Overlay */}
          {showRemoveConfirm && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white space-y-3 z-20 animate-in fade-in">
              <Trash2 className="w-8 h-8 text-rose-400" />
              <div>
                <p className="text-sm font-bold">Remove Profile Photo?</p>
                <p className="text-xs text-white/70 mt-1">
                  This employee will revert to the default initials avatar.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="secondary" onClick={() => setShowRemoveConfirm(false)} className="bg-white/20 text-white hover:bg-white/30 border-0">
                  Cancel
                </Button>
                <Button size="sm" variant="destructive" onClick={handleRemovePhoto} className="bg-rose-600 hover:bg-rose-700 font-bold">
                  Yes, Remove
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Employee Info Header */}
        <div className="text-center">
          <h4 className="text-base font-extrabold text-gray-900">
            {employee.first_name} {employee.last_name}
          </h4>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            {employee.designation_title || 'Employee'} • Code: {employee.employee_code}
          </p>
        </div>

        {/* Actions Toolbar */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-gray-100">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSaving}
            className="bg-[#07563D] hover:bg-[#064e37] font-bold"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Upload New Photo
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={startCamera}
            disabled={isSaving || isCameraActive}
            className="bg-white border-gray-200 text-gray-700 font-semibold"
          >
            <Camera className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            Use Camera
          </Button>

          {currentPhoto && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="text-gray-700 hover:bg-gray-50"
                title="Download full resolution photo"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Download
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowRemoveConfirm(true)}
                disabled={isSaving}
                className="text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Remove
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
