const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function parseProxyTarget(value) {
  if (!value) return null;
  try {
    const u = new URL(value);
    return {
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? '443' : '80'),
      base: `${u.protocol}//${u.host}`
    };
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--port' || a === '-p') {
      out.port = argv[i + 1];
      i++;
      continue;
    }
    if (a === '--root' || a === '-r') {
      out.root = argv[i + 1];
      i++;
      continue;
    }
    if (a === '--proxy-oldapi') {
      out.proxyOldApi = argv[i + 1];
      i++;
      continue;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const defaultPort = Number(args.port || process.env.PORT || 8087);
const root = path.resolve(process.cwd(), args.root || process.env.ROOT || 'public');

const oldApiProxyTarget = parseProxyTarget(args.proxyOldApi || process.env.PROXY_OLDAPI || '');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function safeJoin(rootDir, urlPath) {
  const normalized = path.normalize(urlPath).replace(/^([/\\])+/, '');
  const joined = path.join(rootDir, normalized);
  if (!joined.startsWith(rootDir)) return null;
  return joined;
}

function openBrowser(url) {
  if (process.env.NO_BROWSER === '1' || process.env.NO_BROWSER === 'true') return;

  const platform = process.platform;
  const command =
    platform === 'win32' ? `start "" "${url}"` :
      platform === 'darwin' ? `open "${url}"` :
        `xdg-open "${url}"`;

  try {
    const child = spawn(command, {
      shell: true,
      detached: true,
      stdio: 'ignore',
    });

    // If spawning fails, Node will emit an 'error' event; without a listener
    // it can crash the process.
    child.on('error', () => { });
    child.unref();
  } catch {
    // Ignore failures (headless environments, locked-down systems, etc.)
  }
}

function proxyOldApi(req, res) {
  if (!oldApiProxyTarget) {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: false,
      message: 'OldAPI proxy target not configured. Start server with --proxy-oldapi http://HOST:PORT or set PROXY_OLDAPI.'
    }));
    return;
  }

  const upstream = oldApiProxyTarget.protocol === 'https:' ? https : http;
  const upstreamUrl = `${oldApiProxyTarget.base}${req.url}`;

  const headers = { ...req.headers };
  headers.host = `${oldApiProxyTarget.hostname}:${oldApiProxyTarget.port}`;

  const upstreamReq = upstream.request(
    upstreamUrl,
    {
      method: req.method,
      headers,
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 500, upstreamRes.headers);
      upstreamRes.pipe(res);
    }
  );

  upstreamReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: false,
      message: 'OldAPI proxy error',
      error: err?.message || String(err)
    }));
  });

  req.pipe(upstreamReq);
}

function createServer() {
  return http.createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];

    // Same-origin proxy for OldAPI to avoid CORS/Private Network Access blocks in browsers.
    if (url.startsWith('/api/OldAPI')) {
      proxyOldApi(req, res);
      return;
    }

    const rawPath = url === '/' ? '/index.html' : url;

    // Decode URL-encoded characters (e.g., spaces as %20) so paths map correctly
    // to the filesystem. If decoding fails (malformed URL), fall back to raw.
    let decodedPath = rawPath;
    try {
      decodedPath = decodeURIComponent(rawPath);
    } catch {
      decodedPath = rawPath;
    }

    let filePath = safeJoin(root, decodedPath);
    if (!filePath) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stat) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');

      fs.readFile(filePath, (readErr, data) => {
        if (readErr) {
          res.writeHead(500);
          res.end('Error');
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
  });
}

function startServer(startPort) {
  let port = startPort;
  const server = createServer();

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      if (nextPort > startPort + 50) {
        console.error(`Port ${port} is already in use, and no free port was found in the range ${startPort}-${startPort + 50}.`);
        console.error('Tip: pick a different port via PORT, e.g. PowerShell: $env:PORT=8090; npm run dev');
        process.exit(1);
      }

      console.warn(`Port ${port} is already in use. Retrying on ${nextPort}...`);
      // This server never successfully started listening, so closing can cause
      // ERR_SERVER_NOT_RUNNING on some Node versions. Just retry on a new port.
      startServer(nextPort);
      return;
    }

    console.error(err);
    process.exit(1);
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`Serving ${root} on ${url}`);
    if (oldApiProxyTarget) {
      console.log(`Proxying /api/OldAPI -> ${oldApiProxyTarget.base}/api/OldAPI`);
    }
    openBrowser(url);
  });
}

startServer(defaultPort);
