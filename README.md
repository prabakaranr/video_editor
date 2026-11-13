# RedactVision - Video Phone Number Redaction & YouTube Trimmer Studio

**RedactVision** is a full-featured video editing and trimming application built with **React**, **TypeScript**, **Tailwind CSS**, and an **Express / yt-dlp / FFmpeg** backend.

It brings together:
1. **Interactive Video Editing & Phone Number Redaction** (client-side OCR, automatic phone detection, blur, pixelate, and blackout masks).
2. **Local Video Trimming** (trim start/end handles, loop preview, and export only the trimmed range with redactions).
3. **YouTube Video Trimming & Downloading** (URL ingestion, synchronized YouTube player, dual-range timeline slider, sub-second precision frame adjusters, multi-format export, and direct bridge to Redactor Studio).

---

## 🌟 Key Capabilities

### 1. Trimming Locally Uploaded Videos
- **Interactive Video Trim Track**: Dual draggable start and end cut handles directly on the timeline track.
- **One-Click Cue Markers**:
  - `[Start: Xs]`: Sets the clip start point to the current playhead position.
  - `[End: Ys]`: Sets the clip end point to the current playhead position.
  - `Loop Trim`: Continuously loops playback within the selected cut interval.
- **Export Scope**: In the Export dialog, choose between:
  - **Trimmed Cut Only**: Exports only the trimmed segment with all active redactions baked in.
  - **Full Video**: Exports the complete video.

### 2. Trimming YouTube Videos
- **Instant YouTube Ingestion**: Input any YouTube video link (`watch?v=...`, `youtu.be/...`, or YouTube Shorts) or click sample chips.
- **Synchronized YouTube Player**: Built-in player with live time synchronization and cue markers (`Set as Start`, `Set as End`, `Loop Preview`).
- **Dual-Range Timeline Trimmer**: Visual cut window with sub-second micro adjusters (`-1s`, `-0.1s`, `+0.1s`, `+1s`) and direct timestamp inputs.
- **Multi-Format Export**:
  - **MP4 Video** (1080p, 720p, 480p, 360p, or Best Quality)
  - **MP3 Audio** (audio-only extraction)
  - **GIF Animation** (looping animated GIF)
  - **WebM Video** (optimized web video)
- **Direct Bridge to Redactor Studio**: After trimming (or from the session history), click **"Open in Redactor Studio"** to load the trimmed YouTube clip straight into the canvas editor to detect and redact phone numbers!

### 3. Smart Phone Number Redaction (AI / OCR Engine)
- Integrated with client-side OCR (**Tesseract.js**) to detect phone numbers across keyframes.
- **Scan Current Frame**: Identifies telephone numbers on the active frame and creates bounding boxes.
- **Scan Entire Video**: Samples keyframes across the video and gives a **"Redact All"** button.
- **Redaction Styles**:
  - **Blur**: Gaussian blur with adjustable radius (6px to 40px).
  - **Pixelate / Mosaic**: Downscaled pixel blocks with custom sizing.
  - **Solid Blackout Bar**: Classic FBI-style confidential redaction.

---

## ⌨️ Keyboard Shortcuts (Editor Mode)

| Shortcut | Action |
|---|---|
| `Space` | Play / Pause video |
| `Left Arrow` | Step back 1 second |
| `Right Arrow` | Step forward 1 second |
| `I` | Set redaction start time to current playhead |
| `O` | Set redaction end time to current playhead |
| `Delete` / `Backspace` | Delete selected redaction clip |

---

## 🚀 Running the App

### Start Both Frontend and Backend (Recommended)
```bash
npm start
```
This runs concurrently:
- **Backend API**: `http://localhost:5000` (yt-dlp and FFmpeg discovery)
- **Frontend App**: `http://localhost:5173` (Vite + React)

### Or Run Separately
```bash
# Terminal 1: Backend server
npm run server

# Terminal 2: Vite dev client
npm run dev
```

Visit **[http://localhost:5173/](http://localhost:5173/)** in your browser.
