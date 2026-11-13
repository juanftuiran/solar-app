/**
 * @module api/solarman
 * Serverless CORS-free proxy for Solarman PV Open API v1.0.
 * Compatible with Vercel Serverless Functions and local Vite dev middleware.
 */

import crypto from 'node:crypto';

const BASE_URLS = {
  global: 'https://globalapi.solarmanpv.com',
  intl: 'https://api.solarmanpv.com',
};

function sha256Hex(input) {
  return crypto.createHash('sha256').update(String(input), 'utf8').digest('hex').toLowerCase();
}

function isSha256Hex(str) {
  return typeof str === 'string' && /^[a-f0-9]{64}$/i.test(str.trim());
}

/**
 * Core handler logic shared between Vercel Serverless Function and Vite local middleware.
 * @param {Object} body - Parsed JSON request payload
 * @returns {Promise<{ status: number, data: Object }>}
 */
export async function processSolarmanRequest(body = {}) {
  const {
    action,
    region = 'global',
    language = 'en',
    token,
    appId,
    appSecret,
    email,
    password,
    passwordSha256,
    orgId,
    stationId,
    deviceSn,
    deviceId,
    timeType,
    startTime,
    endTime,
    page = 1,
    size = 50,
  } = body;

  const baseUrl = BASE_URLS[region] || BASE_URLS.global;
  const resolvedAppId = (appId || process.env.SOLARMAN_APP_ID || process.env.VITE_SOLARMAN_APP_ID || '').trim();
  const resolvedAppSecret = (appSecret || process.env.SOLARMAN_APP_SECRET || process.env.VITE_SOLARMAN_APP_SECRET || '').trim();

  try {
    switch (action) {
      case 'token': {
        if (!email || (!password && !passwordSha256)) {
          return {
            status: 400,
            data: {
              success: false,
              msg: 'Se requiere correo electrónico y contraseña de la cuenta Solarman.',
            },
          };
        }

        if (!resolvedAppId || !resolvedAppSecret) {
          return {
            status: 400,
            data: {
              success: false,
              code: 'MISSING_APP_CREDENTIALS',
              msg: 'Solarman Open API requiere App ID y App Secret (ingrésalos en el formulario o configúralos en variables de entorno).',
            },
          };
        }

        const pwdHash = passwordSha256 && isSha256Hex(passwordSha256)
          ? passwordSha256.trim().toLowerCase()
          : isSha256Hex(password)
            ? password.trim().toLowerCase()
            : sha256Hex(password);

        const url = new URL(`${baseUrl}/account/v1.0/token`);
        url.searchParams.set('appId', resolvedAppId);
        url.searchParams.set('language', language);

        const payload = {
          appSecret: resolvedAppSecret,
          email: email.trim(),
          password: pwdHash,
        };
        if (orgId) {
          payload.orgId = Number(orgId) || orgId;
        }

        const res = await fetch(url.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        return { status: res.status || 200, data };
      }

      case 'stations': {
        if (!token) {
          return { status: 401, data: { success: false, msg: 'Missing Solarman access_token' } };
        }
        const url = new URL(`${baseUrl}/station/v1.0/list`);
        url.searchParams.set('language', language);

        const res = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `bearer ${token}`,
          },
          body: JSON.stringify({ page, size }),
        });
        const data = await res.json().catch(() => ({}));
        return { status: res.status || 200, data };
      }

      case 'stationRealTime': {
        if (!token || !stationId) {
          return { status: 400, data: { success: false, msg: 'Missing token or stationId' } };
        }
        const url = new URL(`${baseUrl}/station/v1.0/realTime`);
        url.searchParams.set('language', language);

        const res = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `bearer ${token}`,
          },
          body: JSON.stringify({ stationId: Number(stationId) || stationId }),
        });
        const data = await res.json().catch(() => ({}));
        return { status: res.status || 200, data };
      }

      case 'stationDevices': {
        if (!token || !stationId) {
          return { status: 400, data: { success: false, msg: 'Missing token or stationId' } };
        }
        const url = new URL(`${baseUrl}/station/v1.0/device`);
        url.searchParams.set('language', language);

        const res = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `bearer ${token}`,
          },
          body: JSON.stringify({ stationId: Number(stationId) || stationId }),
        });
        const data = await res.json().catch(() => ({}));
        return { status: res.status || 200, data };
      }

      case 'deviceCurrentData': {
        if (!token || (!deviceSn && !deviceId)) {
          return { status: 400, data: { success: false, msg: 'Missing token or deviceSn' } };
        }
        const url = new URL(`${baseUrl}/device/v1.0/currentData`);
        url.searchParams.set('language', language);

        const reqBody = {};
        if (deviceSn) reqBody.deviceSn = String(deviceSn).trim();
        if (deviceId) reqBody.deviceId = Number(deviceId) || deviceId;

        const res = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `bearer ${token}`,
          },
          body: JSON.stringify(reqBody),
        });
        const data = await res.json().catch(() => ({}));
        return { status: res.status || 200, data };
      }

      case 'stationHistory': {
        if (!token || !stationId || !startTime || !endTime) {
          return {
            status: 400,
            data: { success: false, msg: 'Missing token, stationId, startTime or endTime' },
          };
        }
        const url = new URL(`${baseUrl}/station/v1.0/history`);
        url.searchParams.set('language', language);

        const res = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `bearer ${token}`,
          },
          body: JSON.stringify({
            stationId: Number(stationId) || stationId,
            timeType: Number(timeType) || 1,
            startTime: String(startTime),
            endTime: String(endTime),
          }),
        });
        const data = await res.json().catch(() => ({}));
        return { status: res.status || 200, data };
      }

      case 'deviceHistorical': {
        if (!token || (!deviceSn && !deviceId) || !startTime || !endTime) {
          return {
            status: 400,
            data: { success: false, msg: 'Missing token, deviceSn/deviceId, startTime or endTime' },
          };
        }
        const url = new URL(`${baseUrl}/device/v1.0/historical`);
        url.searchParams.set('language', language);

        const reqBody = {
          timeType: Number(timeType) || 1,
          startTime: String(startTime),
          endTime: String(endTime),
        };
        if (deviceSn) reqBody.deviceSn = String(deviceSn).trim();
        if (deviceId) reqBody.deviceId = Number(deviceId) || deviceId;

        const res = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `bearer ${token}`,
          },
          body: JSON.stringify(reqBody),
        });
        const data = await res.json().catch(() => ({}));
        return { status: res.status || 200, data };
      }

      default:
        return {
          status: 400,
          data: { success: false, msg: `Acción no soportada: ${action}` },
        };
    }
  } catch (err) {
    return {
      status: 502,
      data: {
        success: false,
        msg: `Error de comunicación con Solarman Cloud: ${err.message || 'Network error'}`,
      },
    };
  }
}

/**
 * Default export for Vercel Serverless Functions (`/api/solarman`).
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, msg: 'Method Not Allowed. Use POST.' });
  }

  let parsedBody = req.body;
  if (typeof parsedBody === 'string') {
    try {
      parsedBody = JSON.parse(parsedBody);
    } catch {
      parsedBody = {};
    }
  }

  const result = await processSolarmanRequest(parsedBody || {});
  return res.status(result.status).json(result.data);
}
