const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const BASE_DIR = __dirname;

const META_PIXEL_ID = '1483479293829689';
const META_CAPI_TOKEN = 'EAGVccZABOaOABSgREnJIl0ZBZBhy3wMRXpWGAutZBhaqKMI6sIIYhY3bCv7obc4yZChH17XujjJyyqso1F7AYPMVZAkwZAoLurHrPiHgBEaZCZA3JgWzk3CSsHRdx3e8Vc3V6h3ZCGhRCUZCmYFZBGae8D7zZA1ddDjknIaAXcURJUwOWx60lf8aNYZAmAk9ZBt7z0zRAbC3wZDZD';

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

function hashSha256(val) {
  if (!val) return null;
  return crypto.createHash('sha256').update(String(val).trim().toLowerCase()).digest('hex');
}

function normalizePhone(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) digits = '91' + digits;
  return hashSha256(digits);
}

function sendMetaCapiSubscribe(lead, req) {
  return new Promise((resolve, reject) => {
    const eventTime = Math.floor(Date.now() / 1000);
    const eventId = lead.event_id || ('sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));

    const userData = {
      client_user_agent: req.headers['user-agent'] || ''
    };

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (clientIp && clientIp !== '::1' && clientIp !== '127.0.0.1') {
      userData.client_ip_address = clientIp.split(',')[0].trim();
    }

    if (lead.email) {
      const em = hashSha256(lead.email);
      if (em) userData.em = [em];
    }

    const rawPhone = lead.whatsapp || lead.phone;
    if (rawPhone) {
      const ph = normalizePhone(rawPhone);
      if (ph) userData.ph = [ph];
    }

    if (lead.name) {
      const firstName = lead.name.split(' ')[0];
      const fn = hashSha256(firstName);
      if (fn) userData.fn = [fn];
    }

    const payload = JSON.stringify({
      data: [
        {
          event_name: 'Subscribe',
          event_time: eventTime,
          event_id: eventId,
          action_source: 'website',
          event_source_url: req.headers['referer'] || 'http://localhost:3000/form',
          user_data: userData,
          custom_data: {
            content_name: lead.website_type || 'Website Inquiry',
            currency: 'INR',
            value: 0
          }
        }
      ]
    });

    const options = {
      hostname: 'graph.facebook.com',
      port: 443,
      path: `/v19.0/${META_PIXEL_ID}/events?access_token=${META_CAPI_TOKEN}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const fbReq = https.request(options, fbRes => {
      let data = '';
      fbRes.on('data', chunk => { data += chunk; });
      fbRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch {
          resolve({ raw: data });
        }
      });
    });

    fbReq.on('error', err => {
      console.error('Meta CAPI Request Error:', err);
      resolve({ error: err.message });
    });

    fbReq.write(payload);
    fbReq.end();
  });
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);

  // Conversions API endpoint
  if (req.method === 'POST' && reqPath === '/api/subscribe') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const lead = JSON.parse(body || '{}');
        const metaRes = await sendMetaCapiSubscribe(lead, req);
        console.log('Meta CAPI Subscribe Result:', metaRes);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, meta: metaRes }));
      } catch (err) {
        console.error('Error in /api/subscribe:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Route aliases
  if (reqPath === '/' || reqPath === '/form') {
    reqPath = '/form.html';
  } else if (reqPath === '/admin') {
    reqPath = '/admin.html';
  }

  const filePath = path.join(BASE_DIR, reqPath);

  // Security check: ensure path is within BASE_DIR
  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied');
    return;
  }

  // Check if file exists as requested
  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      return serveFile(filePath, res);
    }

    // Try appending .html for clean URLs (e.g. /form -> /form.html)
    const htmlPath = filePath + '.html';
    fs.stat(htmlPath, (htmlErr, htmlStats) => {
      if (!htmlErr && htmlStats.isFile()) {
        return serveFile(htmlPath, res);
      }

      res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
      res.end('<h1>404 Not Found</h1><p><a href="/form">Go to Lead Form</a></p>');
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/ (Form) and http://localhost:${PORT}/admin (Admin)`);
  console.log(`Meta Conversions API active for Pixel/Dataset: ${META_PIXEL_ID} (Event: Subscribe)`);
});
