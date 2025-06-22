'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Search} from '@/app/components/search';
import {Music} from '@/app/components/netease.type';

// 播放模式枚举
enum PlayMode {
  Sequence = 'sequence', // 顺序播放
  Shuffle = 'shuffle',   // 随机播放
  Reverse = 'reverse',   // 倒序播放
}

interface NeteasePlayerProps {
}

const NeteasePlayer: React.FC<NeteasePlayerProps> = () => {
  const [error, setError] = useState<string | null>(null);

  const [currentMusicDetail, setCurrentMusicDetail] = useState<Music | null>(
      null);
  const [currentMusicUrl, setCurrentMusicUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null); // 更正这里的 audioRef 引用
  const playListScrollRef = useRef<HTMLDivElement | null>(null);

  // --- 播放列表状态 ---
  const [playList, setPlayList] = useState<Music[]>([]);
  const [currentPlayIndex, setCurrentPlayIndex] = useState<number>(-1);
  const [playMode, setPlayMode] = useState<PlayMode>(PlayMode.Sequence);

  // --- API 调用函数 ---
  const callNeteaseApi = useCallback(
      async (appName: string, params: Record<string, any> = {}) => {
        try {
          setError(null);

          const response = await fetch('/api/netease', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              app: appName,
              ...params,
            }),
          });

          const json = await response.json();
          if (!response.ok || !json.success) {
            setError(json.data || `API 调用 ${appName} 失败。`);
            return null;
          }

          return json.data
        } catch (err: any) {
          console.error(`调用 ${appName} 时出错:`, err);
          setError(err.message || '发生未知错误。');
          return null;
        }
      }, []);

  // --- 播放逻辑 ---
  const playMusic = useCallback(async (music: Music) => {
    setCurrentMusicDetail(music);
    setCurrentMusicUrl(null);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    try {
      const linkData: string = await callNeteaseApi('getMusicLink',
          {id: music.id, level: 'lossless'});
      if (linkData) {
        setCurrentMusicUrl(linkData);
        if (audioRef.current) {
          audioRef.current.src = linkData;
          audioRef.current.load();
          audioRef.current.play().catch(playError => {
            console.error('音频可能播放失败:', playError);
            if (playError.name === 'AbortError') {
              setError('播放被用户或浏览器中止，请手动点击播放按钮。');
            } else {
              setError(
                  '自动播放失败，请手动点击播放按钮。浏览器可能限制了自动播放。');
            }
          });
        }
      } else {
        setError(`未能获取歌曲 "${music.name}" 的播放链接。`);
      }
    } catch (err: any) {
      setError(err.message || '处理请求时发生错误。');
    }
  }, [callNeteaseApi]);

  const getNextIndex = useCallback(
      (currentIndex: number, list: Music[], mode: PlayMode): number => {
        if (list.length === 0) return -1;
        switch (mode) {
          case PlayMode.Sequence:
            return (currentIndex + 1) % list.length;
          case PlayMode.Reverse:
            return (currentIndex - 1 + list.length) % list.length;
          case PlayMode.Shuffle:
            let nextIndex;
            do {
              nextIndex = Math.floor(Math.random() * list.length);
            } while (list.length > 1 && nextIndex === currentIndex);
            return nextIndex;
          default:
            return (currentIndex + 1) % list.length;
        }
      }, []);

  const getPreviousIndex = useCallback(
      (currentIndex: number, list: Music[], mode: PlayMode): number => {
        if (list.length === 0) return -1;
        if (mode === PlayMode.Reverse) {
          return (currentIndex + 1) % list.length;
        }
        if (mode === PlayMode.Sequence) {
          return (currentIndex - 1 + list.length) % list.length;
        }
        if (mode === PlayMode.Shuffle) {
          let prevIndex;
          do {
            prevIndex = Math.floor(Math.random() * list.length);
          } while (list.length > 1 && prevIndex === currentIndex);
          return prevIndex;
        }
        return (currentIndex - 1 + list.length) % list.length;
      }, []);

  const handleNextMusic = useCallback(() => {
    if (playList.length === 0) {
      setCurrentMusicDetail(null);
      setCurrentMusicUrl(null);
      if (audioRef.current) audioRef.current.src = '';
      return;
    }
    const nextIndex = getNextIndex(currentPlayIndex, playList, playMode);
    if (nextIndex !== -1) {
      setCurrentPlayIndex(nextIndex);
      playMusic(playList[nextIndex]);
    } else {
      setCurrentMusicDetail(null);
      setCurrentMusicUrl(null);
      if (audioRef.current) audioRef.current.src = '';
    }
  }, [currentPlayIndex, playList, playMode, getNextIndex, playMusic]);

  const handlePreviousMusic = useCallback(() => {
    if (playList.length === 0) {
      setCurrentMusicDetail(null);
      setCurrentMusicUrl(null);
      if (audioRef.current) audioRef.current.src = '';
      return;
    }
    const prevIndex = getPreviousIndex(currentPlayIndex, playList, playMode);
    if (prevIndex !== -1) {
      setCurrentPlayIndex(prevIndex);
      playMusic(playList[prevIndex]);
    } else {
      setCurrentMusicDetail(null);
      setCurrentMusicUrl(null);
      if (audioRef.current) audioRef.current.src = '';
    }
  }, [currentPlayIndex, playList, playMode, getPreviousIndex, playMusic]);

  // --- 播放列表操作 ---
  const handlePlayAndAddToList = useCallback(
      async (id: string, isFromSearch: boolean = false) => {
        const detailData: Music = await callNeteaseApi('getMusicDetail',
            {id: id});
        if (detailData) {
          setPlayList(prevList => {
            let newList = prevList;
            const existingIndex = prevList.findIndex(
                m => m.id === detailData.id);
            if (existingIndex === -1) {
              newList = [...prevList, detailData];
            }
            if (isFromSearch || prevList.length === 0 || existingIndex !== -1) {
              const finalIndex = existingIndex !== -1 ?
                  existingIndex :
                  newList.length - 1;
              setCurrentPlayIndex(finalIndex);
              playMusic(newList[finalIndex]);
            }
            return newList;
          });
        } else {
          setError('未能获取音乐详情。');
        }
      }, [callNeteaseApi, playMusic]);

  const handlePlayListItemClick = useCallback((music: Music, index: number) => {
    setCurrentPlayIndex(index);
    playMusic(music);
  }, [playMusic]);

  // --- 播放模式控制 ---
  const togglePlayMode = useCallback(() => {
    setPlayMode(prevMode => {
      switch (prevMode) {
        case PlayMode.Sequence:
          return PlayMode.Shuffle;
        case PlayMode.Shuffle:
          return PlayMode.Reverse;
        case PlayMode.Reverse:
          return PlayMode.Sequence;
        default:
          return PlayMode.Sequence;
      }
    });
  }, []);

  // --- 效果 ---
  // 处理歌曲结束
  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      const handleEnded = () => {
        if (playList.length > 0) {
          handleNextMusic();
        } else {
          setCurrentMusicDetail(null);
          setCurrentMusicUrl(null);
          audio.src = '';
        }
      };
      audio.addEventListener('ended', handleEnded);
      return () => {
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [playList, handleNextMusic]);

  // 滚动播放列表到当前歌曲
  useEffect(() => {
    if (playListScrollRef.current && currentPlayIndex !== -1) {
      const currentItem = playListScrollRef.current.children[currentPlayIndex] as HTMLElement;
      if (currentItem) {
        currentItem.scrollIntoView({behavior: 'smooth', block: 'nearest'});
      }
    }
  }, [currentPlayIndex, playList]);

  const [page, setPage] = useState<any>({ type: 'search' });

  const navBar = [
    { page: { type: 'search' }, text: '搜索' }
  ];

  return (
      // 外层容器使用 h-screen 确保铺满视口高度，并使用 flex-col 垂直布局
      <div className="flex flex-col h-screen bg-gray-100 font-inter">
        {/* 主内容区域：搜索和播放列表 */}
        {/* flex-grow 占据剩余垂直空间，p-4 作为整体内边距，overflow-hidden 防止内部内容溢出 */}
        <div className="flex flex-col lg:flex-row flex-grow overflow-hidden bg-gray-100 p-4 h-screen">
          <div className="flex flex-col flex-grow bg-white rounded-lg shadow-xl mr-2 h-full min-w-0">
            <div className="flex border-b border-gray-300 flex-shrink-0">
              {navBar.map((tab, index, arr) =>
                <button key={tab.text} className={`
                  flex-1 text-center py-2
                  ${tab.page.type === page.type ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-gray-600'}
                  hover:text-blue-600
                  ${index !== arr.length - 1 ? 'border-r border-gray-300' : ''}
                  focus:outline-none
                `}>
                  {tab.text}
                </button>
              )}
            </div>
            <div className="p-5 flex-grow min-h-0">
              {
                page.type === 'search' ?
                  <Search handlePlayAndAddToList={handlePlayAndAddToList}
                          callNeteaseApi={callNeteaseApi} setError={setError}>
                  </Search> : <></>
              }
            </div>
          </div>

          {/* 分隔线 */}
          <div className="flex-shrink-0 w-px bg-gray-300 hidden lg:block"></div>

          {/* 播放列表区域 */}
          {/* 移除了 flex-grow，并添加了 lg:w-96 来固定大屏幕下的宽度 */}
          <div className="flex flex-col p-5 bg-white rounded-lg shadow-xl ml-2 h-full w-full lg:w-96 min-w-0">
            {/* 错误信息 */}
            {error &&
                <p className="text-red-600 mb-4 flex-shrink-0">{error}</p>}

            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center lg:text-left">当前播放列表
              ({playList.length} 首)</h3>

            {playList.length === 0 ? (
                <p className="text-gray-500 text-center lg:text-left">播放列表为空，快去搜索或添加音乐吧！</p>
            ) : (
                <>
                  {/* 播放模式切换按钮 */}
                  <div
                      className="mb-4 flex justify-center lg:justify-start flex-shrink-0">
                    <button
                        onClick={togglePlayMode}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition duration-200"
                    >
                      播放模式: {
                      playMode === PlayMode.Sequence ? '顺序' :
                          playMode === PlayMode.Shuffle ? '随机' : '倒序'
                    }
                    </button>
                  </div>

                  {/* 播放列表 - 此 div 将可滚动 */}
                  <div ref={playListScrollRef}
                       className="border border-gray-200 rounded-md flex-grow overflow-y-auto">
                    <ul className="divide-y divide-gray-200">
                      {playList.map((music, index) => (
                          <li
                              key={music.id + '-' + index}
                              onClick={() => handlePlayListItemClick(music,
                                  index)}
                              className={`p-3 flex items-center transition duration-150 cursor-pointer
                                  hover:bg-gray-50 ${index ===
                              currentPlayIndex ?
                                  'bg-blue-100 font-semibold' :
                                  ''}`}
                          >
                            {music.albumPic && (
                                <img src={music.albumPic} alt="封面"
                                     className="w-8 h-8 rounded mr-2 object-cover flex-shrink-0"/>
                            )}
                            <div className="flex-grow min-w-0">
                              <p className="text-sm text-gray-900 truncate">{music.name}</p>
                              <p className="text-xs text-gray-500 truncate">{music.authors.join(
                                  ', ')}</p>
                            </div>
                          </li>
                      ))}
                    </ul>
                  </div>
                </>
            )}
          </div>
        </div>

        {/* 音乐播放器 - flex-shrink-0 确保它只占据自身内容的高度 */}
        <div className="flex-shrink-0 bg-gray-800 text-white shadow-lg z-50 w-full">
          <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-4 h-20">
            {currentMusicDetail ? (
                <>
                  {/* 左侧：专辑封面 + 歌曲信息 */}
                  <div
                      className="flex items-center space-x-3 flex-grow min-w-0 max-w-[40%]">
                    {currentMusicDetail.albumPic && (
                        <img
                            src={currentMusicDetail.albumPic}
                            alt="专辑封面"
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                    )}
                    <div className="flex flex-col overflow-hidden">
                      <p className="font-bold text-lg truncate">{currentMusicDetail.name}</p>
                      <p className="text-sm text-gray-300 truncate">{currentMusicDetail.authors.join(
                          ', ')}</p>
                    </div>
                  </div>

                  {/* 中间：播放控制 (上一首/音频/下一首) */}
                  <div
                      className="flex items-center space-x-3 justify-center flex-1 min-w-[200px]">
                    <button
                        onClick={handlePreviousMusic}
                        className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors
                             w-10 h-10 flex items-center justify-center"
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
                      {currentMusicUrl &&
                          <source src={currentMusicUrl} type="audio/mpeg"/>}
                      您的浏览器不支持音频播放。
                    </audio>
                    <button
                        onClick={handleNextMusic}
                        className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors
                             w-10 h-10 flex items-center justify-center"
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
      </div>
  );
};

export default NeteasePlayer;
