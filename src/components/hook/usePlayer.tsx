import {useContext} from "react";
import {PlayerContext} from "@/components/context/PlayerContext";

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return ctx;
};