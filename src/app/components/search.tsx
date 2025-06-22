import React, {useCallback, useState} from 'react';
import {Music} from '@/app/components/neteasePlayer';

export function Search({
                         handlePlayAndAddToList,
                         callNeteaseApi,
                         setError,
                       }) {
  const [musicIdInput, setMusicIdInput] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [lastSearchedKeyword, setLastSearchedKeyword] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Music[]>([]);

  const [loading, setLoading] = useState(false);

  // 分页状态
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const songsPerPage = 30;

  // --- 搜索功能 ---
  const handleSearch = useCallback(
      async (page: number = 0, keywordToSearch: string = searchKeyword) => {
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

        setLoading(true);
        setSearchResults([]);
        setCurrentPage(page);

        const results = await callNeteaseApi('searchMusic',
            {keyword: keywordToSearch, page: page});

        if (results && Array.isArray(results.songs)) {
          setSearchResults(results.songs);
          setTotalCount(results.songCount || 0);
        } else {
          setError('搜索失败或无结果。');
          setSearchResults([]);
          setTotalCount(0);
        }

        setLoading(false);
      }, [callNeteaseApi, lastSearchedKeyword, searchKeyword]);

  const totalPages = Math.ceil(totalCount / songsPerPage);

  const handlePlayDirectly = useCallback(() => {
    if (musicIdInput) {
      handlePlayAndAddToList(musicIdInput);
      setMusicIdInput('');
    } else {
      setError('请输入音乐 ID');
    }
  }, [musicIdInput, handlePlayAndAddToList]);

  return (
      <div
          className="flex flex-col flex-grow p-5 bg-white rounded-lg shadow-xl mr-2 h-full">
        {/* 搜索/操作区域 */}
        <div
            className="flex flex-col md:grid md:grid-cols-2 gap-4 mb-6 pb-4 border-b border-gray-200 flex-shrink-0">
          {/* 按歌曲 ID 播放 */}
          <div>
            <h3 className="text-xl font-semibold text-gray-700 mb-3">按歌曲 ID
              播放</h3>
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

        {/* 搜索结果 / 当前歌曲显示 (flex-grow 是这里的关键，确保它占据剩余空间) */}
        <div className="flex flex-col flex-grow min-h-0"> {/* 添加 min-h-0 */}
          {searchResults.length > 0 && (
              <>
                <h3 className="text-xl font-semibold text-gray-700 mb-3 flex-shrink-0">
                  搜索结果 ({totalCount} 首):
                </h3>

                {/* 可滚动的搜索结果列表 (flex-grow 确保它占据所有可用空间并滚动) */}
                <div
                    className="overflow-y-auto border border-gray-200 rounded-md flex-grow">
                  <ul className="divide-y divide-gray-200">
                    {searchResults.map((song) => (
                        <li
                            key={song.id}
                            onClick={() => handlePlayAndAddToList(song.id,
                                true)}
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
              </>
          )}

          {/* 分页控制 */}
          {totalPages > 1 && (
              <div
                  className="flex justify-center items-center mt-4 space-x-2 flex-shrink-0">
                <button
                    onClick={() => handleSearch(currentPage - 1,
                        lastSearchedKeyword)}
                    disabled={currentPage === 0 || loading}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                >
                  上一页
                </button>
                <span className="text-gray-700">
                第 {currentPage + 1} 页 / 共 {totalPages} 页
              </span>
                <button
                    onClick={() => handleSearch(currentPage + 1,
                        lastSearchedKeyword)}
                    disabled={currentPage >= totalPages - 1 || loading}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
          )}
        </div>
      </div>
  );
}