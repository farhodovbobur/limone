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

  success: '#3B6D11',
  successBg: '#EAF3DE',
  warning: '#854F0B',
  warningBg: '#FAEEDA',
  danger: '#A32D2D',
  dangerBg: '#FCEBEB',
  info: '#185FA5',
  infoBg: '#E6F1FB',
} as const;

export const fonts = {
  sans: "'Manrope', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  serif: "'Cormorant Garamond', Georgia, serif",
} as const;
