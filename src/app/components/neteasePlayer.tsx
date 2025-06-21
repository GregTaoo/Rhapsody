'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';

// --- 类型定义 ---
interface Music {
  id: string;
  name: string;
  duration: number; // 毫秒
  authors: string[];
  albumPic: string;
}

// 播放模式枚举
enum PlayMode {
  Sequence = 'sequence', // 顺序播放
  Shuffle = 'shuffle',   // 随机播放
  Reverse = 'reverse',   // 倒序播放
}

interface NeteasePlayerProps {}

const NeteasePlayer: React.FC<NeteasePlayerProps> = () => {
  const [musicIdInput, setMusicIdInput] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [lastSearchedKeyword, setLastSearchedKeyword] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Music[]>([]);

  const [currentMusicDetail, setCurrentMusicDetail] = useState<Music | null>(null);
  const [currentMusicUrl, setCurrentMusicUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null); // 更正这里的 audioRef 引用
  const playListScrollRef = useRef<HTMLDivElement | null>(null);

  // --- 播放列表状态 ---
  const [playList, setPlayList] = useState<Music[]>([]);
  const [currentPlayIndex, setCurrentPlayIndex] = useState<number>(-1);
  const [playMode, setPlayMode] = useState<PlayMode>(PlayMode.Sequence);

  // 分页状态
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const songsPerPage = 30;

  // --- API 调用函数 ---
  const callNeteaseApi = useCallback(async (appName: string, params: Record<string, any> = {}) => {
    try {
      setLoading(true);
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API 调用 ${appName} 失败。`);
      }

      return await response.json();
    } catch (err: any) {
      console.error(`调用 ${appName} 时出错:`, err);
      setError(err.message || '发生未知错误。');
      return null;
    } finally {
      setLoading(false);
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
      const linkData: string = await callNeteaseApi('getMusicLink', { id: music.id, level: 'standard' });
      if (linkData) {
        setCurrentMusicUrl(linkData);
        if (audioRef.current) {
          audioRef.current.src = linkData;
          audioRef.current.load();
          audioRef.current.play().catch(playError => {
            console.error("音频可能播放失败:", playError);
            if (playError.name === "AbortError") {
              setError("播放被用户或浏览器中止，请手动点击播放按钮。");
            } else {
              setError("自动播放失败，请手动点击播放按钮。浏览器可能限制了自动播放。");
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

  const getNextIndex = useCallback((currentIndex: number, list: Music[], mode: PlayMode): number => {
    if (list.length === 0) return -1;
    switch (mode) {
      case PlayMode.Sequence: return (currentIndex + 1) % list.length;
      case PlayMode.Reverse: return (currentIndex - 1 + list.length) % list.length;
      case PlayMode.Shuffle:
        let nextIndex;
        do {
          nextIndex = Math.floor(Math.random() * list.length);
        } while (list.length > 1 && nextIndex === currentIndex);
        return nextIndex;
      default: return (currentIndex + 1) % list.length;
    }
  }, []);

  const getPreviousIndex = useCallback((currentIndex: number, list: Music[], mode: PlayMode): number => {
    if (list.length === 0) return -1;
    if (mode === PlayMode.Reverse) { return (currentIndex + 1) % list.length; }
    if (mode === PlayMode.Sequence) { return (currentIndex - 1 + list.length) % list.length; }
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
  const handlePlayAndAddToList = useCallback(async (id: string, isFromSearch: boolean = false) => {
    const detailData: Music = await callNeteaseApi('getMusicDetail', { id: id });
    if (detailData) {
      setPlayList(prevList => {
        let newList = prevList;
        const existingIndex = prevList.findIndex(m => m.id === detailData.id);
        if (existingIndex === -1) {
          newList = [...prevList, detailData];
        }
        if (isFromSearch || prevList.length === 0 || existingIndex !== -1) {
          const finalIndex = existingIndex !== -1 ? existingIndex : newList.length - 1;
          setCurrentPlayIndex(finalIndex);
          playMusic(newList[finalIndex]);
        }
        return newList;
      });
    } else {
      setError('未能获取音乐详情。');
    }
  }, [callNeteaseApi, playMusic]);

  const handlePlayDirectly = useCallback(() => {
    if (musicIdInput) {
      handlePlayAndAddToList(musicIdInput);
      setMusicIdInput('');
    } else {
      setError('请输入音乐 ID');
    }
  }, [musicIdInput, handlePlayAndAddToList]);

  const handleSongClick = useCallback((song: Music) => {
    handlePlayAndAddToList(song.id, true);
  }, [handlePlayAndAddToList]);

  const handlePlayListItemClick = useCallback((music: Music, index: number) => {
    setCurrentPlayIndex(index);
    playMusic(music);
  }, [playMusic]);

  // --- 播放模式控制 ---
  const togglePlayMode = useCallback(() => {
    setPlayMode(prevMode => {
      switch (prevMode) {
        case PlayMode.Sequence: return PlayMode.Shuffle;
        case PlayMode.Shuffle: return PlayMode.Reverse;
        case PlayMode.Reverse: return PlayMode.Sequence;
        default: return PlayMode.Sequence;
      }
    });
  }, []);

  // --- 搜索功能 ---
  const handleSearch = useCallback(async (page: number = 0, keywordToSearch: string = searchKeyword) => {
    if (page === 0) {
      if (!keywordToSearch.trim()) {
        setError('请输入搜索关键词');
        return;
      }
      setLastSearchedKeyword(keywordToSearch);
    } else {
      keywordToSearch = lastSearchedKeyword;
    }

    if (!keywordToSearch.trim()) {
      setError('搜索关键词为空，请重新输入');
      return;
    }

    setSearchResults([]);
    setCurrentPage(page);

    const results = await callNeteaseApi('searchMusic', { keyword: keywordToSearch, page: page });

    if (results && Array.isArray(results.songs)) {
      setSearchResults(results.songs);
      setTotalCount(results.songCount || 0);
    } else {
      setError('搜索失败或无结果。');
      setSearchResults([]);
      setTotalCount(0);
    }
  }, [callNeteaseApi, lastSearchedKeyword, searchKeyword]);

  const totalPages = Math.ceil(totalCount / songsPerPage);

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
        currentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentPlayIndex, playList]);

  return (
      // 外层容器使用 h-screen 确保铺满视口高度，并使用 flex-col 垂直布局
      <div className="flex flex-col h-screen bg-gray-100 font-inter">
        {/* 主内容区域：搜索和播放列表 */}
        {/* flex-grow 占据剩余垂直空间，p-4 作为整体内边距，overflow-hidden 防止内部内容溢出 */}
        <div className="flex flex-col lg:flex-row flex-grow overflow-hidden bg-gray-100 p-4">
          {/* 搜索面板 */}
          {/* flex-grow 确保其占据 flex-grow 父容器的剩余宽度，h-full 确保其占据 flex-grow 父容器的全部高度 */}
          <div className="flex flex-col flex-grow p-5 bg-white rounded-lg shadow-xl mr-2 h-full">
            {/* 搜索/操作区域 */}
            <div className="flex flex-col md:grid md:grid-cols-2 gap-4 mb-6 pb-4 border-b border-gray-200 flex-shrink-0">
              {/* 按歌曲 ID 播放 */}
              <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-3">按歌曲 ID 播放</h3>
                <div className="flex">
                  <input
                      type="text"
                      value={musicIdInput}
                      onChange={(e) => setMusicIdInput(e.target.value)}
                      placeholder="输入网易云音乐 ID"
                      className="flex-grow p-2 mr-2 border border-gray-300 rounded-md outline-none
                             focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  />
                  <button
                      onClick={handlePlayDirectly}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700
                             disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                  >
                    播放
                  </button>
                </div>
              </div>

              {/* 搜索歌曲 */}
              <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-3">搜索歌曲</h3>
                <div className="flex">
                  <input
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder="输入歌曲名或歌手名搜索"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSearch(0, searchKeyword);
                        }
                      }}
                      className="flex-grow p-2 mr-2 border border-gray-300 rounded-md outline-none
                             focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                  />
                  <button
                      onClick={() => handleSearch(0, searchKeyword)}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700
                             disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                  >
                    搜索
                  </button>
                </div>
              </div>
            </div>

            {/* 错误信息 */}
            {error && <p className="text-red-600 mb-4 flex-shrink-0">{error}</p>}

            {/* 搜索结果 / 当前歌曲显示 (flex-grow 是这里的关键，确保它占据剩余空间) */}
            {searchResults.length > 0 && (
                <div className="flex flex-col flex-grow min-h-0"> {/* 添加 min-h-0 */}
                  <h3 className="text-xl font-semibold text-gray-700 mb-3 flex-shrink-0">
                    搜索结果 ({totalCount} 首):
                  </h3>

                  {/* 可滚动的搜索结果列表 (flex-grow 确保它占据所有可用空间并滚动) */}
                  <div className="overflow-y-auto border border-gray-200 rounded-md flex-grow">
                    <ul className="divide-y divide-gray-200">
                      {searchResults.map((song) => (
                          <li
                              key={song.id}
                              onClick={() => handleSongClick(song)}
                              className="p-3 flex items-center transition duration-150 hover:bg-gray-50 cursor-pointer"
                          >
                            {song.albumPic && (
                                <img
                                    src={song.albumPic}
                                    alt="封面"
                                    className="w-10 h-10 rounded mr-3 object-cover flex-shrink-0"
                                />
                            )}
                            <div className="flex-grow min-w-0">
                              <p className="font-medium text-gray-900 truncate">{song.name}</p>
                              <p className="text-sm text-gray-500 truncate">
                                {song.authors.join(', ')}
                              </p>
                            </div>
                          </li>
                      ))}
                    </ul>
                  </div>

                  {/* 分页控制 */}
                  {totalPages > 1 && (
                      <div className="flex justify-center items-center mt-4 space-x-2 flex-shrink-0">
                        <button
                            onClick={() => handleSearch(currentPage - 1, lastSearchedKeyword)}
                            disabled={currentPage === 0 || loading}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                        >
                          上一页
                        </button>
                        <span className="text-gray-700">
                    第 {currentPage + 1} 页 / 共 {totalPages} 页
                  </span>
                        <button
                            onClick={() => handleSearch(currentPage + 1, lastSearchedKeyword)}
                            disabled={currentPage >= totalPages - 1 || loading}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                        >
                          下一页
                        </button>
                      </div>
                  )}
                </div>
            )}
          </div>

          {/* 分隔线 */}
          <div className="flex-shrink-0 w-px bg-gray-300 hidden lg:block"></div>

          {/* 播放列表区域 */}
          {/* 移除了 flex-grow，并添加了 lg:w-96 来固定大屏幕下的宽度 */}
          <div className="flex flex-col p-5 bg-white rounded-lg shadow-xl ml-2 h-full w-full lg:w-96">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center lg:text-left">当前播放列表 ({playList.length} 首)</h3>

            {playList.length === 0 ? (
                <p className="text-gray-500 text-center lg:text-left">播放列表为空，快去搜索或添加音乐吧！</p>
            ) : (
                <>
                  {/* 播放模式切换按钮 */}
                  <div className="mb-4 flex justify-center lg:justify-start flex-shrink-0">
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
                  <div ref={playListScrollRef} className="border border-gray-200 rounded-md flex-grow overflow-y-auto">
                    <ul className="divide-y divide-gray-200">
                      {playList.map((music, index) => (
                          <li
                              key={music.id + '-' + index}
                              onClick={() => handlePlayListItemClick(music, index)}
                              className={`p-3 flex items-center transition duration-150 cursor-pointer
                                  hover:bg-gray-50 ${index === currentPlayIndex ? 'bg-blue-100 font-semibold' : ''}`}
                          >
                            {music.albumPic && (
                                <img src={music.albumPic} alt="封面" className="w-8 h-8 rounded mr-2 object-cover flex-shrink-0" />
                            )}
                            <div className="flex-grow min-w-0">
                              <p className="text-sm text-gray-900 truncate">{music.name}</p>
                              <p className="text-xs text-gray-500 truncate">{music.authors.join(', ')}</p>
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
          <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-4">
            {currentMusicDetail ? (
                <>
                  {/* 左侧：专辑封面 + 歌曲信息 */}
                  <div className="flex items-center space-x-3 flex-grow min-w-0 max-w-[40%]">
                    {currentMusicDetail.albumPic && (
                        <img
                            src={currentMusicDetail.albumPic}
                            alt="专辑封面"
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                    )}
                    <div className="flex flex-col overflow-hidden">
                      <p className="font-bold text-lg truncate">{currentMusicDetail.name}</p>
                      <p className="text-sm text-gray-300 truncate">{currentMusicDetail.authors.join(', ')}</p>
                    </div>
                  </div>

                  {/* 中间：播放控制 (上一首/音频/下一首) */}
                  <div className="flex items-center space-x-3 justify-center flex-1 min-w-[200px]">
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
                    <audio ref={audioRef} controls className="flex-grow max-w-[36rem]">
                      {currentMusicUrl && <source src={currentMusicUrl} type="audio/mpeg" />}
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
