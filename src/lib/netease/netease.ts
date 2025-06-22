import axios, { AxiosResponse } from 'axios';

const APP_VERSION = '3.1.11';

const HEADERS = {
  'Referer': 'https://music.163.com',
  'User-Agent': `Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/91.0.4472.164 NeteaseMusicDesktop/${APP_VERSION}`,
};

function mergeCookies(oldCookies: string[], setCookieHeaders: string[]): string[] {
  const cookieMap: Record<string, string> = {};

  for (const cookie of oldCookies) {
    const [key, value] = cookie.split('=');
    cookieMap[key.trim()] = value.trim();
  }

  for (const setCookie of setCookieHeaders) {
    const [cookie] = setCookie.split(';');
    const [key, value] = cookie.split('=');
    cookieMap[key.trim()] = value.trim();
  }

  return Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`);
}

function ensureInitCookies(cookie: string[]): string[] {
  const hasAppVer = cookie.some(c => c.startsWith('appver='));
  const hasOs = cookie.some(c => c.startsWith('os='));
  return [
    ...cookie,
    ...(hasAppVer ? [] : [`appver=${APP_VERSION}`]),
    ...(hasOs ? [] : ['os=pc']),
  ];
}

function formattedTime(timestamp: number | string): string {
  const date = new Date(Number(timestamp));
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type ApiResponse<T = any> = {
  data: T;
  cookie: string[];
};

async function get(
    url: string,
    cookie: string[]
): Promise<ApiResponse> {
  const fullCookie = ensureInitCookies(cookie);
  const cookieHeader = fullCookie.join('; ');

  const res: AxiosResponse = await axios.get(url, {
    headers: {
      ...HEADERS,
      Cookie: cookieHeader,
    },
  });

  const setCookieHeader = res.headers['set-cookie'] || [];
  const updatedCookies = mergeCookies(fullCookie, setCookieHeader);

  return {
    data: res.data,
    cookie: updatedCookies,
  };
}

async function post(
    url: string,
    data: any,
    cookie: string[]
): Promise<ApiResponse> {
  const fullCookie = ensureInitCookies(cookie);
  const cookieHeader = fullCookie.join('; ');

  const res: AxiosResponse = await axios.post(url, data, {
    headers: {
      ...HEADERS,
      Cookie: cookieHeader,
      'Content-Type': 'application/json',
    },
  });

  const setCookieHeader = res.headers['set-cookie'] || [];
  const updatedCookies = mergeCookies(fullCookie, setCookieHeader);

  return {
    data: res.data,
    cookie: updatedCookies,
  };
}

async function postForm(
    url: string,
    data: any,
    cookie: string[]
): Promise<ApiResponse> {
  const fullCookie = ensureInitCookies(cookie);
  const cookieHeader = fullCookie.join('; ');

  const res: AxiosResponse = await axios.post(
      url,
      new URLSearchParams(data as Record<string, string>).toString(),
      {
        headers: {
          ...HEADERS,
          Cookie: cookieHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
  );

  const setCookieHeader = res.headers['set-cookie'] || [];
  const updatedCookies = mergeCookies(fullCookie, setCookieHeader);

  return {
    data: res.data,
    cookie: updatedCookies,
  };
}
export async function getMusicLink(
    id: string,
    level: string,
    cookie: string[]
): Promise<ApiResponse> {
  const url = `http://music.163.com/api/song/enhance/player/url/v1?encodeType=mp3&ids=[${id}]&level=${level}`;
  const { data: rawData, cookie: updatedCookies } = await get(url, cookie);

  return {
    data: rawData.data?.[0]?.url,
    cookie: updatedCookies,
  };
}

export async function getMusicDetail(
    id: string,
    cookie: string[]
): Promise<ApiResponse> {
  const url = `http://music.163.com/api/v3/song/detail?c=%5B%7B%22id%22%3A%20${id}%7D%5D`;
  const { data: rawData, cookie: updatedCookies } = await get(url, cookie);

  const songObj = rawData?.songs?.[0];
  const name = songObj.name || '';
  const duration = songObj.dt ?? 0;
  const authors = Array.isArray(songObj.ar)
      ? songObj.ar.map((author: any) => author.name) : [];
  const albumPic = songObj.al?.picUrl ?? '';

  return {
    data: { id, name, duration, authors, albumPic },
    cookie: updatedCookies,
  };
}

