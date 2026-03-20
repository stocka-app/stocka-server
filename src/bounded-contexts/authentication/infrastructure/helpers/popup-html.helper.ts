import { Response } from 'express';

export const POPUP_OAUTH_MODE_COOKIE = 'oauth_mode';
export const POPUP_OAUTH_MODE_VALUE = 'popup';

const POPUP_OAUTH_MODE_COOKIE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

export function setPopupModeCookie(res: Response): void {
  res.cookie(POPUP_OAUTH_MODE_COOKIE, POPUP_OAUTH_MODE_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/authentication',
    maxAge: POPUP_OAUTH_MODE_COOKIE_MAX_AGE_MS,
  });
}

function buildPopupHtml(accessToken: string, frontendOrigin: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Completing sign-in…</title></head>
<body>
<script>
  (function () {
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: 'oauth-success', accessToken: '${accessToken}' },
          '${frontendOrigin}'
        );
      }
    } finally {
      window.close();
    }
  }());
</script>
</body>
</html>`;
}

/**
 * Sends the OAuth popup HTML response.
 *
 * Overrides Helmet's default CSP to allow the inline script that posts the
 * OAuth tokens to the parent window and closes the popup. The override is
 * scoped to this response only and uses the most restrictive policy possible:
 * no external resources, only inline scripts are permitted.
 */
export function sendPopupResponse(res: Response, accessToken: string, frontendOrigin: string): void {
  // Helmet sets "script-src 'self'" by default, which blocks inline scripts.
  // This specific HTML page contains only a self-contained inline script with
  // no external resources, so a narrow override is safe here.
  res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'");
  res.send(buildPopupHtml(accessToken, frontendOrigin));
}
