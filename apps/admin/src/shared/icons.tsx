import type { Icon as PhosphorIcon, IconWeight } from '@phosphor-icons/react';
import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  BellIcon,
  CaretRightIcon,
  CaretUpDownIcon,
  ChartBarIcon,
  FactoryIcon,
  GearSixIcon,
  GlobeIcon,
  InfoIcon,
  LockIcon,
  MagnifyingGlassIcon,
  PackageIcon,
  PencilSimpleIcon,
  PlusIcon,
  PowerIcon,
  ShoppingCartIcon,
  SignOutIcon,
  SquaresFourIcon,
  StackIcon,
  TrayIcon,
  UserIcon,
  UsersIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import type { ComponentType, SVGProps } from 'react';
import type { ModuleKey } from './access';

export interface IconProps {
  size?: number;
  className?: string;
  weight?: IconWeight;
  /** Decorative icons (separators, ornaments) are hidden from AT. */
  'aria-hidden'?: boolean;
}

export type AppIcon = ComponentType<IconProps>;

type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

export const ph = (Icon: PhosphorIcon): AppIcon =>
  function PhosphorAdapted({
    size = 20,
    weight = 'regular',
    className,
    'aria-hidden': ariaHidden,
  }) {
    return (
      <Icon
        size={size}
        weight={weight}
        className={className}
        aria-hidden={ariaHidden}
      />
    );
  };

export const hero = (Outline: HeroIcon, Solid?: HeroIcon): AppIcon =>
  function HeroAdapted({
    size = 20,
    weight = 'regular',
    className,
    'aria-hidden': ariaHidden,
  }) {
    const Chosen = weight === 'fill' && Solid ? Solid : Outline;
    return (
      <Chosen
        width={size}
        height={size}
        className={className}
        aria-hidden={ariaHidden}
      />
    );
  };

export const Icons = {
  // Modules
  dashboard: ph(SquaresFourIcon),
  materials: ph(StackIcon),
  goods: ph(PackageIcon),
  production: ph(FactoryIcon),
  staff: ph(UsersIcon),
  orders: ph(ShoppingCartIcon),
  reports: ph(ChartBarIcon),
  // Shell
  arrowLeft: ph(ArrowLeftIcon),
  lock: ph(LockIcon),
  bell: ph(BellIcon),
  caretRight: ph(CaretRightIcon),
  caretUpDown: ph(CaretUpDownIcon),
  logout: ph(SignOutIcon),
  settings: ph(GearSixIcon),
  user: ph(UserIcon),
  globe: ph(GlobeIcon),
  // Actions & states
  search: ph(MagnifyingGlassIcon),
  plus: ph(PlusIcon),
  edit: ph(PencilSimpleIcon),
  power: ph(PowerIcon),
  retry: ph(ArrowClockwiseIcon),
  warning: ph(WarningIcon),
  inbox: ph(TrayIcon),
  info: ph(InfoIcon),
} satisfies Record<string, AppIcon>;

// Completeness check: every module in the access map has an icon.
export const MODULE_ICONS: Record<ModuleKey, AppIcon> = {
  dashboard: Icons.dashboard,
  materials: Icons.materials,
  goods: Icons.goods,
  production: Icons.production,
  staff: Icons.staff,
  orders: Icons.orders,
  reports: Icons.reports,
};