export async function getLyrics(
    id: string,
    cookie: string[]
): Promise<ApiResponse> {
  const url = `http://music.163.com/api/song/lyric?id=${id}&lv=0&tv=0`;
  const { data: rawData, cookie: updatedCookies } = await get(url, cookie);

  const lrc = rawData?.lrc?.lyric || '';
  const sub_lrc = rawData?.tlyric?.lyric || '';

  return {
    data: { lrc, sub_lrc },
    cookie: updatedCookies,
  };
}

export async function getQRCodeUrl(
    cookie: string[]
): Promise<ApiResponse<string | null>> {
  const url = "http://music.163.com/api/login/qrcode/unikey?type=1";
  const { data: rawData, cookie: updatedCookies } = await get(url, cookie);

  const uniKey = rawData?.unikey || null;

  return {
    data: `http://music.163.com/login?codekey=${uniKey}`,
    cookie: updatedCookies
  };
}

export async function getQRCodeStatus(
    uniKey: string,
    cookie: string[]
): Promise<ApiResponse> {
  const url = `http://music.163.com/api/login/qrcode/client/login?type=1&key=${uniKey}`;
  const { data: rawData, cookie: updatedCookies } = await get(url, cookie);

  let status: string = 'unknown';
  const code = rawData?.code;

  if (code === 801 || code === 802) {
    status = 'waiting';
  } else if (code === 800) {
    status = 'expired';
  } else if (code === 803) {
    status = 'success';
  }

  return { data: status, cookie: updatedCookies };
}

export async function getPlaylist(
    id: string,
    cookie: string[]
): Promise<ApiResponse> {
  const url = `http://music.163.com/api/v6/playlist/detail?id=${id}&n=10000`;
  const { data: rawData, cookie: updatedCookies } = await get(url, cookie);

  const playlistObject = rawData?.playlist || {};

  const songs: any[] = [];
  if (Array.isArray(playlistObject.tracks)) {
    playlistObject.tracks.forEach((track: any) => {
      songs.push({
        id: track.id,
        name: track.name || '',
        duration: track.dt ?? 0,
        authors: Array.isArray(track.ar) ? track.ar.map((author: any) => author.name) : [],
        albumPic: track.al?.picUrl || '',
      });
    });
  }

  const creatorName = playlistObject.creator?.nickname || '';
  const name = playlistObject.name || '';
  const createTime = playlistObject.createTime ? formattedTime(playlistObject.createTime) : '';
  const description = playlistObject.description || '';

  return {
    data: { creatorName, name, createTime, description, songs },
    cookie: updatedCookies,
  };
}

export async function getAlbum(
    id: string,
    cookie: string[]
): Promise<ApiResponse> {
  const url = `http://music.163.com/api/v1/album/${id}`;
  const { data: rawData, cookie: updatedCookies } = await get(url, cookie);

  const albumDetails = rawData?.album || {};

  const songs: any[] = [];
  const picUrl = albumDetails.picUrl || '';

  if (Array.isArray(rawData?.songs)) {
    rawData.songs.forEach((song: any) => {
      songs.push({
        id: song.id,
        name: song.name || '',
        duration: song.dt ?? 0,
        authors: Array.isArray(song.ar) ? song.ar.map((author: any) => author.name) : [],
        albumPic: picUrl,
      });
    });
  }

  const name = albumDetails.name || '';
  const creatorName = albumDetails.artist?.name || '';
  const createTime = albumDetails.publishTime ? formattedTime(albumDetails.publishTime) : '';
  const description = albumDetails.description || '';

  return {
    data: { creatorName, name, createTime, description, songs },
    cookie: updatedCookies,
  };
}

const SearchType = {
  MUSIC: 1,
  ALBUM: 10,
  PLAYLIST: 1000,
};

async function _search(
    keyword: string,
    page: number,
    typeKey: number,
    cookie: string[]
): Promise<ApiResponse> {
  const url = "http://music.163.com/api/cloudsearch/pc/";
  const data = {
    s: keyword,
    offset: 30 * page, // Each page has 30 items
    limit: 30,
    type: typeKey,
    total: true,
  };

  return await postForm(url, data, cookie);
}

