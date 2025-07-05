'use client'

import {usePlayer} from "@/components/hook/usePlayer";
import {PlaylistDetail} from "@/components/PlaylistDetail";
import {use} from "react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function Home({ params }: PageProps) {
  const { id } = use(params);
  
  const {
    callNeteaseApi,
    playAndAdd,
    switchList,
    setError
  } = usePlayer();

  return (
    <PlaylistDetail
      id={id} isAlbum={false} data={undefined}
      handlePlayAndAddToList={playAndAdd}
      handlePlayListSwitch={switchList}
      callNeteaseApi={callNeteaseApi}
      setError={setError}
    />
  )
}
