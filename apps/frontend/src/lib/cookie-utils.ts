import { cookies } from 'next/headers';

/**
 * Build the Cookie header string from the Next.js cookie jar
 */
export async function buildCookieHeader(): Promise<string> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  const refreshToken = cookieStore.get('refresh_token')?.value;

  const parts: string[] = [];
  if (accessToken) parts.push(`access_token=${accessToken}`);
  if (refreshToken) parts.push(`refresh_token=${refreshToken}`);

  return parts.join('; ');
}

/**
 * Parse Set-Cookie headers from the backend response
 * and write them into the Next.js cookie jar
 */
export async function propagateCookies(response: Response): Promise<void> {
  const setCookieHeaders = response.headers.getSetCookie?.() ?? [];
  const cookieStore = await cookies();

  for (const header of setCookieHeaders) {
    const [cookiePart, ...attrParts] = header.split(';');
    const [name, ...valueParts] = cookiePart.split('=');
    const value = valueParts.join('='); // value may contain '='

    const attrs: Record<string, string> = {};
    for (const attr of attrParts) {
      const [key, ...valParts] = attr.trim().split('=');
      attrs[key.toLowerCase()] = valParts.join('=') || 'true';
    }

    cookieStore.set(name.trim(), value.trim(), {
      httpOnly: 'httponly' in attrs,
      secure: 'secure' in attrs,
      sameSite: (attrs['samesite'] as 'strict' | 'lax' | 'none') || 'strict',
      maxAge: attrs['max-age']
        ? parseInt(attrs['max-age'], 10)
        : undefined,
      path: attrs['path'] || '/',
    });
  }
}
