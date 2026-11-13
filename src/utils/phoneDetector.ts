import { createWorker, type Line, type Word } from 'tesseract.js';
import type { DetectedPhoneNumber } from '../types/editor';

// Comprehensive regex patterns for phone numbers worldwide
const PHONE_PATTERNS = [
  // US/Canada: +1 (555) 234-5678, (555) 234-5678, 555-234-5678, 555.234.5678
  /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
  // UK / International: +44 20 7946 0958, +44-20-7946-0958, +91 98765 43210
  /\+?[0-9]{1,4}[-.\s]?(?:\(?([0-9]{2,4})\)?[-.\s]?)?[0-9]{3,4}[-.\s]?[0-9]{3,4}/g,
  // Generic 7-15 digit telephone sequences with separators
  /(?:\b|\+)[0-9]{1,4}[-.\s(]{1,2}[0-9]{2,5}[-.\s)]{1,2}[0-9]{2,5}[-.\s]?[0-9]{2,5}\b/g,
  // 10 or 11 continuous digits starting with common area codes or +
  /(?:\+?[0-9]{10,12})\b/g,
];

// Helper to check if string matches phone pattern
export function isPhoneNumber(text: string): boolean {
  const clean = text.trim();
  // Must have at least 7 digits to be considered a phone number
  const digitCount = (clean.match(/\d/g) || []).length;
  if (digitCount < 7 || digitCount > 15) return false;

  for (const pattern of PHONE_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(clean)) return true;
  }
  return false;
}

let workerInstance: Awaited<ReturnType<typeof createWorker>> | null = null;
let isInitializingWorker = false;

async function getWorker() {
  if (workerInstance) return workerInstance;
  if (isInitializingWorker) {
    while (isInitializingWorker) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (workerInstance) return workerInstance;
  }

  isInitializingWorker = true;
  try {
    const worker = await createWorker('eng');
    workerInstance = worker;
    return worker;
  } finally {
    isInitializingWorker = false;
  }
}

/**
 * Capture current video frame into a canvas
 */
export function captureFrameToCanvas(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

/**
 * Scans a single video frame for phone numbers using Tesseract OCR
 */
export async function scanFrameForPhoneNumbers(
  video: HTMLVideoElement,
  timestamp: number
): Promise<DetectedPhoneNumber[]> {
  const canvas = captureFrameToCanvas(video);
  const worker = await getWorker();

  const ret = await worker.recognize(canvas);
  const detected: DetectedPhoneNumber[] = [];

  const videoWidth = canvas.width;
  const videoHeight = canvas.height;

  // Extract all lines and words from page blocks
  const words: Word[] = [];
  const lines: Line[] = [];

  if (ret.data.blocks) {
    for (const block of ret.data.blocks) {
      for (const para of block.paragraphs) {
        for (const line of para.lines) {
          lines.push(line);
          for (const word of line.words) {
            words.push(word);
          }
        }
      }
    }
  }

  // 1. Check words first
  for (let i = 0; i < words.length; i++) {
    const singleWord = words[i];
    if (isPhoneNumber(singleWord.text)) {
      detected.push({
        id: `phone-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        text: singleWord.text.trim(),
        confidence: singleWord.confidence,
        x: Math.max(0, (singleWord.bbox.x0 - 4) / videoWidth),
        y: Math.max(0, (singleWord.bbox.y0 - 4) / videoHeight),
        width: Math.min(1, (singleWord.bbox.x1 - singleWord.bbox.x0 + 8) / videoWidth),
        height: Math.min(1, (singleWord.bbox.y1 - singleWord.bbox.y0 + 8) / videoHeight),
        timestamp,
      });
      continue;
    }

    // Check sliding window of 2 to 4 consecutive words
    for (let span = 2; span <= 4 && i + span <= words.length; span++) {
      const slice = words.slice(i, i + span);
      const combinedText = slice.map((w: Word) => w.text).join(' ');

      if (isPhoneNumber(combinedText)) {
        const x0 = Math.min(...slice.map((w: Word) => w.bbox.x0));
        const y0 = Math.min(...slice.map((w: Word) => w.bbox.y0));
        const x1 = Math.max(...slice.map((w: Word) => w.bbox.x1));
        const y1 = Math.max(...slice.map((w: Word) => w.bbox.y1));

        const exists = detected.some(
          (d) =>
            Math.abs(d.x - (x0 - 4) / videoWidth) < 0.05 &&
            Math.abs(d.y - (y0 - 4) / videoHeight) < 0.05
        );

        if (!exists) {
          detected.push({
            id: `phone-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            text: combinedText.trim(),
            confidence: slice.reduce((acc: number, w: Word) => acc + w.confidence, 0) / slice.length,
            x: Math.max(0, (x0 - 6) / videoWidth),
            y: Math.max(0, (y0 - 6) / videoHeight),
            width: Math.min(1, (x1 - x0 + 12) / videoWidth),
            height: Math.min(1, (y1 - y0 + 12) / videoHeight),
            timestamp,
          });
        }
      }
    }
  }

  // 2. Also check full lines
  for (const line of lines) {
    for (const pattern of PHONE_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line.text)) !== null) {
        const matchStr = match[0].trim();
        const digitCount = (matchStr.match(/\d/g) || []).length;
        if (digitCount >= 7 && digitCount <= 15) {
          const charRatioStart = match.index / Math.max(1, line.text.length);
          const charRatioLen = matchStr.length / Math.max(1, line.text.length);

          const lineWidth = line.bbox.x1 - line.bbox.x0;
          const matchX0 = line.bbox.x0 + charRatioStart * lineWidth;
          const matchX1 = matchX0 + charRatioLen * lineWidth;

          const exists = detected.some(
            (d) =>
              Math.abs(d.x - matchX0 / videoWidth) < 0.08 &&
              Math.abs(d.y - line.bbox.y0 / videoHeight) < 0.08
          );

          if (!exists) {
            detected.push({
              id: `phone-line-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              text: matchStr,
              confidence: line.confidence,
              x: Math.max(0, (matchX0 - 6) / videoWidth),
              y: Math.max(0, (line.bbox.y0 - 4) / videoHeight),
              width: Math.min(1, (matchX1 - matchX0 + 12) / videoWidth),
              height: Math.min(1, (line.bbox.y1 - line.bbox.y0 + 8) / videoHeight),
              timestamp,
            });
          }
        }
      }
    }
  }

  return detected;
}
