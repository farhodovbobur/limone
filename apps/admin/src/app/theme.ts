import type { ThemeConfig } from 'antd';
import { fonts, palette } from './tokens';

export const theme: ThemeConfig = {
  token: {
    colorPrimary: palette.olive600,
    colorLink: palette.olive600,
    colorLinkHover: palette.olive700,
    colorSuccess: palette.success,
    colorWarning: palette.warning,
    colorError: palette.danger,
    colorInfo: palette.info,

    colorText: palette.textPrimary,
    colorTextSecondary: palette.textSecondary,
    colorTextTertiary: palette.textTertiary,
    colorBgBase: palette.bgBase,
    colorBgLayout: palette.bgSubtle,
    colorBorder: palette.border,
    colorBorderSecondary: '#EFEFE8',

    borderRadius: 8,
    fontFamily: fonts.sans,
    fontSize: 14,
    boxShadow: '0 2px 8px rgba(44,46,34,0.08)',
    boxShadowSecondary: '0 8px 24px rgba(44,46,34,0.10)',
  },
  components: {
    Layout: {
      siderBg: palette.cream100,
      headerBg: palette.cream100,
      bodyBg: palette.bgSubtle,
      headerHeight: 56,
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: palette.olive700,
      itemSelectedColor: '#FFFFFF',
      itemHoverBg: palette.olive50,
      itemColor: palette.olive800,
      itemBorderRadius: 8,
    },
    Button: {
      primaryShadow: 'none',
      fontWeight: 500,
      controlHeight: 36,
    },
    Table: {
      headerBg: palette.cream100,
      headerColor: palette.olive800,
      rowHoverBg: palette.olive50,
      rowSelectedBg: palette.olive100,
      borderColor: palette.border,
      cellPaddingBlock: 12,
    },
    Input: {
      controlHeight: 36,
      activeBorderColor: palette.olive600,
      hoverBorderColor: palette.olive500,
    },
    Select: { controlHeight: 36 },
    Card: { borderRadiusLG: 12 },
    Tag: { defaultBg: palette.olive100, defaultColor: palette.olive800 },
  },
};
