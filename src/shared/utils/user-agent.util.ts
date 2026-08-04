export interface ParsedUserAgent {
  browser: string | null;
  os: string | null;
  deviceType: 'desktop' | 'mobile' | null;
}

export function parseUserAgent(ua?: string): ParsedUserAgent {
  if (!ua) return { browser: null, os: null, deviceType: null };

  let browser: string | null = null;
  switch (true) {
    case /Edg\//.test(ua):
      browser = 'Edge';
      break;
    case /OPR\//.test(ua):
      browser = 'Opera';
      break;
    case /Electron\//.test(ua):
      browser = 'Electron';
      break;
    case /Firefox\//.test(ua):
      browser = 'Firefox';
      break;
    case /Chrome\//.test(ua):
      browser = 'Chrome';
      break;
    case /Safari\//.test(ua):
      browser = 'Safari';
      break;
  }

  let os: string | null = null;
  switch (true) {
    case /iPhone|iPad/.test(ua):
      os = 'iOS';
      break;
    case /Android/.test(ua):
      os = 'Android';
      break;
    case /Macintosh/.test(ua):
      os = 'macOS';
      break;
    case /Windows/.test(ua):
      os = 'Windows';
      break;
    case /Linux/.test(ua):
      os = 'Linux';
      break;
  }

  let deviceType: ParsedUserAgent['deviceType'] = null;
  if (browser !== null || os !== null) {
    deviceType = /iPhone|iPad|Android/.test(ua) ? 'mobile' : 'desktop';
  }

  return { browser, os, deviceType };
}
