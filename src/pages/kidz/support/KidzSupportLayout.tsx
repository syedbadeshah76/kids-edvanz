import { Outlet } from "react-router-dom";

export function SupportLayout() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <Outlet />
    </div>
  );
}

export const KidzSupportLayout = SupportLayout;
export default KidzSupportLayout;
