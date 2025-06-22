'use client';

import React, {useEffect, useState} from 'react';
import {Music} from '@/app/components/netease.type';

interface PlaylistDetailProps {
  id: string;
  isAlbum: boolean;
  handlePlayAndAddToList: (id: string, isFromSearch?: boolean) => void;
  callNeteaseApi: (
      appName: string, params?: Record<string, any>) => Promise<any>;
  setError: (message: string) => void;
}

export const PlaylistDetail: React.FC<PlaylistDetailProps> = ({
  id, isAlbum, handlePlayAndAddToList, handlePlayListSwitch, callNeteaseApi, setError
}) => {
  const [songs, setSongs] = useState<Music[]>([]);
  const [listName, setListName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await callNeteaseApi(isAlbum ? 'getAlbum' : 'getPlaylist',
            {id});

        if (!data) throw new Error('返回数据为空');
        const songList = data.songs || [];
        if (!Array.isArray(songList)) throw new Error('曲目列表格式不正确');

        setListName(data.name || data.title || (isAlbum ? '专辑' : '歌单'));
        setSongs(songList);
      } catch (e: any) {
        setError(e.message || '加载失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isAlbum, callNeteaseApi, setError]);

  return (
      <div className="flex flex-col h-full min-h-0">
        {loading ? (
            <p className="text-gray-500 text-center">正在加载{isAlbum ?
                '专辑' :
                '歌单'}...</p>
        ) : (
            songs.length > 0 && (
                <>
                  <div className="text-x font-semibold text-gray-700 mb-3 flex-shrink-0">
                    {listName}（{songs.length} 首）
                    <button
                        onClick={() => handlePlayListSwitch(songs)}
                        disabled={loading}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 whitespace-nowrap cursor-pointer"
                    >
                      播放全部
                    </button>
                  </div>

                  <div
                      className="overflow-y-auto border border-gray-200 rounded-md flex-grow">
                    <ul className="divide-y divide-gray-200">
                      {songs.map((song) => (
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
            )
        )}
      </div>
  );
};
