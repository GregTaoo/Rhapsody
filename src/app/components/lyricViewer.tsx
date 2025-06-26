'use client';

import React, { useEffect, useRef, useState } from 'react';

interface LyricViewerProps {
  musicId: string | undefined;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  callNeteaseApi: (app: string, params?: Record<string, any>) => Promise<any>;
  setError: (msg: string) => void;
}

interface LyricLine {
  time: number;
  text: string;
}

function parseLRC(raw: string): LyricLine[] {
  // 支持 \n、\r\n、\r 换行符
  const lines = raw.split(/\r?\n|\r|\\n|\\r|\\r\\n/);
  const result: LyricLine[] = [];

  // 匹配时间标签，形如 [mm:ss.xx] 或 [mm:ss.xxx]
  // 注意这里用全局匹配，方便找到一行内所有时间标签
  const timeTagRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?]/g;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // 过滤注释行，假设注释以 // 开头
    if (trimmedLine.startsWith('//')) continue;

    // 提取所有时间标签
    const timeTags = [...trimmedLine.matchAll(timeTagRegex)];
    if (timeTags.length === 0) continue;

    // 取歌词文本部分，歌词是时间标签后的部分
    // 因为一行可能有多个时间标签，歌词文本是最后一个时间标签后的内容
    const lastTag = timeTags[timeTags.length - 1];
    const text = trimmedLine.slice(lastTag.index! + lastTag[0].length).trim();

    if (!text) continue;

    for (const tag of timeTags) {
      const min = parseInt(tag[1], 10);
      const sec = parseInt(tag[2], 10);
      const milliStr = tag[3] || '0';

      // 计算毫秒精度，位数不同处理不同
      // 例如 .5 表示 500ms, .50 表示 500ms, .500 表示 500ms
      let milli = 0;
      if (milliStr.length === 1) {
        milli = parseInt(milliStr) * 100;
      } else if (milliStr.length === 2) {
        milli = parseInt(milliStr) * 10;
      } else {
        milli = parseInt(milliStr);
      }

      const time = min * 60 + sec + milli / 1000;

      // 如果歌词里含有内嵌时间标签等，可以根据需要再清理，这里简单过滤掉 []
      const cleanText = text.replace(/\[.*?]/g, '').trim();

      if (cleanText && !cleanText.startsWith('//')) {
        result.push({ time, text: cleanText });
      }
    }
  }

  // 按时间排序
  result.sort((a, b) => a.time - b.time);
  return result ? result : [{ time: 0, text: '无歌词' }];
}

/**
 * Merges main lyrics with sub (translation) lyrics based on time proximity.
 * @param main - Array of main lyric lines.
 * @param sub - Array of sub lyric lines.
 * @returns An array of objects, each containing main text, optional sub text, and time.
 */
function mergeLyrics(main: LyricLine[], sub: LyricLine[]): { main: string; sub?: string; time: number }[] {
  // Map through main lyrics and find a corresponding sub lyric within a small time window
  return main.map((line) => {
    const subLine = sub.find((s) => Math.abs(s.time - line.time) <= 0.5); // 0.5 seconds tolerance
    return { main: line.text, sub: subLine?.text, time: line.time };
  });
}

