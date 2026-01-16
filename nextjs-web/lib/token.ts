/**
 * Token management utilities
 * Centralizes token storage and retrieval logic
 */

export const TOKEN_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const;

export const COOKIE_OPTIONS = {
  httpOnly: false, // Can't set httpOnly from client-side for security
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
} as const;

/**
 * Get token from localStorage
 */
export function getTokenFromStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('Failed to get token from localStorage:', error);
    return null;
  }
}

/**
 * Set token in localStorage
 */
export function setTokenInStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn('Failed to set token in localStorage:', error);
  }
}

/**
 * Remove token from localStorage
 */
export function removeTokenFromStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to remove token from localStorage:', error);
  }
}

/**
 * Get token from cookies
 */
export function getTokenFromCookies(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  const cookie = cookies.find(c => c.trim().startsWith(`${name}=`));

  if (!cookie) return null;

  try {
    return decodeURIComponent(cookie.split('=')[1]);
  } catch (error) {
    console.warn('Failed to decode cookie:', error);
    return null;
  }
}

/**
 * Set token in cookies
 */
export function setTokenInCookies(name: string, value: string, maxAge?: number): void {
  if (typeof document === 'undefined') return;

  let cookieString = `${name}=${encodeURIComponent(value)}; path=/; samesite=strict`;

  if (COOKIE_OPTIONS.secure) {
    cookieString += '; secure';
  }

  if (maxAge) {
    cookieString += `; max-age=${maxAge}`;
  }

  document.cookie = cookieString;
}

/**
 * Remove token from cookies
 */
export function removeTokenFromCookies(name: string): void {
  if (typeof document === 'undefined') return;

  // Set cookie with expired date to remove it
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=strict`;
}

/**
 * Clear all tokens from both localStorage and cookies
 */
export function clearAllTokens(): void {
  // Clear from localStorage
  removeTokenFromStorage(TOKEN_KEYS.ACCESS_TOKEN);
  removeTokenFromStorage(TOKEN_KEYS.REFRESH_TOKEN);

  // Clear from cookies
  removeTokenFromCookies(TOKEN_KEYS.ACCESS_TOKEN);
  removeTokenFromCookies(TOKEN_KEYS.REFRESH_TOKEN);
}

/**
 * Check if token is expired (basic check - doesn't decode JWT)
 * This is a client-side check, server should validate properly
 */
export function isTokenExpired(token: string): boolean {
  if (!token) return true;

  try {
    // Basic check - if token is malformed
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    // For more sophisticated checks, you'd need to decode the JWT
    // But we avoid that for security reasons - let the server handle it
    return false;
  } catch (error) {
    return true;
  }
}
