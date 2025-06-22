import React, {useState} from 'react';

export function PageSelector({ totalCount, itemsPerPage, onFlip, loading }) {
  const [currentPage, setCurrentPage] = useState<number>(0);
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return totalPages > 1 && (
      <div
          className="flex justify-center items-center mt-4 space-x-2 flex-shrink-0">
        <button
            onClick={() => {
              setCurrentPage(currentPage - 1);
              onFlip(currentPage - 1);
            }}
            disabled={currentPage === 0 || loading}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 cursor-pointer"
        >
          上一页
        </button>
        <span className="text-gray-700">
                  第 {currentPage + 1} 页 / 共 {totalPages} 页
                </span>
        <button
            onClick={() => {
              setCurrentPage(currentPage + 1);
              onFlip(currentPage + 1);
            }}
            disabled={currentPage >= totalPages - 1 || loading}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 cursor-pointer"
        >
          下一页
        </button>
      </div>
  );
}