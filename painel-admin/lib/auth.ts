import { AdminUser, LoginResponse } from './types';

const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getToken() {
  if (!isBrowser()) return '';
  return window.localStorage.getItem(TOKEN_KEY) || '';
}

export function hasToken() {
  return Boolean(getToken());
}

export function getStoredUser(): AdminUser | null {
  if (!isBrowser()) return null;

  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function saveSession(session: LoginResponse) {
  if (!isBrowser()) return;

  window.localStorage.setItem(TOKEN_KEY, session.accessToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession() {
  if (!isBrowser()) return;

  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}
