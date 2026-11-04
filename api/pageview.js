const https = require('https');

const META_PIXEL_ID = '1462211845727559';
const BACKUP_PIXEL_ID = '1483479293829689';
const META_CAPI_TOKEN = 'EAAdOWKUvli0BSxNl3ViX2mT1ZAqhPUslq087q43WH75VHSrvFlFm7LQPH9GpuJN0uskxS8xc8HII23DDFpaY3KKztkwhBRjR8zCtWPYiTkLfZC2I2KuCJZCh5ZCWeRfsuwamsoSg0Qvyp5rzWk6KZAd7cJejHtAB8duZAZA8a4TEzdsSEUDp9uQJiejAKNa2QZDZD';

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

    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    if (clientIp && clientIp !== '::1' && clientIp !== '127.0.0.1') {
      userData.client_ip_address = clientIp.split(',')[0].trim();
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

    const testCode = body.test_event_code || 'TEST50055';
    if (testCode) {
      payloadObj.test_event_code = testCode;
    }

    const payload = JSON.stringify(payloadObj);

    const [primaryRes, backupRes] = await Promise.all([
      postToMetaCapi(META_PIXEL_ID, payload),
      postToMetaCapi(BACKUP_PIXEL_ID, payload)
    ]);

    return res.status(200).json({
      success: true,
      event_id: eventId,
      meta: { primary: primaryRes, backup: backupRes }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

