
import React, { useState, useRef, useCallback, memo } from 'react';
import { useAudioStore } from '../../store/useAudioStore.ts';
import { useShallow } from 'zustand/react/shallow';
import {
  SpeakerWaveIcon,
  XCircleIcon,
  RewindIcon,
  PlayIcon,
  PauseIcon,
  FastForwardIcon,
  BookOpenIcon,
  BackwardIcon,
  ForwardIcon,
  AdjustmentsHorizontalIcon,
} from '../common/Icons.tsx';
import GoToMessageButton from '../common/GoToMessageButton.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';
import AudioTuner from './AudioTuner.tsx';
import AudioProgressBar from './AudioProgressBar.tsx';

const PlayPauseButtonIcon: React.FC<{ isLoading: boolean; isPlaying: boolean }> = memo(({ isLoading, isPlaying }) => {
  if (isLoading) {
    return (
      <svg className="animate-spin h-5 w-5 text-blue-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    );
  }
  if (isPlaying) {
    return <PauseIcon className="w-5 h-5 text-orange-400" />;
  }
  return <PlayIcon className="w-5 h-5 text-green-400" />;
});

interface AdvancedAudioPlayerProps {
  onCloseView: () => void;
  onSeekRelative: (offsetSeconds: number) => void;
  onSeekToAbsolute: (timeInSeconds: number) => void;
  onTogglePlayPause?: () => void;
  currentMessageText?: string | null;
  onGoToMessage?: () => void;
  onIncreaseSpeed: (speed: number) => void; 
  onDecreaseSpeed: () => void; 
  onEnterReadMode?: () => void;
  onPlayNext?: () => void;
  onPlayPrevious?: () => void;
  currentPartIndex?: number;
  totalParts?: number;
}

const AdvancedAudioPlayer: React.FC<AdvancedAudioPlayerProps> = memo(({
  onCloseView,
  onSeekRelative,
  onSeekToAbsolute,
  onTogglePlayPause,
  currentMessageText,
  onGoToMessage,
  onEnterReadMode,
  onPlayNext,
  onPlayPrevious,
  currentPartIndex = -1,
  totalParts = 0,
}) => {
  const { t } = useTranslation();
  
  const {
    isLoading,
    isPlaying,
    currentMessageId,
    error,
    currentPlayingText,
  } = useAudioStore(useShallow(state => ({
      isLoading: state.audioPlayerState.isLoading,
      isPlaying: state.audioPlayerState.isPlaying,
      currentMessageId: state.audioPlayerState.currentMessageId,
      error: state.audioPlayerState.error,
      currentPlayingText: state.audioPlayerState.currentPlayingText,
  })));
  
  const [isTunerOpen, setIsTunerOpen] = useState(false);
  const tunerButtonRef = useRef<HTMLButtonElement>(null);

  const toggleTuner = useCallback(() => {
      setIsTunerOpen(prev => !prev);
  }, []);

  if (!currentMessageId && !isLoading && !isPlaying && !currentPlayingText) {
    return null;
  }

  const displayMessageText = currentMessageText || currentPlayingText || t.audioPlayback;
  
  let partNumberDisplay = "";
  if (totalParts > 1 && currentPartIndex > -1) {
    partNumberDisplay = ` (Part ${currentPartIndex + 1}/${totalParts})`;
  }

  const snippet = (displayMessageText.length > 25 ? displayMessageText.substring(0, 22) + "..." : displayMessageText) + partNumberDisplay;

  const playPauseButtonTitle = isLoading ? t.loadingAudio : (isPlaying ? t.pause : t.play);
  
  const showPartControls = totalParts > 1 && currentPartIndex !== -1;

  return (
    <div
      className="aurora-panel text-gray-200 p-2 shadow-xl border-b border-[var(--aurora-border)] flex flex-col relative z-50"
      role="toolbar"
      aria-label={t.audioPlayback}
    >
      <div className="flex items-center w-full space-x-1.5 sm:space-x-2">
        <div className="flex items-center space-x-1.5 flex-shrink min-w-0 sm:max-w-[150px] md:max-w-sm">
          <SpeakerWaveIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold truncate" title={displayMessageText + partNumberDisplay}>
              {snippet}
            </span>
            {error && <span className="text-xs text-red-400 truncate" title={error}>{error}</span>}
          </div>
          {onGoToMessage && currentMessageId && (
            <GoToMessageButton onClick={onGoToMessage} disabled={!currentMessageId} />
          )}
          {onEnterReadMode && currentMessageId && (
            <button
              onClick={onEnterReadMode}
              disabled={!currentMessageId}
              className={`p-1.5 text-gray-400 hover:text-purple-300 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-1 flex-shrink-0`}
              title={t.readMode}
              aria-label={t.readMode}
            >
              <BookOpenIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Media Controls - Forced LTR for consistent button order */}
        <div className="flex items-center space-x-1 sm:space-x-2 flex-grow justify-center" dir="ltr">
            {showPartControls && (
                <button
                    onClick={onPlayPrevious}
                    className="p-1.5 text-gray-400 hover:text-white rounded-full transition-all hover:shadow-[0_0_8px_1px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t.previousPart}
                    aria-label={t.previousPart}
                    disabled={isLoading || !currentMessageId || currentPartIndex === 0}
                >
                    <BackwardIcon className="w-4 h-4" />
                </button>
            )}

            <button
            onClick={() => onSeekRelative(-10)}
            className="p-1.5 text-gray-400 hover:text-white rounded-full transition-all hover:shadow-[0_0_8px_1px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
            title={t.rewind10s}
            aria-label={t.rewind10s}
            disabled={isLoading || !currentMessageId}
            >
            <RewindIcon className="w-4 h-4" />
            </button>

            <button
            onClick={onTogglePlayPause}
            className="p-1.5 sm:p-2 text-gray-200 bg-white/10 rounded-full transition-all hover:shadow-[0_0_10px_2px_rgba(90,98,245,0.6)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ring-[var(--aurora-accent-primary)] focus:ring-offset-2 focus:ring-offset-black"
            title={playPauseButtonTitle}
            aria-label={playPauseButtonTitle}
            disabled={!onTogglePlayPause || (!isLoading && !currentMessageId)}
            >
              <PlayPauseButtonIcon isLoading={isLoading} isPlaying={isPlaying} />
            </button>
            
            <button
            onClick={() => onSeekRelative(10)}
            className="p-1.5 text-gray-400 hover:text-white rounded-full transition-all hover:shadow-[0_0_8px_1px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
            title={t.fastForward10s}
            aria-label={t.fastForward10s}
            disabled={isLoading || !currentMessageId}
            >
            <FastForwardIcon className="w-4 h-4" />
            </button>

            {showPartControls && (
                <button
                    onClick={onPlayNext}
                    className="p-1.5 text-gray-400 hover:text-white rounded-full transition-all hover:shadow-[0_0_8px_1px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t.nextPart}
                    aria-label={t.nextPart}
                    disabled={isLoading || !currentMessageId || currentPartIndex >= totalParts - 1}
                >
                    <ForwardIcon className="w-4 h-4" />
                </button>
            )}
        </div>
      
        <div className="flex-shrink-0 ml-auto flex items-center space-x-1">
            <div className="relative">
                <button
                    ref={tunerButtonRef}
                    onClick={toggleTuner}
                    className={`p-1.5 rounded-full transition-all hover:shadow-[0_0_8px_1px_rgba(59,130,246,0.5)] ${isTunerOpen ? 'text-blue-300 bg-blue-500/20' : 'text-gray-400 hover:text-blue-300'}`}
                    title="Audio Tuning (Speed, Grain, Overlap)"
                >
                    <AdjustmentsHorizontalIcon className="w-5 h-5" />
                </button>
                {isTunerOpen && <AudioTuner triggerRef={tunerButtonRef} onClose={() => setIsTunerOpen(false)} />}
            </div>

            <button
                onClick={onCloseView}
                className="p-1.5 text-gray-400 rounded-full transition-all hover:text-red-400 hover:shadow-[0_0_10px_1px_rgba(239,68,68,0.7)]"
                title={t.closePlayer}
                aria-label={t.closePlayer}
            >
                <XCircleIcon className="w-5 h-5" />
            </button>
        </div>
      </div>

      <AudioProgressBar onSeekToAbsolute={onSeekToAbsolute} isLoading={isLoading} />
    </div>
  );
});

export default AdvancedAudioPlayer;
