const { app, BrowserWindow, session } = require('electron');
const http = require('http');
const path = require('path');
const fs = require('fs');
const serveHandler = require('serve-handler');

const BUILD_DIR = path.join(__dirname, '..', 'build');
const HEADERS = {
  'Cache-Control': 'no-cache',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

function ensureBuildExists() {
  if (!fs.existsSync(BUILD_DIR)) {
    throw new Error(
      `Build folder not found at ${BUILD_DIR}. Run "npm run build" first.`,
    );
  }
}

function withHeaders(res) {
  Object.entries(HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
}

function uniqueDownloadPath(dir, fileName) {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let candidate = path.join(dir, fileName);
  let index = 1;

  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${base} (${index})${ext}`);
    index += 1;
  }

  return candidate;
}

function startStaticServer() {
  ensureBuildExists();

  const server = http.createServer((req, res) => {
    withHeaders(res);

    if (req.url === '/editor') {
      res.statusCode = 302;
      res.setHeader('Location', '/');
      res.end();
      return;
    }

    serveHandler(req, res, {
      public: BUILD_DIR,
      cleanUrls: false,
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

async function createWindow() {
  const { port } = await startStaticServer();

  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });

  session.defaultSession.on('will-download', (event, item) => {
    const downloadsDir = app.getPath('downloads');
    const fileName = item.getFilename();
    item.setSavePath(uniqueDownloadPath(downloadsDir, fileName));
  });

  await win.loadURL(`http://127.0.0.1:${port}/`);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
