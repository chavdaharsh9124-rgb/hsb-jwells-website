const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { exec } = require('child_process');

let PORT = parseInt(process.env.PORT, 10) || 3000;
const ROOT = path.resolve(__dirname);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const COMPRESSIBLE = new Set([
  'text/html; charset=utf-8',
  'text/css; charset=utf-8',
  'application/javascript; charset=utf-8',
  'application/json; charset=utf-8',
  'image/svg+xml',
  'text/plain; charset=utf-8',
  'application/xml'
]);

// Maximum Enterprise Security Headers
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Content-Security-Policy': "default-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; media-src 'self' blob: data:; connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://*.googletagmanager.com; frame-ancestors 'self';"
};

const server = http.createServer((req, res) => {
  // Method Guard: Reject unsafe HTTP methods
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    res.writeHead(405, Object.assign({}, SECURITY_HEADERS, { 'Content-Type': 'text/plain' }));
    res.end('405 Method Not Allowed');
    return;
  }

  // Pre-flight OPTIONS handling
  if (req.method === 'OPTIONS') {
    res.writeHead(204, Object.assign({}, SECURITY_HEADERS, { 'Allow': 'GET, HEAD, OPTIONS' }));
    res.end();
    return;
  }

  // Clean URL and sanitize against encoding exploits
  let parsedUrl = req.url.split('?')[0].split('#')[0];
  try {
    parsedUrl = decodeURIComponent(parsedUrl);
  } catch (e) {
    res.writeHead(400, Object.assign({}, SECURITY_HEADERS, { 'Content-Type': 'text/plain' }));
    res.end('400 Bad Request');
    return;
  }

  if (parsedUrl === '/' || parsedUrl === '') {
    parsedUrl = '/index.html';
  }

  // Strict Path Traversal Defense
  const safePath = path.normalize(parsedUrl).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.resolve(ROOT, '.' + safePath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, Object.assign({}, SECURITY_HEADERS, { 'Content-Type': 'text/plain' }));
    res.end('403 Forbidden: Path Traversal Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const notFoundPath = path.join(ROOT, '404.html');
      if (fs.existsSync(notFoundPath)) {
        res.writeHead(404, Object.assign({}, SECURITY_HEADERS, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache'
        }));
        fs.createReadStream(notFoundPath).pipe(res);
      } else {
        res.writeHead(404, Object.assign({}, SECURITY_HEADERS, { 'Content-Type': 'text/plain' }));
        res.end('404 Not Found');
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Intelligent Browser Caching Optimization
    let cacheControl = 'public, max-age=3600';
    if (ext === '.html') {
      cacheControl = 'public, max-age=0, must-revalidate';
    } else if (['.jpg', '.jpeg', '.png', '.webp', '.svg', '.mp4', '.webm', '.woff2'].includes(ext)) {
      cacheControl = 'public, max-age=604800, immutable';
    } else if (['.css', '.js'].includes(ext)) {
      cacheControl = 'public, max-age=86400, stale-while-revalidate=604800';
    }

    // Video Streaming: Range Request Support (HTTP 206)
    const range = req.headers.range;
    if (range && (ext === '.mp4' || ext === '.webm')) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = (end - start) + 1;

      const headers = Object.assign({}, SECURITY_HEADERS, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Cache-Control': cacheControl
      });

      res.writeHead(206, headers);
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    // Gzip Compression Optimization for Text/CSS/JS/HTML
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const shouldCompress = COMPRESSIBLE.has(contentType) && stats.size > 512;

    if (shouldCompress && acceptEncoding.includes('gzip')) {
      const headers = Object.assign({}, SECURITY_HEADERS, {
        'Content-Type': contentType,
        'Content-Encoding': 'gzip',
        'Vary': 'Accept-Encoding',
        'Cache-Control': cacheControl
      });

      res.writeHead(200, headers);
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      const raw = fs.createReadStream(filePath);
      const gzip = zlib.createGzip({ level: 6 });
      raw.pipe(gzip).pipe(res);
    } else {
      const headers = Object.assign({}, SECURITY_HEADERS, {
        'Content-Length': stats.size,
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
        'Accept-Ranges': 'bytes'
      });

      res.writeHead(200, headers);
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

function startServer(portToTry) {
  server.listen(portToTry, () => {
    const url = `http://localhost:${portToTry}`;
    console.log(`\n======================================================`);
    console.log(`  HSB Jewells High-Performance & Hardened Server LIVE!`);
    console.log(`  Local URL: ${url}`);
    console.log(`  Security Headers & Gzip Compression: ENABLED`);
    console.log(`======================================================\n`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    PORT++;
    startServer(PORT);
  } else {
    console.error('Server error:', err);
  }
});

startServer(PORT);
