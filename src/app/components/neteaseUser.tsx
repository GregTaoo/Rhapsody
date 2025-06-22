'use client';

import React, {useEffect, useState, useRef, useCallback} from 'react';
import {QRCodeCanvas} from 'qrcode.react';

interface UserProfile {
  uid: string;
  nickname: string;
  signature: string;
  avatarUrl: string;
}

interface Playlist {
  id: string;
  name: string;
  creatorName: string;
}

interface NeteaseUserProps {
  openPlaylist: (id: string, isAlbum: boolean) => void;
  callNeteaseApi: (apiName: string, args?: any) => Promise<any>;
  setError: (msg: string) => void;
}

export const NeteaseUser: React.FC<NeteaseUserProps> = ({
                                                          openPlaylist,
                                                          callNeteaseApi,
                                                          setError,
                                                        }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [uniKey, setUniKey] = useState<string>('');
  const [loginStatus, setLoginStatus] = useState<'expired' | 'waiting' | 'success' | 'unknown' | null>(
      null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 拉取用户歌单
  const fetchPlaylists = useCallback(async (uid: string) => {
    try {
      const res = await callNeteaseApi('getUserPlaylists', {uid, page: 0});
      setUserPlaylists(res || []);
    } catch (e) {
      console.error('获取用户歌单失败', e);
      setError('获取用户歌单失败');
    }
  }, [callNeteaseApi, setError]);

  // 获取二维码 + 初始化
  const fetchQRCode = useCallback(async () => {
    try {
      const url: string = await callNeteaseApi('getQRCodeUrl');
      setQrCodeUrl(url);
      setLoginStatus('waiting');

      const parts = url.split('=');
      setUniKey(parts[parts.length - 1] || '');

      setUserProfile(null);
      setUserPlaylists([]);
    } catch (e) {
      console.error('获取二维码失败', e);
      setError('获取二维码失败');
      setLoginStatus('unknown');
    }
  }, [callNeteaseApi, setError]);

  // 初始化：先试图登录，不行再扫码
  useEffect(() => {
    const init = async () => {
      try {
        const profile: UserProfile = await callNeteaseApi('getLoginStatus');
        if (profile?.uid) {
          setUserProfile(profile);
          setLoginStatus('success');
          await fetchPlaylists(profile.uid);
          return;
        }
      } catch {
        // 忽略错误，扫码流程
      }

      await fetchQRCode();
    };

    init();
  }, []);

  // 轮询二维码状态
  useEffect(() => {
    if (!uniKey) return;

    const checkStatus = async () => {
      try {
        const status = await callNeteaseApi('getQRCodeStatus', {uniKey});
        setLoginStatus(status);

        if (status === 'success') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }

          try {
            const profile: UserProfile = await callNeteaseApi('getLoginStatus');
            if (profile?.uid) {
              setUserProfile(profile);
              setLoginStatus('success');
              await fetchPlaylists(profile.uid);
            } else {
              setError('扫码成功但无法获取用户信息');
              setLoginStatus('unknown');
            }
          } catch (err) {
            setError('扫码成功但无法获取用户信息');
            setLoginStatus('unknown');
          }
        } else if (status === 'expired' || status === 'unknown') {
          await fetchQRCode();
        }
      } catch (e) {
        console.error('二维码状态失败', e);
        setError('二维码状态检查失败');
        setLoginStatus('unknown');
      }
    };

    checkStatus();
    intervalRef.current = setInterval(checkStatus, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [uniKey, callNeteaseApi, fetchQRCode, fetchPlaylists, setError]);

  const handleLogout = async () => {
    callNeteaseApi('logout');
    setLoginStatus('expired');
    await fetchQRCode();
  };

  return (
      <div className="flex flex-col h-full min-h-0 p-4">
        {loginStatus !== 'success' && (
            <div className="flex flex-col h-full min-h-0 p-4 items-center justify-center text-center">
              {qrCodeUrl ? (
                  <>
                    <p className="mb-2 text-gray-700">请使用网易云音乐APP扫码登录</p>
                    <QRCodeCanvas value={qrCodeUrl} size={200}/>
                  </>
              ) : (
                  <p className="text-gray-500">加载中...</p>
              )}
              {loginStatus === 'expired' && (
                  <p className="text-red-600 mt-2">二维码已过期，正在重新生成...</p>
              )}
              {loginStatus === 'unknown' && (
                  <p className="text-red-600 mt-2">二维码状态异常，正在重新生成...</p>
              )}
              {loginStatus === 'waiting' && (
                  <p className="text-gray-600 mt-2">等待扫码...</p>
              )}
            </div>
        )}

        {loginStatus === 'success' && userProfile && (
            <>
              <div className="flex items-center mb-4 space-x-4">
                {userProfile.avatarUrl && (
                    <img
                        src={userProfile.avatarUrl}
                        alt="头像"
                        className="w-16 h-16 rounded-full object-cover"
                    />
                )}
                <div>
                  <p className="font-semibold text-lg text-gray-800">{userProfile.nickname}</p>
                  <p className="text-sm text-gray-500">{userProfile.signature}</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition duration-200 cursor-pointer">
                  登出
                </button>
              </div>

              <h3 className="text-lg font-semibold mb-2 text-gray-800">您的歌单列表</h3>
              <div
                  className="flex-grow overflow-auto border border-gray-200 rounded-md">
                <ul className="divide-y divide-gray-200">
                  {userPlaylists.map((item) => (
                      <li
                          key={item.id}
                          onClick={() => openPlaylist(item.id, false)}
                          className="p-3 flex items-center transition duration-150 hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="flex-grow min-w-0">
                          <p className="font-medium text-gray-900 truncate">{item.name}</p>
                          <p className="text-sm text-gray-500 truncate">
                            {item.creatorName || ''}
                          </p>
                        </div>
                      </li>
                  ))}
                </ul>
              </div>
            </>
        )}
      </div>
  );
};
