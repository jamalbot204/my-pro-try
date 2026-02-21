import React, { memo } from 'react';
import { PlayIcon, StopIcon } from '../common/Icons.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';

interface AutoSendControlsProps {
  isAutoSendingActive: boolean;
  autoSendText: string;
  setAutoSendText: (text: string) => void;
  autoSendRepetitionsInput: string;
  setAutoSendRepetitionsInput: (reps: string) => void;
  autoSendRemaining: number;
  onStartAutoSend: () => void; 
  onStopAutoSend: () => void;
  canStart: boolean; 
  isChatViewLoading: boolean;
  currentChatSessionExists: boolean;
  isCharacterMode: boolean;
  isPreparingAutoSend: boolean;
  isWaitingForErrorRetry: boolean; 
  errorRetryCountdown: number;    
}

const AutoSendControls: React.FC<AutoSendControlsProps> = memo(({
  isAutoSendingActive,
  autoSendText,
  setAutoSendText,
  autoSendRepetitionsInput,
  setAutoSendRepetitionsInput,
  autoSendRemaining,
  onStartAutoSend,
  onStopAutoSend,
  canStart,
  isChatViewLoading,
  currentChatSessionExists,
  isCharacterMode,
  isPreparingAutoSend,
  isWaitingForErrorRetry,
  errorRetryCountdown,    
}) => {
  const { t } = useTranslation();
  const commonInputClass = "p-1.5 sm:p-2 aurora-input text-sm disabled:opacity-50";
  const commonButtonClass = "p-1.5 sm:p-2 text-sm font-medium rounded-md transition-shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";

  const showGenericStartButton = !isCharacterMode && !isAutoSendingActive && !isWaitingForErrorRetry;

  return (
    <div className="mx-2 mt-2 p-2 rounded-xl border border-[var(--aurora-border)] bg-black/10 backdrop-blur-sm space-y-2 shadow-sm">
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder={t.textToAutoSend}
          value={autoSendText}
          onChange={(e) => setAutoSendText(e.target.value)}
          className={`flex-1 min-w-[60px] ${commonInputClass}`}
          disabled={isAutoSendingActive || !currentChatSessionExists || isWaitingForErrorRetry}
          aria-label="Text for automated sending"
        />
        <input
          type="number"
          placeholder={t.times}
          value={autoSendRepetitionsInput}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '' || (parseInt(val, 10) >= 1 && parseInt(val, 10) <= 100)) {
                 setAutoSendRepetitionsInput(val);
            } else if (parseInt(val, 10) > 100) {
                 setAutoSendRepetitionsInput('100');
            } else if (parseInt(val, 10) < 1 && val !== '') {
                 setAutoSendRepetitionsInput('1');
            }
          }}
          min="1"
          max="100"
          className={`w-14 sm:w-16 ${commonInputClass} text-center`}
          disabled={isAutoSendingActive || !currentChatSessionExists || isWaitingForErrorRetry}
          aria-label="Number of times to send"
        />
        {isAutoSendingActive && !isWaitingForErrorRetry ? (
          <button
            onClick={onStopAutoSend}
            className={`${commonButtonClass} bg-red-600/80 text-white focus:ring-red-500 flex items-center hover:shadow-[0_0_12px_2px_rgba(239,68,68,0.6)]`}
            title={t.stop}
          >
            <StopIcon className="w-4 h-4 mr-1" />
            {t.stop} ({autoSendRemaining})
          </button>
        ) : showGenericStartButton ? (
          <button
            onClick={onStartAutoSend}
            disabled={!canStart || isChatViewLoading || !currentChatSessionExists || isWaitingForErrorRetry}
            className={`${commonButtonClass} bg-green-600/80 text-white focus:ring-green-500 flex items-center hover:shadow-[0_0_12px_2px_rgba(34,197,94,0.6)]`}
            title={t.start}
          >
            <PlayIcon className="w-4 h-4 mr-1" />
            {t.start}
          </button>
        ) : null}
      </div>
      {isCharacterMode && isPreparingAutoSend && !isAutoSendingActive && !isWaitingForErrorRetry && (
        <p className="text-xs text-yellow-400">
          Auto-send configured. Click a character button below to start sending to them.
        </p>
      )}
      {isWaitingForErrorRetry && (
        <p className="text-xs text-yellow-400 animate-pulse text-center">
          Error detected. Attempting to regenerate in {errorRetryCountdown}s...
        </p>
      )}
    </div>
  );
});

export default AutoSendControls;