import React, {useEffect, useState} from 'react';

interface ErrorBannerProps {
  message: string;
  duration?: number; // 自动关闭时间，单位 ms
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({message, duration = 4000}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!visible || !message) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-red-600 text-white px-4 py-2 shadow-md animate-slideDown"
      role="alert"
    >
      <span className="font-medium">{message}</span>
      <button
        onClick={() => setVisible(false)}
        aria-label="关闭"
        className="ml-4 text-white hover:text-gray-200 focus:outline-none"
      >
        {/* 简单的关闭叉号 */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  );
};
