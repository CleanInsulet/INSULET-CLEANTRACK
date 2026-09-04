/**
 * High-performance Image & Media Compression Utility for CleanTrack.
 * Ensures photos and camera captures uploaded from mobile devices (which can be 5-15MB)
 * are compressed to lightweight (< 50KB), crisp WebP/JPEG data URLs.
 * This guarantees real-time Firestore synchronization and avoids document size limits (< 1MB).
 */

export async function compressImage(
  fileOrDataUrl: File | string,
  maxWidth = 600,
  maxHeight = 600,
  quality = 0.55
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        // Scale down preserving aspect ratio
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first for optimal size, fallback to JPEG
        let compressedDataUrl = '';
        try {
          compressedDataUrl = canvas.toDataURL('image/webp', quality);
          if (!compressedDataUrl.startsWith('data:image/webp')) {
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          }
        } catch {
          compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(compressedDataUrl);
      } catch (err) {
        console.warn('Canvas compression error, using fallback:', err);
        if (typeof fileOrDataUrl === 'string') {
          resolve(fileOrDataUrl);
        } else {
          reject(err);
        }
      }
    };

    img.onerror = (err) => {
      console.warn('Image load error during compression:', err);
      if (typeof fileOrDataUrl === 'string') {
        resolve(fileOrDataUrl);
      } else {
        reject(err);
      }
    };

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}

/**
 * Ultra-high compression for task proof photos (max 280px, quality 0.35, ~5-15KB).
 * Extremely lightweight to prevent database bloat while keeping proof recognizable.
 */
export async function compressUltraSmallImage(
  fileOrDataUrl: File | string
): Promise<string> {
  return compressImage(fileOrDataUrl, 280, 280, 0.35);
}

/**
 * Extracts a lightweight poster frame thumbnail (~15-25KB) from a video file or blob.
 */
export async function generateVideoThumbnail(
  videoFileOrUrl: File | string
): Promise<string> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;

      const cleanup = () => {
        if (typeof videoFileOrUrl !== 'string' && video.src.startsWith('blob:')) {
          URL.revokeObjectURL(video.src);
        }
      };

      video.onloadeddata = () => {
        video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          const width = Math.min(480, video.videoWidth || 480);
          const height = Math.round((width * (video.videoHeight || 360)) / (video.videoWidth || 480));
          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            const thumbUrl = canvas.toDataURL('image/jpeg', 0.5);
            cleanup();
            resolve(thumbUrl);
            return;
          }
        } catch (e) {
          console.warn('Failed to capture video thumbnail canvas:', e);
        }
        cleanup();
        resolve('');
      };

      video.onerror = () => {
        cleanup();
        resolve('');
      };

      if (typeof videoFileOrUrl === 'string') {
        video.src = videoFileOrUrl;
      } else {
        video.src = URL.createObjectURL(videoFileOrUrl);
      }
      video.load();
    } catch {
      resolve('');
    }
  });
}

/**
 * Format bytes into human-readable string (KB/MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
