import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { avatarService, AvatarVariant } from '../../services/avatar/avatarService';

export interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: AvatarVariant;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  variant,
  className,
}) => {
  const [hasError, setHasError] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(() => {
    if (src && (src.startsWith('http') || src.startsWith('data:'))) {
      return src;
    }
    return undefined;
  });

  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-16 h-16 text-xl font-bold',
    '2xl': 'w-24 h-24 text-2xl font-black',
  };

  const defaultVariant: AvatarVariant =
    variant || (size === 'sm' ? 'small' : size === 'xl' || size === '2xl' ? 'large' : 'medium');

  useEffect(() => {
    if (!src) {
      setResolvedSrc(undefined);
      setHasError(false);
      return;
    }

    if (src.startsWith('http') || src.startsWith('data:')) {
      const url = avatarService.getAvatarVariantUrl(src, defaultVariant);
      setResolvedSrc(url);
      setHasError(false);
      return;
    }

    // Relative storage path: fetch signed URL asynchronously
    let isCurrent = true;
    avatarService.getAvatarSignedUrl(src).then((signed) => {
      if (isCurrent && signed) {
        setResolvedSrc(signed);
        setHasError(false);
      }
    }).catch(() => {
      if (isCurrent) setHasError(true);
    });

    return () => {
      isCurrent = false;
    };
  }, [src, defaultVariant]);

  const getInitials = (n: string) => {
    if (!n) return 'U';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const showImage = !!resolvedSrc && !hasError;

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full overflow-hidden bg-emerald-100 text-[#07563D] font-semibold shrink-0 border border-emerald-200/60 select-none shadow-2xs',
        sizes[size],
        className
      )}
    >
      {resolvedSrc && (
        <img
          src={resolvedSrc}
          alt={name}
          loading="lazy"
          className={cn(
            'w-full h-full object-cover transition-opacity duration-200',
            showImage ? 'opacity-100' : 'opacity-0 absolute'
          )}
          onError={() => setHasError(true)}
          onLoad={() => setHasError(false)}
        />
      )}
      {!showImage && <span>{getInitials(name)}</span>}
    </div>
  );
};
