import type { AppIcon } from '../../shared/icons';
import { Icons } from '../../shared/icons';

export function deviceInfo(ua: string | null): {
  label: string | null;
  Icon: AppIcon;
} {
  if (!ua) return { label: null, Icon: Icons.desktop };

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

  const label = [browser, os].filter(Boolean).join(' · ') || ua.slice(0, 40);

  let Icon = Icons.desktop;
  switch (true) {
    case /iPhone|iPad|Android/.test(ua):
      Icon = Icons.mobile;
      break;
    case /Macintosh/.test(ua):
      Icon = Icons.laptop;
      break;
  }

  return { label, Icon };
}

// RFC1918/loopback ranges — for these "location" is just the local network.
export function isPrivateIp(ip: string | null): boolean {
  if (!ip) return false;
  const v4 = ip.replace(/^::ffff:/, '');
  return (
    /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(v4) ||
    ip === '::1'
  );
}

// Chromium's ICU has no Uzbek month names (renders "M07") — own list.
const UZ_MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
];

export function memberSince(iso: string, lang: string): string {
  const d = new Date(iso);
  if (lang.startsWith('uz')) {
    return `${d.getFullYear()}-yil ${UZ_MONTHS[d.getMonth()]}`;
  }
  return new Intl.DateTimeFormat(lang, {
    month: 'long',
    year: 'numeric',
  }).format(d);
}

// "bugun 14:02" / "kecha 09:41" / "3-avg 09:41" — t() supplies the words.
export function sessionTime(
  iso: string,
  lang: string,
  today: string,
  yesterday: string,
): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString(lang, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const startOf = (x: Date) => new Date(x).setHours(0, 0, 0, 0);
  const days = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000);
  if (days === 0) return `${today} ${time}`;
  if (days === 1) return `${yesterday} ${time}`;
  if (lang.startsWith('uz')) {
    return `${d.getDate()}-${UZ_MONTHS[d.getMonth()].slice(0, 3)} ${time}`;
  }
  return `${d.toLocaleDateString(lang, { day: 'numeric', month: 'short' })} ${time}`;
}

// 0–4 score for the strength meter; blocking rule stays min-8 (backend).
export function passwordStrength(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[a-zA-Z]/.test(pw) && /\d/.test(pw)) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[^a-zA-Z0-9]/.test(pw)) score += 1;
  return score;
}
