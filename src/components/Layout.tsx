import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-[#F4F7FB]">
      <Sidebar />
      <main className="flex-1 ml-60">
        <Outlet />
      </main>
    </div>
  );
}