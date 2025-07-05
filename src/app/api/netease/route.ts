// app/api/netease/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as neteaseApi from '@/lib/netease/netease';

// 解析 cookies
function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader?.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
  return cookies;
}

function base64Encode(str: string): string {
  return Buffer.from(str).toString('base64');
}

function base64Decode(encodedStr: string): string {
  return Buffer.from(encodedStr, 'base64').toString('utf8');
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { app, ...args } = body;

  if (!app || typeof app !== 'string') {
    return NextResponse.json({ success: false, message: 'Missing or invalid "app" parameter' }, { status: 400 });
  }

  // 获取并解析 cookie
  const cookies = parseCookies(req.headers.get('cookie'));
  let currentNeteaseCookies: string[] = [];

  const encoded = cookies['NETEASE_SESSION'];
  if (encoded) {
    try {
      const decoded = base64Decode(encoded);
      currentNeteaseCookies = decoded.split(';').map(c => c.trim()).filter(Boolean);
    } catch (e) {
      console.error("Failed to decode NETEASE_SESSION:", e);
      currentNeteaseCookies = [];
    }
  }

  let apiResponse: neteaseApi.ApiResponse;

  // 分发 API 请求
  const respond = (message: string) =>
    NextResponse.json({ success: false, message }, { status: 400 });

  switch (app) {
    case 'getMusicLink':
      if (!args.id || !args.level) return respond('Missing id or level');
      apiResponse = await neteaseApi.getMusicLink(String(args.id), String(args.level), currentNeteaseCookies);
      break;
    case 'getMusicDetail':
      if (!args.id) return respond('Missing id');
      apiResponse = await neteaseApi.getMusicDetail(String(args.id), currentNeteaseCookies);
      break;
    case 'getLyrics':
      if (!args.id) return respond('Missing id');
      apiResponse = await neteaseApi.getLyrics(String(args.id), currentNeteaseCookies);
      break;
    case 'getQRCodeUrl':
      apiResponse = await neteaseApi.getQRCodeUrl(currentNeteaseCookies);
      break;
    case 'getQRCodeStatus':
      if (!args.uniKey) return respond('Missing uniKey');
      apiResponse = await neteaseApi.getQRCodeStatus(String(args.uniKey), currentNeteaseCookies);
      break;
    case 'getPlaylist':
      if (!args.id) return respond('Missing id');
      apiResponse = await neteaseApi.getPlaylist(String(args.id), currentNeteaseCookies);
      break;
    case 'getAlbum':
      if (!args.id) return respond('Missing id');
      apiResponse = await neteaseApi.getAlbum(String(args.id), currentNeteaseCookies);
      break;
    case 'searchMusic':
      if (!args.keyword) return respond('Missing keyword');
      apiResponse = await neteaseApi.searchMusic(String(args.keyword), Number(args.page) ?? 0, currentNeteaseCookies);
      break;
    case 'searchPlaylist':
      if (!args.keyword) return respond('Missing keyword');
      apiResponse = await neteaseApi.searchPlaylist(String(args.keyword), Number(args.page) ?? 0, currentNeteaseCookies);
      break;
    case 'searchAlbum':
      if (!args.keyword) return respond('Missing keyword');
      apiResponse = await neteaseApi.searchAlbum(String(args.keyword), Number(args.page) ?? 0, currentNeteaseCookies);
      break;
    case 'getDailyRecommendation':
      apiResponse = await neteaseApi.getDailyRecommendation(currentNeteaseCookies);
      break;
    case 'getLoginStatus':
      apiResponse = await neteaseApi.getLoginStatus(currentNeteaseCookies);
      break;
    case 'getUserPlaylists':
      if (!args.uid) return respond('Missing uid');
      apiResponse = await neteaseApi.getUserPlaylists(String(args.uid), Number(args.page) ?? 0, currentNeteaseCookies);
      break;
    case 'logout':
      apiResponse = await neteaseApi.logout(currentNeteaseCookies);
      break;
    default:
      return respond(`Unknown app: ${app}`);
  }

  // 检查是否需要设置/更新 cookie
  const res = NextResponse.json({ success: true, data: apiResponse.data });

  const newMusicUCookie = apiResponse.cookie.find(c => c.startsWith('MUSIC_U='));
  if (newMusicUCookie) {
    const encoded = base64Encode(newMusicUCookie);
    res.headers.set('Set-Cookie', `NETEASE_SESSION=${encoded}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`);
  } else {
    res.headers.set('Set-Cookie', `NETEASE_SESSION=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  }

  return res;
}
