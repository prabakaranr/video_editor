import type { RedactionMask } from '../types/editor';
import { renderMaskOnContext } from './maskRenderer';

export interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  phase: 'preparing' | 'rendering' | 'finalizing' | 'done';
}

export async function exportRedactedVideo(
  videoElement: HTMLVideoElement,
  masks: RedactionMask[],
  onProgress: (progress: ExportProgress) => void
): Promise<{ blob: Blob; url: string; filename: string }> {
  const duration = videoElement.duration || 10;
  const width = videoElement.videoWidth || 1280;
  const height = videoElement.videoHeight || 720;
  const fps = 30;
  const totalFrames = Math.max(1, Math.round(duration * fps));

  onProgress({
    currentFrame: 0,
    totalFrames,
    percentage: 0,
    phase: 'preparing',
  });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not create canvas context');

  // Video track from canvas
  const canvasStream = canvas.captureStream(fps);
  const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

  // Attempt audio track capture if present
  try {
    // @ts-expect-error captureStream is supported on HTMLMediaElement in Chromium
    if (typeof videoElement.captureStream === 'function') {
      // @ts-expect-error browser method
      const videoStream: MediaStream = videoElement.captureStream();
      const audioTracks = videoStream.getAudioTracks();
      if (audioTracks.length > 0) {
        combinedTracks.push(audioTracks[0]);
      }
    }
  } catch (e) {
    console.warn('Audio capture not available, exporting video without audio track', e);
  }

  const combinedStream = new MediaStream(combinedTracks);

  const mimeTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  let selectedMime = 'video/webm';
  for (const mime of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mime)) {
      selectedMime = mime;
      break;
    }
  }

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: selectedMime,
    videoBitsPerSecond: 4000000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const exportPromise = new Promise<{ blob: Blob; url: string; filename: string }>(
    (resolve, reject) => {
      recorder.onstop = () => {
        onProgress({
          currentFrame: totalFrames,
          totalFrames,
          percentage: 100,
          phase: 'done',
        });
        const ext = selectedMime.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunks, { type: selectedMime });
        const url = URL.createObjectURL(blob);
        resolve({
          blob,
          url,
          filename: `redacted_video_${Date.now()}.${ext}`,
        });
      };
      recorder.onerror = (err) => reject(err);
    }
  );

  recorder.start();

  // Save current video state
  const prevTime = videoElement.currentTime;
  const wasPaused = videoElement.paused;
  videoElement.pause();

  // Helper function to seek and wait for frame
  const seekTo = (time: number): Promise<void> => {
    return new Promise((resolve) => {
      const onSeeked = () => {
        videoElement.removeEventListener('seeked', onSeeked);
        resolve();
      };
      videoElement.addEventListener('seeked', onSeeked);
      videoElement.currentTime = Math.min(time, duration);
    });
  };

  try {
    for (let frame = 0; frame < totalFrames; frame++) {
      const t = frame / fps;
      await seekTo(t);

      // Draw original video frame
      ctx.drawImage(videoElement, 0, 0, width, height);

      // Apply each redaction mask active at timestamp t
      for (const mask of masks) {
        renderMaskOnContext(ctx, mask, width, height, t);
      }

      const percent = Math.min(99, Math.round((frame / totalFrames) * 100));
      onProgress({
        currentFrame: frame + 1,
        totalFrames,
        percentage: percent,
        phase: 'rendering',
      });

      // Brief delay to allow stream to ingest frame
      await new Promise((r) => setTimeout(r, 1000 / fps));
    }

    onProgress({
      currentFrame: totalFrames,
      totalFrames,
      percentage: 99,
      phase: 'finalizing',
    });

    recorder.stop();
  } catch (err) {
    recorder.stop();
    throw err;
  } finally {
    // Restore previous state
    videoElement.currentTime = prevTime;
    if (!wasPaused) {
      videoElement.play().catch(() => {});
    }
  }

  return exportPromise;
}
