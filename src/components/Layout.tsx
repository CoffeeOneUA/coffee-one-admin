import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Icon } from './Icon';
import logo from '../assets/coffeeone-logo.png';

export default function Layout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F4F7FB]">
      {/* Мобільна верхня панель — лого + гамбургер. Сайдбар на телефоні
          завжди забирав майже весь екран; тепер він висувний, а тут
          лишається вузька стрічка для відкриття меню. */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[#20303C] flex items-center justify-between px-4">
        <img src={logo} alt="Coffee One" className="h-7 w-auto" />
        <button
          onClick={() => setMobileNavOpen(true)}
          className="text-white/80 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10"
          aria-label="Відкрити меню"
        >
          <Icon name="menu" size={20} />
        </button>
      </div>

      <Sidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />

      <main className="flex-1 min-w-0 lg:ml-64 pt-14 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
}