export const LyricViewer: React.FC<LyricViewerProps> = ({
                                                          musicId,
                                                          audioRef,
                                                          callNeteaseApi,
                                                          setError
                                                        }) => {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [subLyrics, setSubLyrics] = useState<LyricLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(0);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  // State to hold the number of padding lines needed for vertical centering
  const [paddingLines, setPaddingLines] = useState(0);

  // Memoize merged lyrics to prevent unnecessary re-renders
  const merged = React.useMemo(() => mergeLyrics(lyrics, subLyrics), [lyrics, subLyrics]);

  // Effect to fetch lyrics when musicId changes
  useEffect(() => {
    const fetchLyrics = async () => {
      // Reset state when a new musicId is loaded
      setLyrics([]);
      setSubLyrics([]);
      setCurrentLineIndex(0);
      setError(''); // Clear previous errors

      try {
        const data = await callNeteaseApi('getLyrics', { id: musicId });
        // Corrected API response structure access as per typical Netease API behavior
        const mainLrc = parseLRC(data.lrc || '');
        const subLrc = parseLRC(data.sub_lrc || '');

        if (mainLrc.length === 0 && subLrc.length === 0) {
          setError('暂无歌词');
        } else if (mainLrc.length === 0 && subLrc.length > 0) {
          // If only sub lyrics are available, use them as main
          setError('Only translation lyrics available.');
          setLyrics(subLrc);
          setSubLyrics([]); // Clear sub lyrics
        } else {
          setLyrics(mainLrc);
          setSubLyrics(subLrc);
        }
      } catch (e) {
        console.error("Error fetching lyrics:", e);
        setError('获取歌词失败');
      }
    };

    if (musicId) { // Only fetch if musicId is provided
      fetchLyrics();
    }
  }, [musicId, callNeteaseApi, setError]);

  // Effect to update current lyric line based on audio time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      // Find the index of the current lyric line
      // It's the last line whose time is less than or equal to the current audio time
      const newIndex = merged.findIndex((line, index) => {
        // If it's the last line, it's current if its time is <= currentTime
        if (index === merged.length - 1) {
          return line.time <= currentTime;
        }
        // For other lines, it's current if its time <= currentTime AND
        // the next line's time is greater than currentTime
        return line.time <= currentTime && merged[index + 1].time > currentTime;
      });

      // If no line matches (e.g., before first lyric), default to 0 or -1 as appropriate
      // Here, we'll keep it at 0 if no match, otherwise update
      if (newIndex !== -1 && newIndex !== currentLineIndex) {
        setCurrentLineIndex(newIndex);
      } else if (newIndex === -1 && currentLineIndex !== 0) {
        // If we are before the first lyric line, reset to 0
        setCurrentLineIndex(0);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [audioRef, merged, currentLineIndex]);

  // Effect to calculate padding lines and scroll the current lyric line into view
  useEffect(() => {
    const currentLineElement = lineRefs.current[currentLineIndex];
    const scrollContainer = scrollContainerRef.current;

    if (scrollContainer) {
      const containerHeight = scrollContainer.clientHeight;
      // Estimated height of the largest lyric line (text-4xl for main, plus py-3 and potential sub-lyric)
      // This is a rough estimate to calculate initial padding for centering.
      const estimatedMaxLineHeight = 80; // Adjusted for text-4xl and py-3, accounting for sub-lyric
      setPaddingLines(Math.floor((containerHeight / 2) / estimatedMaxLineHeight));

      if (currentLineElement) {
        // Ensure the element has been rendered and has a clientHeight
        const lineHeight = currentLineElement.clientHeight || 0; // Fallback to 0 if not rendered yet
        const lineOffsetTop = currentLineElement.offsetTop;

        // Calculate the target scroll position to center the current line
        // We're aiming to place the center of the current line at the center of the container
        const targetScrollTop = lineOffsetTop - (containerHeight / 2) - (lineHeight / 2);

        // Scroll smoothly to the target position
        scrollContainer.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
      }
    }
  }, [currentLineIndex, lyrics, subLyrics]); // Depend on lyrics/subLyrics to recalculate padding if they change

  if (!musicId) return null;

  /**
   * Determines the Tailwind CSS classes for the main lyric line based on its offset from the current line.
   * This provides the fading and sizing effect, now with symmetrical scaling.
   * @param offset - The difference between the line's index and the currentLineIndex.
   * @returns A string of Tailwind CSS classes.
   */
  const getMainLyricClass = (offset: number): string => {
    const absOffset = Math.abs(offset);
    // Current line: Larger font, bold, full opacity
    if (offset === 0) {
      return 'text-gray-900 text-3xl font-bold opacity-100 transition-all duration-300'; // Increased to text-4xl
    }
        // Symmetrical fading and sizing for lines around the current one
    // Lines directly adjacent to current
    else if (absOffset === 1) {
      return 'text-gray-700 text-2xl opacity-50 transition-all duration-300';
    }
    // Lines two steps away
    else if (absOffset === 2) {
      return 'text-gray-500 text-xl opacity-45 transition-all duration-300';
    }
    // Lines three steps away
    else if (absOffset === 3) {
      return 'text-gray-400 text-lg opacity-45 transition-all duration-300';
    }
    // Lines further away (more faded and smaller)
    else {
      return 'text-gray-400 text-base opacity-40 transition-all duration-300';
    }
  };

  /**
   * Determines the Tailwind CSS classes for the sub-lyric line based on its offset from the current line.
   * @param offset - The difference between the line's index and the currentLineIndex.
   * @returns A string of Tailwind CSS classes.
   */
  const getSubLyricClass = (offset: number): string => {
    const absOffset = Math.abs(offset);
    // Current line: Visible but smaller than main
    if (offset === 0) {
      return 'text-gray-600 text-xl opacity-90 transition-all duration-300'; // Adjusted for better visibility
    } else if (absOffset === 1) {
      return 'text-gray-500 text-lg opacity-80 transition-all duration-300';
    } else if (absOffset === 2) {
      return 'text-gray-400 text-base opacity-80 transition-all duration-300';
    } else if (absOffset === 3) {
      return 'text-gray-400 text-sm opacity-80 transition-all duration-300';
    } else {
      return 'text-gray-400 text-xs opacity-80 transition-all duration-300';
    }
  };

  return (
      <div
          ref={scrollContainerRef}
          className="flex flex-col h-full min-h-0 overflow-y-auto items-center px-4 py-8 custom-scrollbar"
      >
        {/* Render placeholder empty lines at the top to allow the first few lines to scroll to the center */}
        {Array(paddingLines).fill(null).map((_, i) => (
            <div key={`padding-top-${i}`} className="w-full pt-20"></div> // Increased padding height for better centering
        ))}

        {/* Map through merged lyrics to display them */}
        {merged.map((line, idx) => {
          const offset = idx - currentLineIndex;
          return (
              <div
                  key={idx}
                  ref={(el: HTMLDivElement | null) => { lineRefs.current[idx] = el; }} // Explicitly typed 'el'
                  // Apply dynamic classes based on offset for styling (color, size, opacity)
                  className={`text-center py-4 ${getMainLyricClass(offset)}`}
              >
                  {/* Main lyric line */}
                    <p className="whitespace-pre-wrap">{line.main || ' '}</p>
                    {/* Sub (translation) lyric line, only if available */}
                    {line.sub && (
                        <p className={`whitespace-pre-wrap ${getSubLyricClass(offset)}`}>{line.sub}</p>
                    )}
              </div>
          );
        })}

        {/* Render placeholder empty lines at the bottom to allow the last few lines to scroll to the center */}
        {Array(paddingLines).fill(null).map((_, i) => (
            <div key={`padding-bottom-${i}`} className="w-full pt-20"></div> // Increased padding height for better centering
        ))}
      </div>
  );
};
