'use client';

import React from 'react';
import {useRouter} from "next/navigation";

interface Tab {
  text: string;
  href: string;
  active: boolean;
  onClick: () => void;
}

export default function Navbar({tabs}: { tabs: Tab[] }) {
  const router = useRouter();

  return (
    <nav className="flex border-b border-gray-300 flex-shrink-0">
      <button
        onClick={() => router.back()}
        className="text-center p-3 text-gray-600 hover:bg-gray-100 cursor-pointer hover:text-blue-600 transition duration-300 ease-in-out"
      >
        <svg className="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3130"
             width="20" height="20">
          <path
            d="M798.784 578.816l-329.472 0.448 119.296 118.144-90.112 91.072-274.432-274.56 270.272-270.208 90.816 90.88-115.264 114.432 328.896 0.832v128.96z"
            p-id="3131"></path>
          <path
            d="M1.28 512.192A511.616 511.616 0 0 0 512.768 1024C795.008 1024 1024 794.88 1024 512.192 1024 229.568 795.008 0.384 512.768 0.384 230.4 0.384 1.344 229.568 1.28 512.192z m128.32 0a383.552 383.552 0 0 1 383.104-383.36c211.136 0 382.912 172.032 382.912 383.36 0 211.52-171.84 383.36-382.912 383.36a383.552 383.552 0 0 1-383.104-383.36z"
            p-id="3132"></path>
        </svg>
      </button>
      {tabs.map((tab) => (
        <a
          key={tab.text}
          href={tab.href}
          onClick={(e) => {
            e.preventDefault();
            if (tab.active) return;
            tab.onClick();
          }}
          className={`
            flex-1 text-center py-2
            ${tab.active 
                ? 'border-b-2 border-blue-600 text-blue-600 font-semibold cursor-default' 
                : 'text-gray-600 hover:bg-gray-100 cursor-pointer'}
            hover:text-blue-600 transition duration-300 ease-in-out
            border-l-gray-100 border-l-2
          `}
        >
          {tab.text}
        </a>
      ))}
    </nav>
  );
}
