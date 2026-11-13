export type RedactionType = 'blur' | 'pixelate' | 'blackout' | 'mosaic';

export interface RedactionMask {
  id: string;
  label: string;
  // Normalized coordinates (0 to 1) relative to video natural dimensions
  x: number;
  y: number;
  width: number;
  height: number;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  type: RedactionType;
  intensity: number; // 5 to 50
  color?: string;
  detectedText?: string;
}

export interface DetectedPhoneNumber {
  id: string;
  text: string;
  confidence: number;
  // Normalized 0 to 1 coordinates
  x: number;
  y: number;
  width: number;
  height: number;
  timestamp: number;
}

export interface VideoInfo {
  name: string;
  url: string;
  duration: number;
  width: number;
  height: number;
  size?: number;
}
