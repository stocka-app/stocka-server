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

export function buildPopupHtmlResponse(accessToken: string, frontendOrigin: string): string {
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
