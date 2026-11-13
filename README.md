# RedactVision - Video Privacy & Phone Number Redaction Studio

**RedactVision** is a modern, in-browser video editor built with **React**, **TypeScript**, and **Tailwind CSS**, designed specifically for redacting sensitive Personally Identifiable Information (PII)—focusing on **telephone numbers** displayed in videos.

All processing, optical character recognition (OCR), and video rendering run **100% client-side in the browser**—ensuring confidential video footage never leaves your machine.

---

## 🌟 Key Features

### 1. Smart Phone Number Detection (AI / OCR Engine)
- Integrated with client-side OCR (**Tesseract.js**) and phone pattern matchers (US/Canada, UK/Europe, international E.164 formats, and custom sequences).
- **Scan Current Frame**: Instantly identifies visible phone numbers on the active frame, calculates their bounding box coordinates, and generates redaction masks with 1 click.
- **Scan Entire Video**: Automatically samples video keyframes, aggregates all detected telephone numbers, and provides a **"Redact All"** button.

### 2. Multi-Style Redaction Engine
- **Blur**: Gaussian-style multi-pass blur with adjustable blur radius (6px to 40px).
- **Pixelate / Mosaic**: True pixelation downscaling and upscaling with custom block sizes.
- **Solid Blackout Bar**: Classic FBI / confidential document blackout bar.

### 3. Interactive Video Preview & Mask Editor
- Direct canvas manipulation: drag redaction boxes to reposition or use the 8 resize handles.
- **Draw Redaction Area**: Click and drag anywhere directly on the video canvas to draw custom redaction boxes.
- Real-time live preview of all burnt-in redactions as the video plays or scrubs.

### 4. Precision Multi-Track Timeline
- Millisecond-accurate timecode scrubbing (`00:03.25 / 00:10.00`).
- Interactive redaction tracks: each mask is displayed as a colored clip showing its active start and end time.
- **Trim Handles**: Drag clip start/end handles to fine-tune the redaction duration.
- **In/Out Point Hotkeys**: Press `I` to set clip start time to playhead, press `O` to set clip end time to playhead.
- Playback speeds (0.5×, 1×, 1.5×, 2×) and audio mute controls.

### 5. Client-Side Video Export
- Re-encodes the video with redactions permanently burnt into the video frames.
- Preserves audio tracks.
- Live progress modal showing frame count and percentage.
- Exports to downloadable `.webm` / `.mp4`.

### 6. Built-in Sample Video Generator
- No video on hand? Click **"Load Sample Video"** to dynamically generate a 1280×720 compliance test video containing realistic customer support phone numbers, escrow contact numbers, and international hotline numbers.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Space` | Play / Pause video |
| `Left Arrow` | Step back 1 second |
| `Right Arrow` | Step forward 1 second |
| `I` | Set redaction start time to current playhead |
| `O` | Set redaction end time to current playhead |
| `Delete` / `Backspace` | Delete selected redaction clip |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Development
```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

Open `http://localhost:5173/` in your browser.

### Production Build
```bash
npm run build
npm run preview
```
