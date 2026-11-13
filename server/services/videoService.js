import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { findBinaries } from './binFinder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DOWNLOADS_DIR = path.resolve(__dirname, '..', 'downloads');

// Ensure downloads dir exists
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

// Helper to sanitize filenames
export function sanitizeFilename(name) {
  return name.replace(/[/\\?%*:|"<>]/g, '_').trim().slice(0, 100);
}

// Convert seconds or string (00:01:23) into clean seconds or string for yt-dlp
export function formatTimeForYtDlp(val) {
  if (typeof val === 'number') {
    const hours = Math.floor(val / 3600);
    const minutes = Math.floor((val % 3600) / 60);
    const seconds = Math.floor(val % 60);
    const ms = Math.round((val % 1) * 100);
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${ms > 0 ? '.' + ms : ''}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}${ms > 0 ? '.' + ms : ''}`;
  }
  return String(val).trim();
}

export function parseSeconds(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const parts = val.toString().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}

// Extract YouTube video ID
export function extractYouTubeId(url) {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export async function getVideoInfo(url) {
  const { ytdlp, ffmpegDir } = findBinaries();

  return new Promise((resolve, reject) => {
    const args = [
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
    ];

    if (ffmpegDir) {
      args.push('--ffmpeg-location', ffmpegDir);
    }

    args.push(url);

    let stdoutData = '';
    let stderrData = '';

    const proc = spawn(ytdlp, args, { shell: false });

    proc.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderrData || `yt-dlp exited with code ${code}`));
      }

      try {
        const info = JSON.parse(stdoutData);
        
        // Find best thumbnails
        let thumbnail = info.thumbnail;
        if (info.thumbnails && info.thumbnails.length > 0) {
          const highRes = info.thumbnails.find(t => t.id === 'maxresdefault' || t.width >= 1280);
          if (highRes) thumbnail = highRes.url;
        }

        // Available heights
        const availableHeights = new Set();
        if (info.formats) {
          info.formats.forEach(f => {
            if (f.height) availableHeights.add(f.height);
          });
        }
        const resolutions = Array.from(availableHeights).sort((a, b) => b - a);

        resolve({
          id: info.id,
          title: info.title,
          description: info.description ? info.description.slice(0, 300) : '',
          duration: info.duration || 0,
          thumbnail,
          uploader: info.uploader || info.channel || 'Unknown',
          viewCount: info.view_count || 0,
          resolutions,
          webpageUrl: info.webpage_url || url,
        });
      } catch (err) {
        reject(new Error(`Failed to parse video info: ${err.message}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to launch yt-dlp: ${err.message}`));
    });
  });
}

export function trimVideo({
  jobId,
  url,
  startTime,
  endTime,
  format = 'mp4',
  quality = 'best',
  title = 'clip',
  onProgress = () => {}
}) {
  const { ytdlp, ffmpegDir, ffmpeg } = findBinaries();

  const jobDir = path.join(DOWNLOADS_DIR, jobId);
  if (!fs.existsSync(jobDir)) {
    fs.mkdirSync(jobDir, { recursive: true });
  }

  const safeTitle = sanitizeFilename(title);
  const startStr = formatTimeForYtDlp(startTime);
  const endStr = formatTimeForYtDlp(endTime);

  const startLabel = startStr.replace(/:/g, '-');
  const endLabel = endStr.replace(/:/g, '-');
  const finalFilename = `${safeTitle}_[${startLabel}_to_${endLabel}].${format}`;
  const outputTemplate = path.join(jobDir, `output.%(ext)s`);

  return new Promise((resolve, reject) => {
    // Construct format argument
    let formatArg = 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best';
    if (format === 'mp3') {
      formatArg = 'bestaudio/best';
    } else if (quality !== 'best') {
      const q = parseInt(quality, 10);
      if (!isNaN(q)) {
        formatArg = `bv*[height<=${q}][ext=mp4]+ba[ext=m4a]/b[height<=${q}][ext=mp4]/best`;
      }
    }

    const sectionArg = `*${startStr}-${endStr}`;

    const args = [
      '--download-sections', sectionArg,
      '--force-keyframes-at-cuts',
      '--no-playlist',
      '--no-warnings',
      '--progress',
      '-o', outputTemplate,
    ];

    if (ffmpegDir) {
      args.push('--ffmpeg-location', ffmpegDir);
    }

    if (format === 'mp3') {
      args.push('-x', '--audio-format', 'mp3');
    } else if (format === 'gif') {
      // For GIF, download video segment as mp4 first then convert with ffmpeg
      args.push('-f', 'bv*[ext=mp4]/b[ext=mp4]/best');
    } else if (format === 'webm') {
      args.push('-f', 'bv*[ext=webm]+ba[ext=webm]/b[ext=webm]/best');
    } else {
      args.push('-f', formatArg);
      args.push('--merge-output-format', 'mp4');
    }

    args.push(url);

    onProgress({ stage: 'starting', percent: 5, message: 'Initiating stream cut...' });

    const proc = spawn(ytdlp, args, { shell: false });
    let stderrLog = '';

    proc.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      // Parse progress: [download]  45.0% of ...
      const dlMatch = text.match(/\[download\]\s+([\d\.]+)%/);
      if (dlMatch) {
        const p = parseFloat(dlMatch[1]);
        const scaled = Math.min(85, Math.max(10, Math.round(p * 0.8)));
        onProgress({ stage: 'downloading', percent: scaled, message: `Downloading and trimming: ${p.toFixed(0)}%` });
      } else if (text.includes('[ExtractAudio]')) {
        onProgress({ stage: 'converting', percent: 90, message: 'Extracting MP3 audio...' });
      } else if (text.includes('[Merger]')) {
        onProgress({ stage: 'merging', percent: 88, message: 'Merging video & audio streams...' });
      }
    });

    proc.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderrLog += text;
      // FFmpeg frame= progress might appear in stderr
      const frameMatch = text.match(/frame=\s*(\d+)/);
      if (frameMatch) {
        onProgress({ stage: 'processing', percent: 92, message: 'Encoding precision keyframes...' });
      }
    });

    proc.on('close', async (code) => {
      if (code !== 0) {
        return reject(new Error(stderrLog || `yt-dlp exited with error code ${code}`));
      }

      try {
        // Find produced file in jobDir
        const files = fs.readdirSync(jobDir);
        let matchedFile = files.find(f => !f.endsWith('.part') && !f.endsWith('.ytdl'));

        if (!matchedFile) {
          return reject(new Error('No output file generated from trimming.'));
        }

        let fullOutputPath = path.join(jobDir, matchedFile);

        // If GIF was requested, convert mp4 to high quality gif with palettegen
        if (format === 'gif') {
          onProgress({ stage: 'gif', percent: 95, message: 'Rendering animated GIF...' });
          const gifPath = path.join(jobDir, 'clip.gif');
          await convertToGif(ffmpeg, fullOutputPath, gifPath);
          fs.unlinkSync(fullOutputPath);
          fullOutputPath = gifPath;
        }

        // Rename to clean final filename
        const finalPath = path.join(jobDir, finalFilename);
        if (fs.existsSync(finalPath)) {
          fs.unlinkSync(finalPath);
        }
        fs.renameSync(fullOutputPath, finalPath);

        const stats = fs.statSync(finalPath);

        onProgress({ stage: 'complete', percent: 100, message: 'Trim completed!' });
        resolve({
          jobId,
          filename: finalFilename,
          filePath: finalPath,
          size: stats.size,
          format,
        });
      } catch (err) {
        reject(err);
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to start trimming process: ${err.message}`));
    });
  });
}

