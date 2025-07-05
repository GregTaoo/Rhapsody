'use client'

import React from 'react';
import {usePlayer} from "@/components/hook/usePlayer";

interface PlayerFooterProps {
  openLyricViewer: () => void;
}

export const PlayerFooter: React.FC<PlayerFooterProps> = ({openLyricViewer}) => {
  const {
    current,
    currentUrl,
    playNext,
    playPrev,
    audioRef,
  } = usePlayer();

  if (!current) return null;

  return (
    <div className="flex-shrink-0 bg-gray-800 text-white shadow-lg z-50 w-full">
      <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-4 h-20">
        {current ? (
          <>
            {/* 左侧：专辑封面 + 歌曲信息 */}
            <div
              className="flex items-center space-x-3 flex-grow min-w-0 max-w-[40%] cursor-pointer"
              onClick={openLyricViewer}
            >
              {current.albumPic && (
                <img
                  src={current.albumPic}
                  alt="专辑封面"
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="flex flex-col overflow-hidden">
                <p className="font-bold text-lg truncate">{current.name}</p>
                <p className="text-sm text-gray-300 truncate">{current.authors.join(
                  ', ')}</p>
              </div>
            </div>

            {/* 中间：播放控制 (上一首/音频/下一首) */}
            <div
              className="flex items-center space-x-3 justify-center flex-1 min-w-[200px]">
              <button
                onClick={playPrev}
                className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors
                             w-10 h-10 flex items-center justify-center cursor-pointer"
                title="上一首"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM10.445 12.832A1 1 0 0012 12V7.975a1 1 0 00-1.555-.832l-3.86 2.025a1 1 0 000 1.664l3.86 2.025z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <audio ref={audioRef} controls
                     className="flex-grow max-w-[36rem]">
                {currentUrl &&
                    <source src={currentUrl} type="audio/mpeg"/>}
                您的浏览器不支持音频播放。
              </audio>
              <button
                onClick={playNext}
                className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors
                             w-10 h-10 flex items-center justify-center cursor-pointer"
                title="下一首"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 rotate-180"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM10.445 12.832A1 1 0 0012 12V7.975a1 1 0 00-1.555-.832l-3.86 2.025a1 1 0 000 1.664l3.86 2.025z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </>
        ) : (
          <p className="text-gray-300 text-center w-full">暂无播放歌曲，请搜索或添加音乐。</p>
        )}
      </div>
    </div>
  );
};
