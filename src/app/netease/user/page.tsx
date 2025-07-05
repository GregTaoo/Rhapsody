'use client'

import {usePlayer} from "@/components/hook/usePlayer";
import {NeteaseUser} from "@/components/netease/NeteaseUser";
import {useRouter} from "next/navigation";

export default function Home() {
  const router = useRouter();
  const {
    callNeteaseApi,
    setError
  } = usePlayer();

  return (
    <NeteaseUser
      openPlaylist={(id) => router.push('/netease/playlist/' + id)}
      openDailyRecommend={() => router.push('/netease/user/daily')}
      callNeteaseApi={callNeteaseApi}
      setError={setError}
    />
  )
}
