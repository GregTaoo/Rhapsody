// pages/api/netease.ts

import { NextApiRequest, NextApiResponse } from 'next';
// 导入 lib/netease.ts 中导出的所有内容
import * as neteaseApi from '../../lib/netease/netease';

// Utility function to parse cookies from request headers
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader?.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
  return cookies;
}

// Utility function to encode/decode Base64
function base64Encode(str: string): string {
  return Buffer.from(str).toString('base64');
}

function base64Decode(encodedStr: string): string {
  return Buffer.from(encodedStr, 'base64').toString('utf8');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只接受 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { app, ...data } = req.body; // 获取 'app' 参数和其余参数
  const args: any = data;

  if (!app || typeof app !== 'string') {
    return res.status(400).json({ message: 'Missing or invalid "app" parameter in request body.' });
  }

  // 1. 获取用户 NETEASE_SESSION cookie
  const cookies = parseCookies(req.headers.cookie || '');
  const neteaseSessionCookie = cookies['NETEASE_SESSION'];
  let currentNeteaseCookies: string[] = [];

  if (neteaseSessionCookie) {
    try {
      const decodedCookie = base64Decode(neteaseSessionCookie);
      // 将解码后的字符串（可能是 "MUSIC_U=xxx; NMTID=yyy" 形式）拆分成数组
      currentNeteaseCookies = decodedCookie.split(';').map(c => c.trim()).filter(Boolean);
    } catch (e) {
      console.error("Failed to decode NETEASE_SESSION cookie:", e);
      // 如果解码失败，则视为没有有效 cookie
      currentNeteaseCookies = [];
    }
  }

  let apiResponse: neteaseApi.ApiResponse; // 使用导入的 ApiResponse 类型

  try {
    switch (app) {
      case 'getMusicLink':
        if (!args.id || !args.level) throw new Error('Missing id or level for getMusicLink');
        apiResponse = await neteaseApi.getMusicLink(String(args.id), String(args.level), currentNeteaseCookies);
        break;
      case 'getMusicDetail':
        if (!args.id) throw new Error('Missing id for getMusicDetail');
        apiResponse = await neteaseApi.getMusicDetail(String(args.id), currentNeteaseCookies);
        break;
      case 'getLyrics':
        if (!args.id) throw new Error('Missing id for getLyrics');
        apiResponse = await neteaseApi.getLyrics(String(args.id), currentNeteaseCookies);
        break;
      case 'getQRCodeUrl':
        apiResponse = await neteaseApi.getQRCodeUrl(currentNeteaseCookies);
        break;
      case 'getQRCodeStatus':
        if (!args.uniKey) throw new Error('Missing uniKey for getQRCodeStatus');
        apiResponse = await neteaseApi.getQRCodeStatus(String(args.uniKey), currentNeteaseCookies);
        break;
      case 'getPlaylist':
        if (!args.id) throw new Error('Missing id for getPlaylist');
        apiResponse = await neteaseApi.getPlaylist(String(args.id), currentNeteaseCookies);
        break;
      case 'getAlbum':
        if (!args.id) throw new Error('Missing id for getAlbum');
        apiResponse = await neteaseApi.getAlbum(String(args.id), currentNeteaseCookies);
        break;
      case 'searchMusic':
        if (!args.keyword) throw new Error('Missing keyword for searchMusic');
        apiResponse = await neteaseApi.searchMusic(String(args.keyword), Number(args.page) ?? 0, currentNeteaseCookies);
        break;
      case 'searchPlaylist':
        if (!args.keyword) throw new Error('Missing keyword for searchPlaylist');
        apiResponse = await neteaseApi.searchPlaylist(String(args.keyword), Number(args.page) ?? 0, currentNeteaseCookies);
        break;
      case 'searchAlbum':
        if (!args.keyword) throw new Error('Missing keyword for searchAlbum');
        apiResponse = await neteaseApi.searchAlbum(String(args.keyword), Number(args.page) ?? 0, currentNeteaseCookies);
        break;
      case 'getDailyRecommendation':
        apiResponse = await neteaseApi.getDailyRecommendation(currentNeteaseCookies);
        break;
      case 'getLoginStatus':
        apiResponse = await neteaseApi.getLoginStatus(currentNeteaseCookies);
        break;
      case 'getUserPlaylists':
        if (!args.uid) throw new Error('Missing uid for getUserPlaylists');
        apiResponse = await neteaseApi.getUserPlaylists(String(args.uid), Number(args.page) ?? 0, currentNeteaseCookies);
        break;
      case 'logout':
        apiResponse = await neteaseApi.logout(currentNeteaseCookies);
        break;
      default:
        return res.status(400).json({ message: `Unknown app: ${app}` });
    }

    // 2. 从 API 响应中更新 NETEASE_SESSION cookie
    let newMusicUCookie: string | undefined;
    for (const cookiePart of apiResponse.cookie) {
      if (cookiePart.startsWith('MUSIC_U=')) {
        newMusicUCookie = cookiePart;
        break;
      }
    }

    if (newMusicUCookie) {
      // Base64 加密并设置 cookie
      const encodedNewSession = base64Encode(newMusicUCookie);
      res.setHeader('Set-Cookie', `NETEASE_SESSION=${encodedNewSession}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`); // 例如，设置一个月有效期
    } else {
      // 如果没有 MUSIC_U，则清除现有 NETEASE_SESSION
      res.setHeader('Set-Cookie', `NETEASE_SESSION=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
    }

    // 返回 API 响应的数据部分
    return res.status(200).json({ success: true, data: apiResponse.data });

  } catch (error: any) {
    console.error(`Error calling Netease API for app ${app}:`, error);
    // 生产环境中，避免返回详细错误信息
    return res.status(500).json({ success: false, data: error.message || 'Internal Server Error' });
  }
}