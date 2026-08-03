import { Outlet } from 'react-router-dom';
import { LangSwitch } from '../shared/components/LangSwitch';

export function AuthLayout() {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-8"
      style={{
        background:
          'radial-gradient(120% 90% at 50% -10%, #FBF9E8 0%, #F5F7FA 60%)',
      }}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-50"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <g fill="none" stroke="#E7EBC4" strokeWidth="1.4">
          <circle cx="150" cy="120" r="220" />
          <circle cx="150" cy="120" r="150" />
          <circle cx="1060" cy="700" r="260" />
          <circle cx="1060" cy="700" r="180" />
        </g>
      </svg>

      <div className="absolute top-6 right-6">
        <LangSwitch withIcon />
      </div>

      <Outlet />
    </div>
  );
}
