'use client';

import React, { createContext } from 'react';
import type { Music } from '@/components/netease/netease.type';

export enum PlayMode {
  Sequence = 'sequence',
  Shuffle = 'shuffle',
  Reverse = 'reverse',
}

export type PlayerContextType = {
  current: Music | null;
  currentUrl: string | null;
  playList: Music[];
  index: number;
  mode: PlayMode;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  playById: (id: string) => void;
  playAndAdd: (id: string, isFromSearch?: boolean) => void;
  playNext: () => void;
  playPrev: () => void;
  playAt: (index: number) => void;
  removeFromList: (index: number) => void;
  switchList: (list: Music[]) => void;
  toggleMode: () => void;
  callNeteaseApi: (appName: string, params?: Record<string, any>) => Promise<any | null>;
  setError: (msg: string | null) => void;
  error: string | null;
};

export const PlayerContext = createContext<PlayerContextType | null>(null);
