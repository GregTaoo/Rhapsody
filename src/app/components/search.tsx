import React, {useCallback, useState} from 'react';
import {Music} from '@/app/components/netease.type';

export function Search({
                         handlePlayAndAddToList,
                         callNeteaseApi,
                         setError,
                       }) {
  const [musicIdInput, setMusicIdInput] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [lastSearchedKeyword, setLastSearchedKeyword] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Music[]>([]);
  const [searchType, setSearchType] = useState<'music' | 'playlist' | 'album'>(
      'music');

  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const songsPerPage = 30;

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

        const results = await callNeteaseApi(
            searchType === 'music' ? 'searchMusic'
                : searchType === 'playlist' ? 'searchPlaylist'
                    : 'searchAlbum',
            {keyword: keywordToSearch, page: page},
        );

        if (results && Array.isArray(
            results.songs || results.playlists || results.albums)) {
          const list = results.songs || results.playlists || results.albums;
          setSearchResults(list);
          setTotalCount(results.songCount || results.playlistCount ||
              results.albumCount || 0);
        } else {
          setError('搜索失败或无结果。');
          setSearchResults([]);
          setTotalCount(0);
        }

        setLoading(false);
      },
      [callNeteaseApi, lastSearchedKeyword, searchKeyword, searchType],
  );

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
      <div className="flex flex-col h-full min-h-0">
        {/* 上方：按ID播放 + 搜索输入 */}
        <div
            className="flex flex-col md:grid md:grid-cols-2 gap-4 mb-6 pb-4 border-b border-gray-200 flex-shrink-0">
          {/* 按 ID 播放 */}
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <input
                  type="text"
                  value={musicIdInput}
                  onChange={(e) => setMusicIdInput(e.target.value)}
                  placeholder="输入网易云音乐 ID"
                  className="flex-1 min-w-0 p-2 border border-gray-300 rounded-md outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              />
              <button
                  onClick={handlePlayDirectly}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 whitespace-nowrap"
              >
                播放
              </button>
            </div>
          </div>

          {/* 搜索模块 */}
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as any)}
                  className="p-2 border border-gray-300 rounded-md text-gray-800 bg-white"
              >
                <option value="music">歌曲</option>
                <option value="playlist">歌单</option>
                <option value="album">专辑</option>
              </select>
              <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="输入关键词"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch(0, searchKeyword);
                  }}
                  className="flex-1 min-w-0 p-2 border border-gray-300 rounded-md outline-none focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
              />
              <button
                  onClick={() => handleSearch(0, searchKeyword)}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 whitespace-nowrap"
              >
                搜索
              </button>
            </div>
          </div>
        </div>

        {/* 中间：搜索结果标题 + 可滚动列表 */}
        <div className="flex flex-col flex-grow min-h-0">
          {/* 固定搜索结果标题 */}
          {searchResults.length > 0 && (
              <div
                  className="flex-shrink-0 text-x font-semibold text-gray-700 mb-1">
                搜索结果 ({totalCount} 项):
              </div>
          )}

          {/* 可滚动结果列表 */}
          <div
              className="flex-grow overflow-auto border border-gray-200 rounded-md">
            <ul className="divide-y divide-gray-200">
              {searchResults.map((item: any) => (
                  <li
                      key={item.id}
                      onClick={() => {
                        if (searchType === 'music') handlePlayAndAddToList(
                            item.id, true);
                        else setError('点击后功能未实现');
                      }}
                      className="p-3 flex items-center transition duration-150 hover:bg-gray-50 cursor-pointer"
                  >
                    {item.albumPic || item.coverUrl ? (
                        <img
                            src={item.albumPic || item.coverUrl}
                            alt="封面"
                            className="w-10 h-10 rounded mr-3 object-cover flex-shrink-0"
                        />
                    ) : null}
                    <div className="flex-grow min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.name ||
                          item.title}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {item.authors ?
                            item.authors.join(', ') :
                            item.creatorName || item.artistName || ''}
                      </p>
                    </div>
                  </li>
              ))}
            </ul>
          </div>

          {/* 底部分页栏固定 */}
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
