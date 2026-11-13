/**
 * Generates an in-browser demo video containing realistic scenes with phone numbers.
 * Perfect for immediately testing phone number detection and redaction!
 */
export async function generateDemoVideo(
  onProgress?: (percent: number) => void
): Promise<{ blob: Blob; url: string; duration: number }> {
  const width = 1280;
  const height = 720;
  const fps = 30;
  const totalSeconds = 10;
  const totalFrames = totalSeconds * fps;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas context');

  // Stream from canvas
  const stream = canvas.captureStream(fps);

  // Pick supported mime type
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

  const recorder = new MediaRecorder(stream, {
    mimeType: selectedMime,
    videoBitsPerSecond: 3000000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<{ blob: Blob; url: string; duration: number }>(
    (resolve, reject) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: selectedMime });
        const url = URL.createObjectURL(blob);
        resolve({ blob, url, duration: totalSeconds });
      };
      recorder.onerror = (err) => reject(err);
    }
  );

  recorder.start();

  // Render frames sequentially
  for (let frame = 0; frame < totalFrames; frame++) {
    const t = frame / fps; // current time in seconds

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    if (t < 5) {
      gradient.addColorStop(0, '#0f172a');
      gradient.addColorStop(1, '#1e293b');
    } else {
      gradient.addColorStop(0, '#111827');
      gradient.addColorStop(1, '#1f2937');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Top Header Bar
    ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
    ctx.fillRect(40, 30, width - 80, 70);
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
    ctx.strokeRect(40, 30, width - 80, 70);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('VIDEO EDITOR DEMO FOOTAGE - PRIVACY COMPLIANCE', 60, 74);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px monospace';
    ctx.fillText(`TIME: ${t.toFixed(2)}s / ${totalSeconds.toFixed(2)}s | FPS: 30`, width - 360, 72);

    if (t < 5) {
      // SCENE 1: Customer Support Portal
      // Card container
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(100, 140, 1080, 480, 16);
      ctx.fill();

      // Card Header
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.roundRect(100, 140, 1080, 80, [16, 16, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText('GLOBAL CUSTOMER CARE & SUPPORT', 140, 192);

      // Card Content
      ctx.fillStyle = '#1e293b';
      ctx.font = '22px sans-serif';
      ctx.fillText('Account Verification Department (Confidential)', 140, 270);

      // Section 1: Toll Free Phone Number
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.roundRect(140, 300, 800, 110, 12);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(140, 300, 800, 110);

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('TOLL-FREE HELPLINE (US/CANADA):', 160, 335);

      // Prominent phone number for redaction
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 38px monospace';
      ctx.fillText('+1 (800) 555-0199', 160, 385);

      // Section 2: Direct Support Agent
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(140, 440, 800, 110, 12);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(140, 440, 800, 110);

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('DIRECT DESK AGENT PHONE NUMBER:', 160, 475);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 38px monospace';
      ctx.fillText('+1 (415) 892-4912', 160, 525);

      // Warning pill
      ctx.fillStyle = '#fee2e2';
      ctx.beginPath();
      ctx.roundRect(140, 570, 480, 34, 17);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('PHONE NUMBERS MUST BE REDACTED BEFORE PUBLISHING', 155, 592);
    } else {
      // SCENE 2: Real Estate & Financial Transaction
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(100, 140, 1080, 480, 16);
      ctx.fill();

      // Card Header
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.roundRect(100, 140, 1080, 80, [16, 16, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText('PROPERTY CLOSING & ESCROW NOTIFICATION', 140, 192);

      // Card Content
      ctx.fillStyle = '#1e293b';
      ctx.font = '22px sans-serif';
      ctx.fillText('Client Contact & Settlement Representative', 140, 270);

      // Escrow officer phone
      ctx.fillStyle = '#ecfdf5';
      ctx.beginPath();
      ctx.roundRect(140, 300, 800, 110, 12);
      ctx.fill();
      ctx.strokeStyle = '#a7f3d0';
      ctx.strokeRect(140, 300, 800, 110);

      ctx.fillStyle = '#047857';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('PRIMARY ESCROW OFFICER DIRECT MOBILE:', 160, 335);

      ctx.fillStyle = '#064e3b';
      ctx.font = 'bold 38px monospace';
      ctx.fillText('+1 (212) 555-0144', 160, 385);

      // International branch
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(140, 440, 800, 110, 12);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(140, 440, 800, 110);

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('LONDON DISPATCH OFFICE:', 160, 475);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 38px monospace';
      ctx.fillText('+44 20 7946 0958', 160, 525);

      // Security tag
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.roundRect(140, 570, 520, 34, 17);
      ctx.fill();
      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('REDACTION REQUIRED: CONTAINS PERSONALLY IDENTIFIABLE NUMBERS', 155, 592);
    }

    // Time ticker bar at the bottom
    const progressRatio = frame / totalFrames;
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, height - 8, width * progressRatio, 8);

    if (onProgress && frame % 10 === 0) {
      onProgress(Math.round(progressRatio * 100));
    }

    // Yield control so recorder can capture frames cleanly
    await new Promise((r) => setTimeout(r, 1000 / fps));
  }

  if (onProgress) onProgress(100);
  recorder.stop();
  return recordingPromise;
}
