'use client';

import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {Music} from '@/components/netease/netease.type';
import {PlayMode, PlayerContext, PlayerContextType} from './context/PlayerContext';

const STORAGE_KEY = 'PLAYER_DATA';

interface PlayerProviderProps {
  children: ReactNode;
}

export const PlayerProvider: React.FC<PlayerProviderProps> = ({children}) => {
  // --- 播放状态 ---
  const [error, setError] = useState<string | null>(null);
  const [currentMusicDetail, setCurrentMusicDetail] = useState<Music | null>(null);
  const [currentMusicUrl, setCurrentMusicUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

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
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({app: appName, ...params}),
        });
        const json = await response.json();

        if (!response.ok || !json.success) {
          setError(json.data || `API 调用 ${appName} 失败。`);
          return null;
        }
        return json.data;
      } catch (err: any) {
        setError(err.message || '发生未知错误。');
        return null;
      }
    },
    [],
  );

  // 播放逻辑 (playMusic)
  const playMusic = useCallback(
    async (music: Music) => {
      setCurrentMusicDetail(music);
      setCurrentMusicUrl(null);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      try {
        const linkData: string = await callNeteaseApi('getMusicLink', {
          id: music.id,
          level: 'lossless',
        });
        if (linkData) {
          setCurrentMusicUrl(linkData);
          if (audioRef.current) {
            audioRef.current.src = linkData;
            audioRef.current.load();
            audioRef.current.play().catch((playError) => {
              console.error('音频播放失败:', playError);
              if (playError.name === 'AbortError') {
                setError('播放可能被浏览器中止，请手动点击播放');
              } else {
                setError(
                  '自动播放失败，请手动点击播放。浏览器可能限制了自动播放。',
                );
              }
            });
          }
        } else {
          setError(`未能获取歌曲 "${music.name}" 的播放链接。`);
        }
      } catch (err: any) {
        setError(err.message || '处理请求时发生错误。');
      }
    },
    [callNeteaseApi],
  );

  // 播放模式计算辅助
  const getNextIndex = useCallback(
    (currentIndex: number, list: Music[], mode: PlayMode): number => {
      if (list.length === 0) return -1;
      switch (mode) {
        case PlayMode.Sequence:
          return (currentIndex + 1) % list.length;
        case PlayMode.Reverse:
          return (currentIndex - 1 + list.length) % list.length;
        case PlayMode.Shuffle: {
          let nextIndex;
          do {
            nextIndex = Math.floor(Math.random() * list.length);
          } while (list.length > 1 && nextIndex === currentIndex);
          return nextIndex;
        }
        default:
          return (currentIndex + 1) % list.length;
      }
    },
    [],
  );

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
    },
    [],
  );

  // 播放下一首
  const playNext = useCallback(() => {
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

  // 播放上一首
  const playPrev = useCallback(() => {
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

  // 临时播放音乐（不加入列表）
  const playById = useCallback(
    async (id: string) => {
      const detailData: Music = await callNeteaseApi('getMusicDetail', {id});
      if (detailData) playMusic(detailData);
    },
    [callNeteaseApi, playMusic],
  );

  // 播放并添加到播放列表
  const playAndAdd = useCallback(
    async (id: string, isFromSearch: boolean = false) => {
      const detailData: Music = await callNeteaseApi('getMusicDetail', {id});
      if (detailData) {
        setPlayList((prevList) => {
          let newList = prevList;
          const existingIndex = prevList.findIndex((m) => m.id === detailData.id);
          if (existingIndex === -1) {
            newList = [...prevList, detailData];
          }
          if (isFromSearch || prevList.length === 0 || existingIndex !== -1) {
            const finalIndex =
              existingIndex !== -1 ? existingIndex : newList.length - 1;
            setCurrentPlayIndex(finalIndex);
            playMusic(newList[finalIndex]);
          }
          return newList;
        });
      } else {
        setError('未能获取音乐详情。');
      }
    },
    [callNeteaseApi, playMusic],
  );

  const playAt = useCallback(
    (index: number) => {
      if (index < 0 || index >= playList.length) return;
      setCurrentPlayIndex(index);
      playMusic(playList[index]);
    },
    [playList, playMusic]
  );

  // 切换播放列表
  const switchList = useCallback(
    (newList: Music[]) => {
      setPlayList(() => {
        if (newList.length > 0) {
          setCurrentPlayIndex(0);
          playMusic(newList[0]);
        }
        return newList;
      });
    },
    [playMusic],
  );

  // 删除播放列表中的项
  const removeFromList = useCallback(
    (index: number) => {
      setPlayList((prev) => {
        const newList = [...prev];
        newList.splice(index, 1);
        if (index < currentPlayIndex) {
          setCurrentPlayIndex(currentPlayIndex - 1);
        } else if (index === currentPlayIndex && playList.length > 0) {
          const nextIndex = (currentPlayIndex + 1) % playList.length;
          setCurrentPlayIndex(nextIndex === 0 ? 0 : 1);
          playMusic(playList[nextIndex]);
        }
        return newList;
      });
    },
    [currentPlayIndex, playList, playMusic],
  );

  // 切换播放模式
  const toggleMode = useCallback(() => {
    setPlayMode((prevMode) => {
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

  // 监听歌曲结束事件，自动播放下一首
  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const handleEnded = () => {
      if (playList.length > 0) {
        playNext();
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
  }, [playList, playNext]);

  // 恢复播放器状态
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved) as {
          playList: Music[];
          currentPlayIndex: number;
          playMode: PlayMode;
        };
        if (state.playList.length > 0) {
          setPlayList(state.playList);
          setPlayMode(state.playMode);
          const idx = state.currentPlayIndex >= 0 ? state.currentPlayIndex : 0;
          setCurrentPlayIndex(idx);
          playMusic(state.playList[idx]);
        }
      }
    } catch {
    }
  }, [playMusic]);

  // 保存播放器状态到 localStorage（监听列表、索引、模式）
  useEffect(() => {
    try {
      const state = {
        playList,
        currentPlayIndex,
        playMode,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
    }
  }, [playList, currentPlayIndex, playMode]);

  // Context 提供的值
  const contextValue: PlayerContextType = {
    current: currentMusicDetail,
    currentUrl: currentMusicUrl,
    playList,
    index: currentPlayIndex,
    mode: playMode,
    audioRef,
    playById,
    playAndAdd,
    playNext,
    playPrev,
    playAt,
    removeFromList,
    switchList,
    toggleMode,
    callNeteaseApi,
    setError,
    error,
  };

  return (
    <>
      <PlayerContext.Provider value={contextValue}>
        {children}
      </PlayerContext.Provider>
      {/* audio 放到 Provider 外层，保证挂载 */}
      <audio ref={audioRef} style={{display: 'none'}}/>
    </>
  );
};
