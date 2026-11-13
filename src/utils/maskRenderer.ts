import type { RedactionMask } from '../types/editor';

/**
 * Applies a redaction mask directly onto a canvas 2D context.
 * Uses exact pixel coordinates calculated from normalized (0-1) coordinates.
 */
export function renderMaskOnContext(
  ctx: CanvasRenderingContext2D,
  mask: RedactionMask,
  canvasWidth: number,
  canvasHeight: number,
  currentTime: number
) {
  // Check if mask is active at current timestamp
  if (currentTime < mask.startTime || currentTime > mask.endTime) {
    return;
  }

  const x = Math.round(mask.x * canvasWidth);
  const y = Math.round(mask.y * canvasHeight);
  const width = Math.round(mask.width * canvasWidth);
  const height = Math.round(mask.height * canvasHeight);

  if (width <= 0 || height <= 0) return;

  ctx.save();

  if (mask.type === 'blackout') {
    // Solid FBI-style blackout bar
    ctx.fillStyle = mask.color || '#000000';
    ctx.fillRect(x, y, width, height);
  } else if (mask.type === 'blur') {
    // Blur effect using temporary canvas
    const blurRadius = Math.max(4, Math.round(mask.intensity || 16));

    // Create offscreen canvas for the region
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');

    if (tempCtx) {
      tempCtx.drawImage(
        ctx.canvas,
        x, y, width, height,
        0, 0, width, height
      );

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.clip();
      ctx.filter = `blur(${blurRadius}px)`;
      // Draw multiple times to make blur truly opaque and unreadable
      ctx.drawImage(tempCanvas, x - 10, y - 10, width + 20, height + 20);
      ctx.drawImage(tempCanvas, x - 10, y - 10, width + 20, height + 20);
      ctx.restore();
    }
  } else if (mask.type === 'pixelate' || mask.type === 'mosaic') {
    // Pixelate effect: downscale then upscale without smoothing
    const blockSize = Math.max(6, Math.round((mask.intensity || 20) / 2));
    const smallW = Math.max(1, Math.floor(width / blockSize));
    const smallH = Math.max(1, Math.floor(height / blockSize));

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = smallW;
    tempCanvas.height = smallH;
    const tempCtx = tempCanvas.getContext('2d');

    if (tempCtx) {
      tempCtx.imageSmoothingEnabled = false;
      tempCtx.drawImage(
        ctx.canvas,
        x, y, width, height,
        0, 0, smallW, smallH
      );

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        tempCanvas,
        0, 0, smallW, smallH,
        x, y, width, height
      );

      // If mosaic, add slight grid styling
      if (mask.type === 'mosaic') {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1;
        for (let bx = x; bx <= x + width; bx += blockSize) {
          ctx.beginPath();
          ctx.moveTo(bx, y);
          ctx.lineTo(bx, y + height);
          ctx.stroke();
        }
        for (let by = y; by <= y + height; by += blockSize) {
          ctx.beginPath();
          ctx.moveTo(x, by);
          ctx.lineTo(x + width, by);
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  }

  ctx.restore();
}
