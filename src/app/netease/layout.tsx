'use client'

import React, {Suspense} from "react";
import {PlayerFooter} from "@/components/PlayerFooter";
import {useWidthFit} from "@/components/hook/useWidthFit";
import PlaylistPanel from "@/components/PlaylistPanel";
import {PlayerProvider} from "@/components/PlayerProvider";
import {usePathname} from "next/navigation";
import {useRouter} from "next/navigation";
import Navbar from "@/components/NavBar";

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const sidebarTooNarrow = useWidthFit();

  const baseNavBar = [
    { href: '/netease/search', text: '搜索' },
    { href: '/netease/user', text: '用户' },
  ];

  // 边界情况：窄屏加播放列表tab
  const navBar = sidebarTooNarrow
    ? [...baseNavBar, { href: '/netease/current-playlist', text: '播放列表' }]
    : baseNavBar;

  const tabs = navBar.map(tab => ({
    ...tab,
    active: pathname.startsWith(tab.href),
    onClick: () => router.push(tab.href),
  }));

  return (
    <PlayerProvider>
      <main className="min-h-screen bg-gray-100 flex flex-col h-screen font-inter">
        <Suspense>
          {/* 主内容区域：搜索和播放列表 */}
          {/* flex-grow 占据剩余垂直空间，p-4 作为整体内边距，overflow-hidden 防止内部内容溢出 */}
          <div className="flex flex-col md:flex-row flex-grow overflow-hidden bg-gray-100 p-4 h-screen">
            <div className="flex flex-col flex-grow bg-white rounded-lg shadow-xl m-1 h-full min-w-0">
              <Navbar tabs={tabs} />
              <div className="p-5 flex-grow min-h-0">
                {children}
              </div>
            </div>

            {/* 播放列表区域 */}
            {!sidebarTooNarrow && (
              <div className="p-5 bg-white rounded-lg shadow-xl m-1 md:w-96 min-w-0 flex flex-col h-full">
                <PlaylistPanel />
              </div>
            )}
          </div>

          <PlayerFooter openLyricViewer={() => router.push('/netease/lyrics')}/>
        </Suspense>
      </main>
    </PlayerProvider>
  );
}
