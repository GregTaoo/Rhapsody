'use client'

import {usePlayer} from "@/components/hook/usePlayer";
import {LyricViewer} from "@/components/LyricViewer";

export default function Home() {
  const {
    current,
    audioRef,
    callNeteaseApi,
    setError
  } = usePlayer();

  return (
    <LyricViewer musicId={current?.id} audioRef={audioRef} callNeteaseApi={callNeteaseApi} setError={setError}/>
  )
}
