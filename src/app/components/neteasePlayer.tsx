// components/NeteasePlayer.tsx
'use client';

import React, { useState, useRef } from 'react'; // 移除了 useEffect

// 定义音乐详情和搜索结果的类型
interface Music {
  id: string;
  name: string;
  duration: number; // 毫秒
  authors: string[];
  albumPic: string;
}

interface NeteasePlayerProps {}

const NeteasePlayer: React.FC<NeteasePlayerProps> = () => {
  const [musicId, setMusicId] = useState<string>(''); // 用于直接输入ID
  const [searchKeyword, setSearchKeyword] = useState<string>(''); // 搜索关键词
  const [searchResults, setSearchResults] = useState<Music[]>([]); // 搜索结果
  const [musicDetail, setMusicDetail] = useState<Music | null>(null);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 移除了主题模式状态和相关的 useEffect

  const callNeteaseApi = async (appName: string, params: Record<string, any> = {}) => {
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
        throw new Error(errorData.message || `API call to ${appName} failed.`);
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      console.error(`Error calling ${appName}:`, err);
      setError(err.message || 'An unknown error occurred.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const playMusicById = async (id: string) => {
    setMusicDetail(null);
    setMusicUrl(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    try {
      const detailData: Music = await callNeteaseApi('getMusicDetail', { id: id });
      if (detailData) {
        setMusicDetail(detailData);
      } else {
        setError('未能获取音乐详情。');
        return;
      }

      const linkData: string = await callNeteaseApi('getMusicLink', { id: id, level: 'standard' });
      if (linkData) {
        setMusicUrl(linkData);
        if (audioRef.current) {
          audioRef.current.src = linkData;
          audioRef.current.play().catch(playError => {
            console.error("Audio play failed:", playError);
            setError("自动播放失败，请手动点击播放按钮。浏览器可能限制了自动播放。");
          });
        }
      } else {
        setError('未能获取音乐播放链接。');
      }

    } catch (err: any) {
      setError(err.message || '处理请求时发生错误。');
    }
  };

  const handlePlayDirectly = () => {
    if (musicId) {
      playMusicById(musicId);
    } else {
      setError('请输入音乐 ID');
    }
  };

  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      setError('请输入搜索关键词');
      return;
    }
    setSearchResults([]);
    const results = await callNeteaseApi('searchMusic', { keyword: searchKeyword, page: 0 });
    if (results) {
      setSearchResults(results);
    } else {
      setError('搜索失败或无结果。');
    }
  };

  const handleSongClick = (song: Music) => {
    setMusicId(song.id);
    playMusicById(song.id);
  };

  return (
      // 外层容器只保留浅色模式样式
      <div className="p-5 max-w-2xl mx-auto bg-white rounded-lg shadow-xl mt-8">
        {/* 移除了主题切换按钮 */}

        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">网易云音乐播放器</h2>

        {/* 直接输入ID播放区域 */}
        <div className="mb-6 border-b pb-4 border-gray-200">
          <h3 className="text-xl font-semibold text-gray-700 mb-3">按歌曲 ID 播放</h3>
          <div className="flex">
            <input
                type="text"
                value={musicId}
                onChange={(e) => setMusicId(e.target.value)}
                placeholder="输入网易云音乐 ID"
                className="flex-grow p-2 mr-2 border border-gray-300 rounded-md outline-none
                       focus:ring-blue-500 focus:border-blue-500
                       bg-white text-gray-900" // 移除了 dark: 类
            />
            <button
                onClick={handlePlayDirectly}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700
                       disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              {loading ? '加载中...' : '播放 ID 歌曲'}
            </button>
          </div>
        </div>

        {/* 搜索功能区域 */}
        <div className="mb-6 border-b pb-4 border-gray-200">
          <h3 className="text-xl font-semibold text-gray-700 mb-3">搜索歌曲</h3>
          <div className="flex">
            <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="输入歌曲名或歌手名搜索"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="flex-grow p-2 mr-2 border border-gray-300 rounded-md outline-none
                       focus:ring-green-500 focus:border-green-500
                       bg-white text-gray-900" // 移除了 dark: 类
            />
            <button
                onClick={handleSearch}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700
                       disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              {loading ? '搜索中...' : '搜索'}
            </button>
          </div>

          {searchResults.length > 0 && (
              <div className="mt-4 max-h-60 overflow-y-auto border border-gray-300 rounded-md">
                <ul className="divide-y divide-gray-200">
                  {searchResults.map((song) => (
                      <li
                          key={song.id}
                          onClick={() => handleSongClick(song)}
                          className="p-3 flex items-center transition duration-150
                             hover:bg-gray-50 cursor-pointer" // 移除了 dark: 类
                      >
                        {song.albumPic && (
                            <img src={song.albumPic} alt="封面" className="w-10 h-10 rounded mr-3 object-cover" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{song.name}</p>
                          <p className="text-sm text-gray-500">{song.authors.join(', ')}</p>
                        </div>
                      </li>
                  ))}
                </ul>
              </div>
          )}
        </div>

        {/* 错误信息 */}
        {error && <p className="text-red-600 mb-4">{error}</p>}

        {/* 歌曲详情展示 */}
        {musicDetail && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">当前播放:</h3>
              <div className="flex items-center space-x-4">
                {musicDetail.albumPic && (
                    <img src={musicDetail.albumPic} alt="专辑封面" className="w-24 h-24 rounded-lg shadow-md object-cover" />
                )}
                <div>
                  <p className="text-lg font-bold text-gray-900">{musicDetail.name}</p>
                  <p className="text-md text-gray-600">歌手: {musicDetail.authors.join(', ')}</p>
                  <p className="text-sm text-gray-500">时长: {Math.floor(musicDetail.duration / 1000 / 60)}分{Math.floor((musicDetail.duration / 1000) % 60)}秒</p>
                </div>
              </div>
            </div>
        )}

        {/* 音乐播放器 */}
        {musicUrl && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">音频播放器:</h3>
              <audio ref={audioRef} controls autoPlay className="w-full mt-2">
                <source src={musicUrl} type="audio/mpeg" />
                您的浏览器不支持音频播放。
              </audio>
            </div>
        )}
      </div>
  );
};

export default NeteasePlayer;