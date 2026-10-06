const https = require('https');
const crypto = require('crypto');

const META_PIXEL_ID = '1483479293829689';
const META_CAPI_TOKEN = 'EAGVccZABOaOABSgREnJIl0ZBZBhy3wMRXpWGAutZBhaqKMI6sIIYhY3bCv7obc4yZChH17XujjJyyqso1F7AYPMVZAkwZAoLurHrPiHgBEaZCZA3JgWzk3CSsHRdx3e8Vc3V6h3ZCGhRCUZCmYFZBGae8D7zZA1ddDjknIaAXcURJUwOWx60lf8aNYZAmAk9ZBt7z0zRAbC3wZDZD';

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
    const lead = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const eventTime = Math.floor(Date.now() / 1000);
    const eventId = lead.event_id || ('sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));

    const userData = {
      client_user_agent: req.headers['user-agent'] || ''
    };

    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
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

    const payloadObj = {
      data: [
        {
          event_name: 'Subscribe',
          event_time: eventTime,
          event_id: eventId,
          action_source: 'website',
          event_source_url: req.headers['referer'] || 'https://weblithform.vercel.app/form',
          user_data: userData,
          custom_data: {
            content_name: lead.website_type || 'Website Inquiry',
            currency: 'INR',
            value: 0
          }
        }
      ]
    };

    const testCode = lead.test_event_code || 'TEST50055';
    if (testCode) {
      payloadObj.test_event_code = testCode;
    }

    const payload = JSON.stringify(payloadObj);

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

    const metaRes = await new Promise((resolve, reject) => {
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

    return res.status(200).json({ success: true, meta: metaRes });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