function convertToGif(ffmpegPath, inputMp4, outputGif) {
  return new Promise((resolve, reject) => {
    // High-quality palettegen GIF filter: 480px width, 15fps
    const filter = 'fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse';
    const args = ['-y', '-i', inputMp4, '-vf', filter, outputGif];

    const proc = spawn(ffmpegPath, args);
    let errLog = '';
    proc.stderr.on('data', chunk => errLog += chunk.toString());
    proc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`GIF conversion failed: ${errLog}`));
    });
    proc.on('error', reject);
  });
}

// Auto-cleanup files older than 45 minutes
export function startCleanupTask() {
  setInterval(() => {
    try {
      const now = Date.now();
      const maxAge = 45 * 60 * 1000;
      const jobDirs = fs.readdirSync(DOWNLOADS_DIR);
      for (const dir of jobDirs) {
        const fullDir = path.join(DOWNLOADS_DIR, dir);
        const stat = fs.statSync(fullDir);
        if (stat.isDirectory() && now - stat.mtimeMs > maxAge) {
          fs.rmSync(fullDir, { recursive: true, force: true });
          console.log(`Cleaned up expired job directory: ${dir}`);
        }
      }
    } catch (e) {
      console.error('Error during cleanup task:', e.message);
    }
  }, 10 * 60 * 1000);
}
