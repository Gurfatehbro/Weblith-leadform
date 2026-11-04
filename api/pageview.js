const https = require('https');

const META_PIXEL_ID = '3753260524823160';
const META_CAPI_TOKEN = 'EAAdOWKUvli0BSwqLbmQeL5GdcAxZCcDQgqaCxwiFLvRkZA8vi6yAwoeXuJ0McL8Wghfa767yOtKZBZBWH7Uq82DCjamoisWFwwTWeBj6D9L3QFNaOHgb20r3B8wQpVwaQcttLtGmOeFqmUIMNCD9MyUwzoItNugjXRfiw64afGPWK80jZCd5b5tDUZBLk5aQZDZD';

function postToMetaCapi(pixelId, payload) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'graph.facebook.com',
      port: 443,
      path: `/v19.0/${pixelId}/events?access_token=${META_CAPI_TOKEN}`,
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
          resolve(JSON.parse(data));
        } catch {
          resolve({ raw: data });
        }
      });
    });

    fbReq.on('error', err => resolve({ error: err.message }));
    fbReq.write(payload);
    fbReq.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const eventTime = Math.floor(Date.now() / 1000);
    const eventId = body.event_id || ('pv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));

    const userData = {
      client_user_agent: req.headers['user-agent'] || ''
    };

    const clientIp = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || '').split(',')[0].trim();
    if (clientIp && clientIp !== '::1' && clientIp !== '127.0.0.1') {
      userData.client_ip_address = clientIp;
    }

    if (body.fbp) {
      userData.fbp = body.fbp;
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)_fbp=([^;]+)/);
      if (match) userData.fbp = decodeURIComponent(match[1]);
    }

    if (body.fbc) {
      userData.fbc = body.fbc;
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)_fbc=([^;]+)/);
      if (match) userData.fbc = decodeURIComponent(match[1]);
    }

    const payloadObj = {
      data: [
        {
          event_name: 'PageView',
          event_time: eventTime,
          event_id: eventId,
          action_source: 'website',
          event_source_url: req.headers['referer'] || body.url || 'https://weblithform.vercel.app/form',
          user_data: userData
        }
      ]
    };

    const testCode = body.test_event_code;
    if (testCode && testCode !== 'TEST50055') {
      payloadObj.test_event_code = testCode;
    }

    const payload = JSON.stringify(payloadObj);

    const primaryRes = await postToMetaCapi(META_PIXEL_ID, payload);

    return res.status(200).json({
      success: true,
      event_id: eventId,
      meta: primaryRes
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

