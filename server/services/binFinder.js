import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

let cachedPaths = null;

export function findBinaries() {
  if (cachedPaths) return cachedPaths;

  let ytdlpPath = 'yt-dlp';
  let ffmpegPath = 'ffmpeg';
  let ffmpegDir = '';

  const userHome = os.homedir();
  const wingetPkgDir = path.join(userHome, 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages');

  // Check Winget yt-dlp path
  if (fs.existsSync(wingetPkgDir)) {
    try {
      const items = fs.readdirSync(wingetPkgDir);
      for (const item of items) {
        if (item.toLowerCase().includes('yt-dlp.yt-dlp')) {
          const candidate = path.join(wingetPkgDir, item, 'yt-dlp.exe');
          if (fs.existsSync(candidate)) {
            ytdlpPath = candidate;
          }
        }
        if (item.toLowerCase().includes('ffmpeg')) {
          const candidateDir = path.join(wingetPkgDir, item);
          // Recursively find ffmpeg.exe inside
          const findFfmpeg = (dir) => {
            const subitems = fs.readdirSync(dir, { withFileTypes: true });
            for (const sub of subitems) {
              const full = path.join(dir, sub.name);
              if (sub.isDirectory()) {
                const found = findFfmpeg(full);
                if (found) return found;
              } else if (sub.name.toLowerCase() === 'ffmpeg.exe') {
                return full;
              }
            }
            return null;
          };
          const found = findFfmpeg(candidateDir);
          if (found) {
            ffmpegPath = found;
            ffmpegDir = path.dirname(found);
          }
        }
      }
    } catch (e) {
      console.warn('Error scanning winget packages dir:', e.message);
    }
  }

  // If not found in winget, check if in PATH
  if (ytdlpPath === 'yt-dlp') {
    try {
      execSync('yt-dlp --version', { stdio: 'ignore' });
    } catch {
      // not in default path
    }
  }
  if (ffmpegPath === 'ffmpeg') {
    try {
      execSync('ffmpeg -version', { stdio: 'ignore' });
    } catch {
      // not in default path
    }
  }

  cachedPaths = {
    ytdlp: ytdlpPath,
    ffmpeg: ffmpegPath,
    ffmpegDir: ffmpegDir
  };

  console.log('Discovered media tool binaries:', cachedPaths);
  return cachedPaths;
}
