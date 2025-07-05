'use client'

import {usePlayer} from "@/components/hook/usePlayer";
import {SearchPanel} from "@/components/SearchPanel";
import {useRouter} from "next/navigation";

export default function Home() {
  const router = useRouter();
  const {
    callNeteaseApi,
    playAndAdd,
    setError
  } = usePlayer();

  return (
    <SearchPanel
      openPlaylist={(id: string) => router.push('/netease/playlist/' + id)}
      handlePlayAndAddToList={playAndAdd}
      callNeteaseApi={callNeteaseApi}
      setError={setError}
    />
  )
}
