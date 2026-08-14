export const palette = {
  olive50: '#F6F7EA',
  olive100: '#E7EBC4',
  olive200: '#D3DA96',
  olive300: '#B9C264',
  olive400: '#A8B04A', // raw logo accent — decorative only, never text bg
  olive500: '#8A9340',
  olive600: '#6F762F', // primary action
  olive700: '#5A6126', // hover / pressed / selected
  olive800: '#454B1C',
  olive900: '#2F3312',

  cream50: '#FEFEF7',
  cream100: '#FBF9E8',
  cream200: '#F5F1CF',
  cream300: '#ECE6B3',

  bgBase: '#FFFFFF',
  bgSubtle: '#F5F7FA',
  textPrimary: '#2C2E22',
  textSecondary: '#5F614E',
  textTertiary: '#8A8B7C',
  border: '#E6E6DD',
  borderStrong: '#CFCFC2',

  success: '#16A34A', // green-600
  successBg: '#DCFCE7', // green-100
  warning: '#D97706', // amber-600
  warningBg: '#FEF3C7', // amber-100
  danger: '#DC2626', // red-600
  dangerBg: '#FEE2E2', // red-100
  info: '#2563EB', // blue-600
  infoBg: '#DBEAFE', // blue-100
} as const;

export const fonts = {
  sans: "'Manrope', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  serif: "'Cormorant Garamond', Georgia, serif",
} as const;
