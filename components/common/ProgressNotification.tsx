import React, { memo } from 'react';
import { useProgressStore } from '../../store/useProgressStore.ts';
import { CheckCircleIcon, XCircleIcon } from './Icons.tsx';

const ProgressNotification: React.FC = memo(() => {
  const { progressItems, cancelProgress, removeProgress } = useProgressStore();

  if (progressItems.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed top-4 right-4 z-[100] w-full max-w-sm space-y-3"
      aria-live="polite"
    >
      {progressItems.map(item => {
        const isRunning = item.status === 'running';
        const isSuccess = item.status === 'success';
        const isError = item.status === 'error';

        let borderColor = 'border-[var(--aurora-border)]';
        if (isSuccess) borderColor = 'border-green-500/50';
        if (isError) borderColor = 'border-red-500/50';

        return (
          <div
            key={item.id}
            role="alert"
            className={`aurora-panel p-4 rounded-lg shadow-2xl flex flex-col transition-all duration-300 ease-in-out animate-fade-in-right ${borderColor}`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-grow">
                <div className="flex items-center">
                  {isSuccess && <CheckCircleIcon className="w-5 h-5 mr-2 text-green-400 flex-shrink-0" />}
                  {isError && <XCircleIcon className="w-5 h-5 mr-2 text-red-400 flex-shrink-0" />}
                  {isRunning && (
                    <svg className="animate-spin h-5 w-5 mr-2 text-blue-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  <h3 className="text-sm font-semibold text-gray-100">{item.title}</h3>
                </div>
                <p className="text-xs text-gray-300 mt-1">{item.message}</p>
              </div>
              {isRunning && item.onCancel && (
                <button
                  onClick={() => cancelProgress(item.id)}
                  className="p-1.5 text-xs text-gray-400 hover:text-white rounded-md transition-colors"
                  aria-label="Cancel process"
                >
                  Cancel
                </button>
              )}
               {isError && (
                <button
                  onClick={() => removeProgress(item.id)}
                  className="p-1.5 text-xs text-gray-400 hover:text-white rounded-md transition-colors"
                  aria-label="Close notification"
                >
                  Close
                </button>
              )}
            </div>
            {isRunning && (
              <div className="mt-3">
                <div className="w-full bg-black/30 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-linear"
                    style={{ width: `${item.progress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <style>{`
        @keyframes fade-in-right {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in-right {
          animation: fade-in-right 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
});

export default ProgressNotification;