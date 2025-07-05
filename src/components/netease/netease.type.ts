// --- 类型定义 ---
export interface Music {
  id: string;
  name: string;
  duration: number; // 毫秒
  authors: string[];
  albumPic: string;
}

export interface Playlist {
  creatorName: string,
  name: string,
  createTime: string,
  description: string,
  songs: Music[],
}