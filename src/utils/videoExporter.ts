import type { RedactionMask } from '../types/editor';
import { renderMaskOnContext } from './maskRenderer';

export interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  phase: 'preparing' | 'rendering' | 'finalizing' | 'done';
}

export interface TrimRange {
  start: number;
  end: number;
}

export interface VideoExportOptions {
  trimRange?: TrimRange;
  muteAudio?: boolean;
  bitrate?: number; // e.g. 12_000_000 for high quality
}

export async function exportRedactedVideo(
  videoElement: HTMLVideoElement,
  masks: RedactionMask[],
  onProgress: (progress: ExportProgress) => void,
  options?: VideoExportOptions
): Promise<{ blob: Blob; url: string; filename: string }> {
  const trimRange = options?.trimRange;
  const muteAudio = options?.muteAudio ?? false;
  // Default to 12 Mbps for crisp text & near-lossless phone recording quality
  const targetBitrate = options?.bitrate || 12_000_000;

  const videoDuration = videoElement.duration || 10;
  const startSec = trimRange ? Math.max(0, trimRange.start) : 0;
  const endSec = trimRange ? Math.min(videoDuration, trimRange.end) : videoDuration;
  const exportDuration = Math.max(0.2, endSec - startSec);

  // Use full native resolution of original video
  const width = videoElement.videoWidth || 1280;
  const height = videoElement.videoHeight || 720;
  const fps = 30;
  const totalFrames = Math.max(1, Math.round(exportDuration * fps));

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

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Video track from canvas
  const canvasStream = canvas.captureStream(fps);
  const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

  // Attempt audio track capture if not muted
  if (!muteAudio) {
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
    videoBitsPerSecond: targetBitrate,
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
        const trimLabel = trimRange ? `_trimmed_[${startSec.toFixed(1)}s-${endSec.toFixed(1)}s]` : '';
        const muteLabel = muteAudio ? '_muted' : '';
        resolve({
          blob,
          url,
          filename: `redacted_video${trimLabel}${muteLabel}_${Date.now()}.${ext}`,
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

  const seekTo = (time: number): Promise<void> => {
    return new Promise((resolve) => {
      const onSeeked = () => {
        videoElement.removeEventListener('seeked', onSeeked);
        resolve();
      };
      videoElement.addEventListener('seeked', onSeeked);
      videoElement.currentTime = Math.min(time, videoDuration);
    });
  };

  try {
    for (let frame = 0; frame < totalFrames; frame++) {
      const t = startSec + (frame / fps);
      await seekTo(t);

      // Draw original video frame at native resolution with high-fidelity smoothing
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
    videoElement.currentTime = prevTime;
    if (!wasPaused) {
      videoElement.play().catch(() => {});
    }
  }

  return exportPromise;
}
