'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Search} from '@/app/components/search';
import {Music} from '@/app/components/netease.type';
import {PlaylistDetail} from '@/app/components/playlistDetail';
import {NeteaseUser} from '@/app/components/neteaseUser';
import {LyricViewer} from '@/app/components/lyricViewer';
import {useWidthFit} from "@/app/components/hook/useWidthFit";
import {ErrorBanner} from "@/app/components/errorBanner";
import {useSearchParams} from 'next/navigation';

// 播放模式枚举
enum PlayMode {
  Sequence = 'sequence', // 顺序播放
  Shuffle = 'shuffle',   // 随机播放
  Reverse = 'reverse',   // 倒序播放
}

const STORAGE_KEY = 'PLAYER_DATA';

interface SavedState {
  playList: Music[];
  currentPlayIndex: number;
  playMode: PlayMode;
}

interface NeteasePlayerProps {
}

const NeteasePlayer: React.FC<NeteasePlayerProps> = () => {
  const searchParams = useSearchParams();
  const neteaseId = searchParams.get('id') || undefined;

  const [error, setError] = useState<string | null>(null);

  const [currentMusicDetail, setCurrentMusicDetail] = useState<Music | null>(null);
  const [currentMusicUrl, setCurrentMusicUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
              setError('播放可能被浏览器中止，请手动点击播放');
            } else {
              setError('自动播放失败，请手动点击播放。浏览器可能限制了自动播放。');
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
  const handlePlayTempMusic = useCallback(
      async (id: string) => {
        const detailData: Music = await callNeteaseApi('getMusicDetail', {id: id});
        if (detailData) playMusic(detailData);
      }, [callNeteaseApi, playMusic]);

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

  const handlePlayListSwitch = (newList: Music[]) => {
    setPlayList(newList);
    if (newList.length > 0) {
      setCurrentPlayIndex(0);
      playMusic(newList[0]);
    }
  };

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

  const handleRemoveFromPlayList = (index: number) => {
    setPlayList(prev => {
      const newList = [...prev];
      newList.splice(index, 1);
      if (index < currentPlayIndex) {
        setCurrentPlayIndex(currentPlayIndex - 1);
      } else if (index == currentPlayIndex && playList.length > 0) {
        const index = (currentPlayIndex + 1) % playList.length;
        setCurrentPlayIndex(index - index === 0 ? 0 : 1);
        playMusic(playList[index]);
      }
      return newList;
    });
  };

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

  // --- 新增：恢复播放器状态 ---
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state: SavedState = JSON.parse(saved);
        if (state.playList && state.playList.length > 0) {
          setPlayList(state.playList);
          setPlayMode(state.playMode || PlayMode.Sequence);
          if (!neteaseId) {
            const index = state.currentPlayIndex >= 0 ?
                state.currentPlayIndex :
                0;
            setCurrentPlayIndex(index);
            playMusic(state.playList[index]);
          }
        }
      } catch {}
    }
    if (neteaseId) {
      handlePlayTempMusic(neteaseId);
      openLyricViewer(neteaseId);
    }
  }, []);

  // --- 新增：监听播放进度，保存状态 ---
  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    const saveState = () => {
      const state: SavedState = {
        playList,
        currentPlayIndex,
        playMode
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // ignore quota exceeded or other errors
      }
    };

    audio.addEventListener('timeupdate', saveState);

    // 额外监听播放列表、播放索引、播放模式变化时也保存状态
    // 这里用 useEffect 监听 playList、currentPlayIndex、playMode 变化时保存状态
    return () => {
      audio.removeEventListener('timeupdate', saveState);
    };
  }, [playList, currentPlayIndex, playMode]);

  // 监听 playList, currentPlayIndex, playMode 变化保存状态
  useEffect(() => {
    try {
      const state: SavedState = {
        playList,
        currentPlayIndex,
        playMode
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [playList, currentPlayIndex, playMode]);

  const sidebarTooNarrow = useWidthFit();

  const [page, setPage] = useState<any>({ type: 'search' });

  const getCurrentPlaylistElement = () => (
      <div className="flex flex-col h-full">
        <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">当前播放列表
          ({playList.length} 首)</h3>

        {playList.length === 0 ? (
            <p className="text-gray-500 text-center">播放列表为空，快去搜索或添加音乐吧！</p>
        ) : (
            <>
              {/* 播放模式切换按钮 */}
              <div
                  className="mb-4 flex justify-center flex-shrink-0">
                <button
                    onClick={togglePlayMode}
                    className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition duration-200 cursor-pointer"
                >
                  播放模式: {
                  playMode === PlayMode.Sequence ? '顺序' :
                      playMode === PlayMode.Shuffle ? '随机' : '倒序'
                }
                </button>
                <button
                    onClick={() => handlePlayListSwitch([])}
                    className="ml-1 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200 cursor-pointer">
                  清空
                </button>
              </div>

              {/* 播放列表 - 此 div 将可滚动 */}
              <div ref={playListScrollRef}
                   className="border border-gray-200 rounded-md flex-grow overflow-y-auto">
                <ul className="divide-y divide-gray-200">
                  {playList.map((music, index) => (
                      <li
                          key={music.id + '-' + index}
                          className={`group p-3 flex items-center relative transition duration-150 cursor-pointer hover:bg-gray-50 ${index === currentPlayIndex ? 'bg-blue-100 font-semibold' : ''}`}
                          onClick={() => handlePlayListItemClick(music, index)}
                      >
                        {music.albumPic && (
                            <img src={music.albumPic} alt="封面"
                                 className="w-8 h-8 rounded mr-2 object-cover flex-shrink-0"/>
                        )}
                        <div className="flex-grow min-w-0">
                          <p className="text-sm text-gray-900 truncate">{music.name}</p>
                          <p className="text-xs text-gray-500 truncate">{music.authors.join(', ')}</p>
                        </div>
                        <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFromPlayList(index);
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

  const openPlaylist = (id: string | undefined, isAlbum: boolean, data: any = undefined) => {
    setPage({ type: 'playlist', id, isAlbum, data })
  }

  const openLyricViewer = (id: string = currentMusicDetail!.id) => {
    setPage({ type: 'lyric', id })
  }

  const getPageElement = () => {
    switch (page.type) {
      case 'search':
        return <Search handlePlayAndAddToList={handlePlayAndAddToList}
                       callNeteaseApi={callNeteaseApi}
                       openPlaylist={openPlaylist} setError={setError}/>
      case 'playlist':
        return <PlaylistDetail id={page.id} isAlbum={page.isAlbum} data={page.data}
                               handlePlayAndAddToList={handlePlayAndAddToList}
                               handlePlayListSwitch={handlePlayListSwitch}
                               callNeteaseApi={callNeteaseApi} setError={setError}/>
      case 'user':
        return <NeteaseUser openPlaylist={openPlaylist}
                            callNeteaseApi={callNeteaseApi} setError={setError}/>
      case 'lyric':
        return <LyricViewer musicId={page.id} audioRef={audioRef}
                            callNeteaseApi={callNeteaseApi} setError={setError}/>
      case 'current-playlist':
        return getCurrentPlaylistElement();
      default:
        return <></>
    }
  }

  const navBar = [
    { page: { type: 'search' }, text: '搜索' },
    { page: { type: 'user' }, text: '用户' }
  ];

  return (
      // 外层容器使用 h-screen 确保铺满视口高度，并使用 flex-col 垂直布局
      <div className="flex flex-col h-screen bg-gray-100 font-inter">
        <ErrorBanner message={error ?? ''}/>

        {/* 主内容区域：搜索和播放列表 */}
        {/* flex-grow 占据剩余垂直空间，p-4 作为整体内边距，overflow-hidden 防止内部内容溢出 */}
        <div className="flex flex-col md:flex-row flex-grow overflow-hidden bg-gray-100 p-4 h-screen">
          <div className="flex flex-col flex-grow bg-white rounded-lg shadow-xl m-1 h-full min-w-0">
            <div className="flex border-b border-gray-300 flex-shrink-0">
              {(sidebarTooNarrow ? navBar.concat({
                page: { type: 'current-playlist' }, text: '播放列表'
              }) : navBar).map((tab) =>
                <button key={tab.text} className={`
                  flex-1 text-center py-2 cursor-pointer
                  ${tab.page.type === page.type ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-gray-600'}
                  hover:text-blue-600
                  focus:outline-none
                `} onClick={() => setPage(tab.page)}>
                  {tab.text}
                </button>
              )}
            </div>
            <div className="p-5 flex-grow min-h-0">
              {getPageElement()}
            </div>
          </div>

          {/* 播放列表区域 */}
          {!sidebarTooNarrow && (
              <div className="p-5 bg-white rounded-lg shadow-xl m-1 md:w-96 min-w-0 flex flex-col h-full">
                {getCurrentPlaylistElement()}
              </div>
          )}
        </div>

        {/* 音乐播放器 - flex-shrink-0 确保它只占据自身内容的高度 */}
        <div className="flex-shrink-0 bg-gray-800 text-white shadow-lg z-50 w-full">
          <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-4 h-20">
            {currentMusicDetail ? (
                <>
                  {/* 左侧：专辑封面 + 歌曲信息 */}
                  <div
                      className="flex items-center space-x-3 flex-grow min-w-0 max-w-[40%] cursor-pointer"
                      onClick={() => openLyricViewer()}
                  >
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
                      {currentMusicUrl &&
                          <source src={currentMusicUrl} type="audio/mpeg"/>}
                      您的浏览器不支持音频播放。
                    </audio>
                    <button
                        onClick={handleNextMusic}
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
      </div>
  );
};

export default NeteasePlayer;
