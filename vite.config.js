import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function localJsonStoragePlugin() {
  const jsonPath = path.resolve(__dirname, 'hotel_data.json');
  return {
    name: 'local-json-storage',
    configureServer(server) {
      server.middlewares.use('/api/save-hotel-json', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              fs.writeFileSync(jsonPath, body, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, path: jsonPath }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end('Method Not Allowed');
        }
      });

      server.middlewares.use('/api/load-hotel-json', (req, res) => {
        if (req.method === 'GET') {
          if (fs.existsSync(jsonPath)) {
            const data = fs.readFileSync(jsonPath, 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.end(data);
          } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ success: false, message: 'No file' }));
          }
        } else {
          res.statusCode = 405;
          res.end('Method Not Allowed');
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localJsonStoragePlugin()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
  },
});
