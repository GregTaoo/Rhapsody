'use client'

import {usePlayer} from "@/components/hook/usePlayer";
import {PlaylistDetail} from "@/components/PlaylistDetail";
import {useEffect, useState} from "react";

export default function Home() {
  const [data, setData] = useState<any>({});
  const {
    callNeteaseApi,
    playAndAdd,
    switchList,
    setError
  } = usePlayer();

  useEffect(() => {
    const fetchData = async () => {
      const data = await callNeteaseApi('getDailyRecommendation');
      setData({ songs: data, name: '网易云日推' });
    };

    fetchData();
  }, [callNeteaseApi]);

  return (
    <PlaylistDetail
      id={undefined} isAlbum={false} data={data}
      handlePlayAndAddToList={playAndAdd}
      handlePlayListSwitch={switchList}
      callNeteaseApi={callNeteaseApi}
      setError={setError}
    />
  )
}
