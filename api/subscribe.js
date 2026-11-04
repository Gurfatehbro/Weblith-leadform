const https = require('https');
const crypto = require('crypto');

const META_PIXEL_ID = '3753260524823160';
const BACKUP_PIXEL_ID = '1462211845727559';
const META_CAPI_TOKEN = 'EAAdOWKUvli0BSxNl3ViX2mT1ZAqhPUslq087q43WH75VHSrvFlFm7LQPH9GpuJN0uskxS8xc8HII23DDFpaY3KKztkwhBRjR8zCtWPYiTkLfZC2I2KuCJZCh5ZCWeRfsuwamsoSg0Qvyp5rzWk6KZAd7cJejHtAB8duZAZA8a4TEzdsSEUDp9uQJiejAKNa2QZDZD';

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

function parseBudget(budgetStr) {
  if (!budgetStr) return 3000;
  const numbers = String(budgetStr).replace(/,/g, '').match(/\d+/g);
  if (numbers && numbers.length > 0) {
    const val = parseInt(numbers[0], 10);
    return isNaN(val) || val <= 0 ? 3000 : val;
  }
  return 3000;
}

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
    const lead = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const eventTime = Math.floor(Date.now() / 1000);
    const subscribeEventId = lead.event_id || ('sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));

    const userData = {
      client_user_agent: req.headers['user-agent'] || ''
    };

    const clientIp = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || '').split(',')[0].trim();
    if (clientIp && clientIp !== '::1' && clientIp !== '127.0.0.1') {
      userData.client_ip_address = clientIp;
    }

    if (lead.fbp) {
      userData.fbp = lead.fbp;
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)_fbp=([^;]+)/);
      if (match) userData.fbp = decodeURIComponent(match[1]);
    }

    if (lead.fbc) {
      userData.fbc = lead.fbc;
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)_fbc=([^;]+)/);
      if (match) userData.fbc = decodeURIComponent(match[1]);
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

    // Subscribe event only
    const payloadObj = {
      data: [
        {
          event_name: 'Subscribe',
          event_time: eventTime,
          event_id: subscribeEventId,
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

    // Send to primary pixel (1462211845727559) and backup pixel (1483479293829689)
    const [primaryRes, backupRes] = await Promise.all([
      postToMetaCapi(META_PIXEL_ID, payload),
      postToMetaCapi(BACKUP_PIXEL_ID, payload)
    ]);

    return res.status(200).json({
      success: true,
      meta_primary: primaryRes,
      meta_backup: backupRes
    });
  } catch (err) {
    console.error('Meta CAPI Handler Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
