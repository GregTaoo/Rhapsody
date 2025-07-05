'use client';

import React from 'react';

interface Tab {
  text: string;
  href: string;
  active: boolean;
  onClick: () => void;
}

export default function Navbar({ tabs }: { tabs: Tab[] }) {
  return (
    <nav className="flex border-b border-gray-300 flex-shrink-0">
      {tabs.map((tab) => (
        <a
          key={tab.text}
          href={tab.href}
          onClick={(e) => {
            e.preventDefault();
            tab.onClick();
          }}
          className={`
            flex-1 text-center py-2 cursor-pointer
            ${tab.active ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-gray-600'}
            hover:text-blue-600 focus:outline-none
          `}
        >
          {tab.text}
        </a>
      ))}
    </nav>
  );
}
