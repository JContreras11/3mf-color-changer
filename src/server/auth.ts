export const AUTH_COOKIE_NAME = 'customcaps_session';
const AUTH_SESSION_TOKEN = 'customcaps-demo-session-v1';
const AUTH_USERNAME = 'customcaps';
const AUTH_PASSWORD = 'Atelier2026!';
const AUTH_DISPLAY_NAME = 'CustomCaps Studio';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

export function isValidSessionToken(value: string | undefined | null) {
  return value === AUTH_SESSION_TOKEN;
}

export function validateLoginCredentials(username: string, password: string) {
  return (
    username.trim().toLowerCase() === AUTH_USERNAME &&
    password === AUTH_PASSWORD
  );
}

export function createSessionCookie() {
  return {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    name: AUTH_COOKIE_NAME,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    value: AUTH_SESSION_TOKEN,
  };
}

export function clearSessionCookie() {
  return {
    ...createSessionCookie(),
    maxAge: 0,
    value: '',
  };
}

export function getAuthorizedUsername() {
  return AUTH_USERNAME;
}

export function getAuthorizedDisplayName() {
  return AUTH_DISPLAY_NAME;
}
