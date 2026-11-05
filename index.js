/**
 * Host half of session-cwd-opener.
 * Serves POST /session-cwd-opener/open as a fallback opener when the
 * official open-in-app routes are unavailable. Security mirrors
 * dsh-host-open-in-app: connection trust fence first, then bounded JSON
 * body, absolute-path + isDirectory checks, then a detached file-manager
 * launch (explorer / open / xdg-open).
 */
import { isAbsolute } from 'node:path';
import { stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { platform } from 'node:os';

export const name = 'session-cwd-opener';
export const inject = ['webServer', 'connection', 'workspaceRegistry'];

const OPEN_PATH = '/session-cwd-opener/open';
const WORKSPACES_PATH = '/session-cwd-opener/workspaces';
const MAX_BODY_BYTES = 64 * 1024;

function connectionOf(ctx) {
  return ctx.connection ?? ctx.get?.('connection');
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(payload));
}

async function readBoundedBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.byteLength;
    if (size > MAX_BODY_BYTES) {
      req.resume();
      return null;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, size).toString('utf8');
}

function launchFileManager(path) {
  return new Promise((resolve) => {
    let cmd;
    let args;
    const p = platform();
    if (p === 'win32') {
      cmd = 'explorer.exe';
      args = [path];
    } else if (p === 'darwin') {
      cmd = 'open';
      args = [path];
    } else {
      cmd = 'xdg-open';
      args = [path];
    }
    try {
      const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
      child.on('error', () => resolve(false));
      child.unref();
      // Give the OS a moment; explorer/open rarely fails synchronously.
      setTimeout(() => resolve(true), 300);
    } catch {
      resolve(false);
    }
  });
}

function workspaceRegistryOf(ctx) {
  return ctx.workspaceRegistry ?? ctx.get?.('workspaceRegistry');
}

export function apply(ctx, _config) {
  ctx.effect(
    () =>
      ctx.webServer.register(
        {
          kind: 'exact',
          path: WORKSPACES_PATH,
          handler: async (req, res) => {
            try {
              const rejection = connectionOf(ctx)?.requestRejection?.(req);
              if (rejection !== undefined) {
                res.statusCode = rejection;
                res.end();
                return;
              }
            } catch {
              sendJson(res, 403, { code: 'forbidden', message: 'rejected' });
              return;
            }
            if (req.method !== 'GET') {
              res.statusCode = 405;
              res.setHeader('allow', 'GET');
              res.end();
              return;
            }
            let items = [];
            try {
              const list = workspaceRegistryOf(ctx)?.list?.() ?? [];
              items = (Array.isArray(list) ? list : []).map((w) => ({
                id: typeof w.workspaceId === 'string' ? w.workspaceId : String(w.workspaceId ?? ''),
                path: typeof w.path === 'string' ? w.path : '',
                title: typeof w.title === 'string' ? w.title : '',
                sessionIds: Array.isArray(w.sessionIds) ? w.sessionIds.filter((v) => typeof v === 'string') : [],
              }));
            } catch {
              items = [];
            }
            sendJson(res, 200, { workspaces: items });
          },
        },
        'session-cwd-opener: GET /session-cwd-opener/workspaces',
      ),
  );
  ctx.effect(
    () =>
      ctx.webServer.register(
        {
          kind: 'exact',
          path: OPEN_PATH,
          handler: async (req, res) => {
            try {
              const rejection = connectionOf(ctx)?.requestRejection?.(req);
              if (rejection !== undefined) {
                res.statusCode = rejection;
                res.end();
                return;
              }
            } catch {
              // If the fence itself fails, refuse rather than open.
              sendJson(res, 403, { code: 'forbidden', message: 'rejected' });
              return;
            }
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('allow', 'POST');
              res.end();
              return;
            }
            if (String(req.headers['content-type']).split(';', 1)[0]?.trim().toLowerCase() !== 'application/json') {
              sendJson(res, 415, { code: 'unsupported-media-type', message: 'content-type must be application/json' });
              return;
            }
            let text;
            try {
              text = await readBoundedBody(req);
            } catch {
              sendJson(res, 400, { code: 'bad-request', message: 'request body unreadable' });
              return;
            }
            if (text === null) {
              sendJson(res, 413, { code: 'payload-too-large', message: 'request body is too large' });
              return;
            }
            let body;
            try {
              body = JSON.parse(text);
            } catch {
              body = null;
            }
            const path = body && typeof body === 'object' ? body.path : undefined;
            if (typeof path !== 'string' || path === '' || !isAbsolute(path)) {
              sendJson(res, 400, { code: 'bad-request', message: 'path must be an absolute directory path' });
              return;
            }
            let isDir = false;
            try {
              isDir = (await stat(path)).isDirectory();
            } catch {
              isDir = false;
            }
            if (!isDir) {
              sendJson(res, 404, { code: 'not-found', message: `directory does not exist: ${path}` });
              return;
            }
            const ok = await launchFileManager(path);
            if (ok) sendJson(res, 200, { ok: true });
            else sendJson(res, 502, { code: 'launch-failed', message: `failed to open ${path}` });
          },
        },
        'session-cwd-opener: POST /session-cwd-opener/open',
      ),
  );
}
