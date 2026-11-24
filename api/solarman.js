/**
 * @module api/solarman
 * Serverless CORS-free proxy for Solarman PV Open API v1.0.
 * Compatible with Vercel Serverless Functions and local Vite dev middleware.
 */

const BASE_URLS = {
  global: 'https://globalapi.solarmanpv.com',
  intl: 'https://api.solarmanpv.com',
};

export const MAX_BODY_BYTES = 64 * 1024; // 64 KB

export const ALLOWED_ACTIONS = new Set([
  'token',
  'stations',
  'stationRealTime',
  'stationDevices',
  'deviceCurrentData',
  'stationHistory',
  'deviceHistorical',
]);

function isSha256Hex(str) {
  return typeof str === 'string' && /^[a-f0-9]{64}$/i.test(str.trim());
}

const UPSTREAM_TIMEOUT_MS = 15000;

async function fetchWithTimeout(url, options = {}, timeoutMs = UPSTREAM_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await globalThis.fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado al conectar con el servidor remoto (15s).');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve allowed CORS origin (never wildcard `*`).
 * @param {string|undefined} requestOrigin
 * @param {string|undefined} requestHost
 * @returns {string|null}
 */
export function resolveAllowedOrigin(requestOrigin, requestHost) {
  if (!requestOrigin) return null;

  const configured = (process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (configured.includes(requestOrigin)) {
    return requestOrigin;
  }

  try {
    const parsed = new URL(requestOrigin);
    if (requestHost && parsed.host === requestHost) {
      return requestOrigin;
    }
    if (
      process.env.NODE_ENV !== 'production' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      return requestOrigin;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Verify a Supabase user JWT against Supabase Auth `/auth/v1/user`.
 * @param {string|undefined} authHeader
 * @returns {Promise<{ ok: boolean, status?: number, msg?: string, user?: Object }>}
 */
export async function verifySupabaseJwt(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') {
    return { ok: false, status: 401, msg: 'Autenticación de Supabase requerida.' };
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1]) {
    return { ok: false, status: 401, msg: 'Encabezado Authorization inválido.' };
  }
  const jwt = match[1].trim();

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, status: 500, msg: 'Falta configuración de Supabase en el servidor proxy.' };
  }

  try {
    const res = await fetchWithTimeout(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${jwt}`,
      },
    });
    if (!res.ok) {
      return { ok: false, status: 401, msg: 'Sesión de Supabase inválida o expirada.' };
    }
    const user = await res.json().catch(() => null);
    if (!user?.id) {
      return { ok: false, status: 401, msg: 'Usuario de Supabase no válido.' };
    }
    return { ok: true, user };
  } catch {
    return { ok: false, status: 502, msg: 'No se pudo validar la sesión con Supabase.' };
  }
}

/**
 * Core handler logic shared between Vercel Serverless Function and Vite local middleware.
 * Ignores any client-supplied appId, appSecret, or plaintext password.
 * @param {Object} body - Parsed JSON request payload
 * @returns {Promise<{ status: number, data: Object }>}
 */
export async function processSolarmanRequest(body = {}) {
  const {
    action,
    region = 'global',
    language = 'en',
    token,
    email,
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
  } = body || {};

  if (!action || typeof action !== 'string' || !ALLOWED_ACTIONS.has(action)) {
    return {
      status: 400,
      data: { success: false, msg: `Acción no permitida: ${String(action || '')}` },
    };
  }

  const baseUrl = BASE_URLS[region] || BASE_URLS.global;
  const resolvedAppId = (process.env.SOLARMAN_APP_ID || '').trim();
  const resolvedAppSecret = (process.env.SOLARMAN_APP_SECRET || '').trim();

  try {
    switch (action) {
      case 'token': {
        if (!email || !isSha256Hex(passwordSha256)) {
          return {
            status: 400,
            data: {
              success: false,
              msg: 'Se requiere correo electrónico y contraseña cifrada (SHA-256) de la cuenta Solarman.',
            },
          };
        }

        if (!resolvedAppId || !resolvedAppSecret) {
          return {
            status: 500,
            data: {
              success: false,
              code: 'MISSING_APP_CREDENTIALS',
              msg: 'El servidor no tiene configuradas SOLARMAN_APP_ID y SOLARMAN_APP_SECRET.',
            },
          };
        }

        const pwdHash = passwordSha256.trim().toLowerCase();
        const url = new URL(`${baseUrl}/account/v1.0/token`);
        url.searchParams.set('appId', resolvedAppId);
        url.searchParams.set('language', language);

        const payload = {
          appSecret: resolvedAppSecret,
          email: String(email).trim(),
          password: pwdHash,
        };
        if (orgId) {
          payload.orgId = Number(orgId) || orgId;
        }

        const res = await fetchWithTimeout(url.toString(), {
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

        const res = await fetchWithTimeout(url.toString(), {
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

        const res = await fetchWithTimeout(url.toString(), {
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

        const res = await fetchWithTimeout(url.toString(), {
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

        const res = await fetchWithTimeout(url.toString(), {
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

        const res = await fetchWithTimeout(url.toString(), {
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

        const res = await fetchWithTimeout(url.toString(), {
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
  const allowedOrigin = resolveAllowedOrigin(req.headers?.origin, req.headers?.host);
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    if (req.headers?.origin && !allowedOrigin) {
      return res.status(403).json({ success: false, msg: 'Origen no permitido.' });
    }
    return res.status(200).end();
  }

  if (req.headers?.origin && !allowedOrigin) {
    return res.status(403).json({ success: false, msg: 'Origen no permitido.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, msg: 'Method Not Allowed. Use POST.' });
  }

  const contentLength = Number(req.headers?.['content-length'] || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return res.status(413).json({ success: false, msg: 'Payload excede el límite de 64 KB.' });
  }

  let parsedBody = req.body;
  if (typeof parsedBody === 'string') {
    if (Buffer.byteLength(parsedBody, 'utf8') > MAX_BODY_BYTES) {
      return res.status(413).json({ success: false, msg: 'Payload excede el límite de 64 KB.' });
    }
    try {
      parsedBody = JSON.parse(parsedBody);
    } catch {
      return res.status(400).json({ success: false, msg: 'JSON inválido.' });
    }
  } else if (parsedBody && Buffer.byteLength(JSON.stringify(parsedBody), 'utf8') > MAX_BODY_BYTES) {
    return res.status(413).json({ success: false, msg: 'Payload excede el límite de 64 KB.' });
  }

  const authCheck = await verifySupabaseJwt(req.headers?.authorization);
  if (!authCheck.ok) {
    return res.status(authCheck.status || 401).json({ success: false, msg: authCheck.msg });
  }

  const result = await processSolarmanRequest(parsedBody || {});
  return res.status(result.status).json(result.data);
}
