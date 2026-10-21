// A tiny client for the public REST API of The Roofing List.
// Spec: https://mcp.theroofinglist.com/openapi.json

import { readFileSync } from 'node:fs';

export const DEFAULT_BASE_URL = 'https://mcp.theroofinglist.com';

export const VERSION = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
).version;

export class ApiError extends Error {
  constructor(status, message, retryAfter) {
    super(message);
    this.name = 'ApiError';
    this.status = status; // 0 means the request did not reach the API.
    this.retryAfter = retryAfter; // seconds, or undefined
  }
}

function baseUrl() {
  return (process.env.THEROOFINGLIST_API || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function parseRetryAfter(value) {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds));
  const date = Date.parse(value);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

async function request(path, fetchImpl = globalThis.fetch) {
  const url = baseUrl() + path;
  let res;
  try {
    res = await fetchImpl(url, {
      headers: {
        accept: 'application/json',
        'user-agent': `theroofinglist-cli/${VERSION}`,
      },
    });
  } catch (err) {
    const cause = err?.cause?.code || err?.cause?.message || err?.message || String(err);
    throw new ApiError(0, `Could not reach ${baseUrl()} (${cause}).`);
  }

  let body;
  try {
    body = await res.json();
  } catch {
    body = undefined;
  }

  if (!res.ok) {
    const message =
      body && typeof body.error === 'string' ? body.error : `The API answered HTTP ${res.status}.`;
    const retryAfter = res.status === 429 ? parseRetryAfter(res.headers.get('retry-after')) : undefined;
    throw new ApiError(res.status, message, retryAfter);
  }
  if (body === undefined) {
    throw new ApiError(res.status, 'The API sent a body that is not JSON.');
  }
  return body;
}

/** Search contractors. params: { trade, city, state, limit? }. Returns { contractors: [] }. */
export function searchContractors(params, fetchImpl) {
  const qs = new URLSearchParams();
  for (const key of ['trade', 'city', 'state', 'limit']) {
    if (params[key] !== undefined && params[key] !== null) qs.set(key, String(params[key]));
  }
  return request(`/v1/contractors?${qs}`, fetchImpl);
}

/** Get one contractor by id. Throws ApiError with status 404 when not listed. */
export function getContractor(id, fetchImpl) {
  return request(`/v1/contractors/${encodeURIComponent(String(id))}`, fetchImpl);
}
