import { useEffect, useState } from 'react';

export function useWidthFit(threshold: number = 768) {
  const [tooNarrow, setTooNarrow] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      setTooNarrow(window.innerWidth < threshold);
    };

    checkWidth(); // 初始化检测
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, [threshold]);

  return tooNarrow;
}
