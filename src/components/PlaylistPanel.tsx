'use client'

import React, {useRef} from 'react';
import {PlayMode} from './context/PlayerContext';
import {usePlayer} from "@/components/hook/usePlayer";
import {ErrorBanner} from "@/components/ErrorBanner";

export default function PlaylistPanel() {
  const {
    playList,
    index: currentPlayIndex,
    mode: playMode,
    toggleMode,
    removeFromList,
    switchList,
    playAt,
    error,
  } = usePlayer();

  const playListScrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col h-full">
      <ErrorBanner message={error ?? ''}/>

      <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
        当前播放列表 ({playList.length} 首)
      </h3>

      {playList.length === 0 ? (
        <p className="text-gray-500 text-center">
          播放列表为空，快去搜索或添加音乐吧！
        </p>
      ) : (
        <>
          <div className="mb-4 flex justify-center flex-shrink-0">
            <button
              onClick={toggleMode}
              className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition duration-200 cursor-pointer"
            >
              播放模式:{' '}
              {playMode === PlayMode.Sequence
                ? '顺序'
                : playMode === PlayMode.Shuffle
                  ? '随机'
                  : '倒序'}
            </button>

            <button
              onClick={() => switchList([])}
              className="ml-1 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200 cursor-pointer"
            >
              清空
            </button>
          </div>

          <div
            ref={playListScrollRef}
            className="border border-gray-200 rounded-md flex-grow overflow-y-auto"
          >
            <ul className="divide-y divide-gray-200">
              {playList.map((music, index) => (
                <li
                  key={music.id + '-' + index}
                  className={`group p-3 flex items-center relative transition duration-150 cursor-pointer hover:bg-gray-50 ${
                    index === currentPlayIndex ? 'bg-blue-100 font-semibold' : ''
                  }`}
                  onClick={() => playAt(index)}
                >
                  {music.albumPic && (
                    <img
                      src={music.albumPic}
                      alt="封面"
                      className="w-8 h-8 rounded mr-2 object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-grow min-w-0">
                    <p className="text-sm text-gray-900 truncate">{music.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {music.authors.join(', ')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromList(index);
                    }}
                    className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400 hover:text-red-500 hidden cursor-pointer font-semibold group-hover:block"
                    title="删除"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