export async function searchMusic(
    keyword: string,
    page: number,
    cookie: string[]
): Promise<ApiResponse> {
  const { data: rawData, cookie: updatedCookies } = await _search(keyword, page, SearchType.MUSIC, cookie);

  const songs: any[] = [];
  const songsArray = rawData?.result?.songs;
  const songCount = rawData?.result?.songCount;

  if (Array.isArray(songsArray)) {
    songsArray.forEach((song: any) => {
      songs.push({
        id: String(song.id),
        name: song.name || '',
        duration: song.dt ?? 0,
        authors: Array.isArray(song.ar) ? song.ar.map((author: any) => author.name) : [],
        albumPic: song.al?.picUrl || '',
      });
    });
  }

  return { data: { songs, songCount }, cookie: updatedCookies };
}

export async function searchPlaylist(
    keyword: string,
    page: number,
    cookie: string[]
): Promise<ApiResponse> {
  const { data: rawData, cookie: updatedCookies } = await _search(keyword, page, SearchType.PLAYLIST, cookie);

  const playlists: any[] = [];
  const playlistsArray = rawData?.result?.playlists;
  const playlistCount = rawData?.result?.playlistCount;

  if (Array.isArray(playlistsArray)) {
    playlistsArray.forEach((playlist: any) => {
      playlists.push({
        id: String(playlist.id),
        name: playlist.name || '',
        creatorName: playlist.creator?.nickname || ''
      });
    });
  }

  return { data: { playlists, playlistCount }, cookie: updatedCookies };
}

export async function searchAlbum(
    keyword: string,
    page: number,
    cookie: string[]
): Promise<ApiResponse> {
  const { data: rawData, cookie: updatedCookies } = await _search(keyword, page, SearchType.ALBUM, cookie);

  const albums: any[] = [];
  const albumsArray = rawData?.result?.albums;
  const albumCount = rawData?.result?.albumCount;

  if (Array.isArray(albumsArray)) {
    albumsArray.forEach((album: any) => {
      albums.push({
        id: String(album.id),
        name: album.name || '',
        creatorName: album.artist?.name || '',
        albumPic: album.picUrl || '',
      });
    });
  }

  return { data: { albums, albumCount }, cookie: updatedCookies };
}

export async function getDailyRecommendation(
    cookie: string[]
): Promise<ApiResponse> {
  const url = "http://music.163.com/api/v3/discovery/recommend/songs";
  const { data: rawData, cookie: updatedCookies } = await post(url, {}, cookie);

  const musics: any[] = [];
  const dailySongsArray = rawData?.data?.dailySongs;

  if (Array.isArray(dailySongsArray)) {
    dailySongsArray.forEach((song: any) => {
      musics.push({
        id: String(song.id),
        name: song.name || '',
        duration: song.dt ?? 0,
        authors: Array.isArray(song.ar) ? song.ar.map((author: any) => author.name) : [],
        albumPic: song.al?.picUrl || '',
      });
    });
  }

  return { data: musics, cookie: updatedCookies };
}

export async function getLoginStatus(
    cookie: string[]
): Promise<ApiResponse> {
  const accountRes = await post("http://music.163.com/api/w/nuser/account/get", {}, cookie);
  const accountData = accountRes.data;

  if (!accountData?.account || !accountData?.profile) {
    return {
      data: null,
      cookie: accountRes.cookie,
    };
  }

  const uid = accountData.profile.userId;
  const detailRes = await post(`http://music.163.com/api/v1/user/detail/${uid}`, {}, accountRes.cookie);
  const profile = detailRes.data?.profile;

  return {
    data: {
      uid,
      nickname: profile?.nickname ?? '',
      signature: profile?.signature ?? '',
      avatarUrl: profile?.defaultAvatar ? '' : (profile?.avatarUrl ?? ''),
    },
    cookie: detailRes.cookie,
  };
}

export async function getUserPlaylists(
    uid: string,
    page: number,
    cookie: string[]
): Promise<ApiResponse> {
  const data = {
    uid,
    limit: 300000, // TODO 暂时不知道
    offset: 30 * page,
    includeVideo: true,
  };

  const { data: rawData, cookie: updatedCookies } = await postForm("http://music.163.com/api/user/playlist", data, cookie);

  const playlists: any[] = [];
  const array = rawData?.playlist;

  if (Array.isArray(array)) {
    array.forEach((playlist: any) => {
      playlists.push({
        id: String(playlist.id),
        name: playlist.name || '',
        creatorName: playlist.creator?.nickname || '',
      });
    });
  }

  return {
    data: playlists,
    cookie: updatedCookies,
  };
}

export async function logout(
    cookie: string[]
): Promise<ApiResponse> {
  await get("http://music.163.com/api/user/logout", cookie);

  return {
    data: 'ok',
    cookie: [],
  };
}