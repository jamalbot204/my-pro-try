
import React, { useEffect, memo, useCallback, useState, Suspense, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { CloseIcon, ClipboardIcon, CheckIcon, SitemapIcon, TextAaIcon, ChevronLeftIcon, ChevronRightIcon, SpeakerWaveIcon } from '../common/Icons.tsx'; 
import AdvancedAudioPlayer from '../audio/AdvancedAudioPlayer.tsx';
import { useAudioStore } from '../../store/useAudioStore.ts';
import { useActiveChatStore } from '../../store/useActiveChatStore.ts';
import { useEditorUI } from '../../store/ui/useEditorUI.ts'; 
import { useGlobalUiStore } from '../../store/useGlobalUiStore.ts';
import { useShallow } from 'zustand/react/shallow';
import { preprocessMessageContent } from '../../services/utils.ts';

// Lazy load the heavy highlighter
const CodeBlockHighlighter = React.lazy(() => import('../common/CodeBlockHighlighter.tsx'));

interface ReadModeViewProps {
  isOpen: boolean;
  content: string;
  onClose: () => void;
  onGoToMessage?: () => void;
  onPlay?: () => void;
  onPlayNext?: () => void;
  onPlayPrevious?: () => void;
  currentPartIndex?: number;
  totalParts?: number;
  // Navigation Props
  onNavigateNext?: () => void;
  onNavigatePrev?: () => void;
  canNavigateNext?: boolean;
  canNavigatePrev?: boolean;
}

const CodeBlock: React.FC<React.PropsWithChildren<{ inline?: boolean; className?: string }>> = memo(({
  inline,
  className,
  children,
}) => {
  const [isCodeCopied, setIsCodeCopied] = useState(false);
  const codeString = String(children).replace(/\n$/, '');
  const match = /language-([\w.-]+)/.exec(className || '');
  const lang = match ? match[1] : '';
  const isMermaid = lang.toLowerCase() === 'mermaid'; 

  const { openMermaidModal } = useEditorUI.getState();

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeString).then(() => {
        setIsCodeCopied(true);
        setTimeout(() => setIsCodeCopied(false), 2000);
    }).catch(err => {
        console.error('Failed to copy code: ', err);
        alert('Failed to copy code.');
    });
  };

  if (inline) {
    return (
      <code className="bg-black/30 text-indigo-300 rounded px-1 py-0.5 font-mono text-sm border border-white/10">
        {children}
      </code>
    );
  }

  return (
    <div className="relative group/codeblock my-2 rounded-md border border-[var(--aurora-border)] bg-[var(--aurora-code-bg)]">
      <div className="sticky top-0 z-10 flex justify-between items-center px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-t-md border-b border-white/5">
        <span className="text-xs text-gray-300 font-mono">{lang || 'code'}</span>
        <div className="flex items-center space-x-2"> 
          {isMermaid && (
            <button
              onClick={() => openMermaidModal({ code: codeString })}
              title="Render Diagram"
              aria-label="Render Mermaid diagram"
              className="p-1.5 bg-black/30 text-gray-300 hover:text-white rounded-md transition-all duration-150 opacity-0 group-hover/codeblock:opacity-100 focus:opacity-100 hover:shadow-[0_0_8px_1px_rgba(34,197,94,0.6)]"
            >
              <SitemapIcon className="w-4 h-4 text-green-400" />
            </button>
          )}
          <button onClick={handleCopyCode} title={isCodeCopied ? "Copied!" : "Copy code"} aria-label={isCodeCopied ? "Copied code to clipboard" : "Copy code to clipboard"} className="p-1.5 bg-black/30 text-gray-300 hover:text-white rounded-md transition-all duration-150 opacity-0 group-hover/codeblock:opacity-100 focus:opacity-100 hover:shadow-[0_0_8px_1px_rgba(255,255,255,0.2)]">
              {isCodeCopied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-b-md">
        {lang ? (
            <Suspense fallback={<div className="p-4 text-xs text-gray-500 font-mono">Loading code...</div>}>
                <CodeBlockHighlighter language={lang} codeString={codeString} />
            </Suspense>
        ) : (
            <pre className="bg-transparent text-[var(--aurora-text-primary)] p-4 text-sm font-mono overflow-x-auto m-0">
            <code>{codeString}</code>
            </pre>
        )}
      </div>
    </div>
  );
});

const ReadModeView: React.FC<ReadModeViewProps> = memo(({ 
    isOpen, 
    content, 
    onClose, 
    onGoToMessage,
    onPlay,
    onPlayNext, 
    onPlayPrevious, 
    currentPartIndex, 
    totalParts,
    onNavigateNext,
    onNavigatePrev,
    canNavigateNext,
    canNavigatePrev
}) => {
  const { currentChatSession } = useActiveChatStore();
  const { readModeFontSizeLevel, setReadModeFontSizeLevel } = useGlobalUiStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { 
      handleClosePlayerViewOnly, 
      seekRelative, 
      seekToAbsolute, 
      togglePlayPause, 
      increaseSpeed, 
      decreaseSpeed 
  } = useAudioStore(useShallow(state => ({
      handleClosePlayerViewOnly: state.handleClosePlayerViewOnly,
      seekRelative: state.seekRelative,
      seekToAbsolute: state.seekToAbsolute,
      togglePlayPause: state.togglePlayPause,
      increaseSpeed: state.increaseSpeed,
      decreaseSpeed: state.decreaseSpeed
  })));

  const { audioId, audioText, audioIsLoading, audioIsPlaying } = useAudioStore(useShallow(state => ({
      audioId: state.audioPlayerState.currentMessageId,
      audioText: state.audioPlayerState.currentPlayingText,
      audioIsLoading: state.audioPlayerState.isLoading,
      audioIsPlaying: state.audioPlayerState.isPlaying
  })));

  // Preprocess content to support Section Headers
  const processedContent = useMemo(() => {
      return preprocessMessageContent(content);
  }, [content]);

  // Reset scroll on content change
  useEffect(() => {
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
    }
  }, [content]);

  const handleGoToMessageFromReadMode = useCallback(() => {
    if (onGoToMessage) {
      onClose(); 
      setTimeout(() => onGoToMessage(), 100); 
    }
  }, [onGoToMessage, onClose]);

  const cycleFontSize = useCallback(() => {
      // Cycles: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 0 -> 1 ...
      const nextLevel = (readModeFontSizeLevel + 1) > 6 ? 0 : readModeFontSizeLevel + 1;
      setReadModeFontSizeLevel(nextLevel);
  }, [readModeFontSizeLevel, setReadModeFontSizeLevel]);

  const getFontSizeClass = (level: number) => {
      switch (level) {
          case 0: return 'text-xs';
          case 1: return 'text-sm';
          case 2: return 'text-base';
          case 3: return 'text-lg';
          case 4: return 'text-xl';
          case 5: return 'text-2xl';
          case 6: return 'text-3xl';
          default: return 'text-base';
      }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowRight' && canNavigateNext && onNavigateNext) {
          onNavigateNext();
      } else if (event.key === 'ArrowLeft' && canNavigatePrev && onNavigatePrev) {
          onNavigatePrev();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden'; 
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, canNavigateNext, onNavigateNext, canNavigatePrev, onNavigatePrev]);

  if (!isOpen) {
    return null;
  }

  const isAudioBarVisible = !!(audioId || audioIsLoading || audioIsPlaying || audioText);
  
  const getFullTextForAudioBar = () => {
    if (!audioId || !currentChatSession) return audioText || "Playing audio...";
    const baseId = audioId.split('_part_')[0];
    const message = currentChatSession.messages.find(m => m.id === baseId);
    return message ? message.content : (audioText || "Playing audio...");
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-xl z-40 flex flex-col p-4 sm:p-8 md:p-12 pt-24 transition-colors duration-300"
      onClick={onClose} 
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute top-4 right-4 z-10 flex items-center space-x-3">
          {/* Navigation Controls - Forced LTR to maintain visual order of arrows */}
          {onNavigatePrev && onNavigateNext && (
              <div className="flex items-center bg-white/5 rounded-full p-1 mr-2 border border-white/10" dir="ltr">
                  <button
                      onClick={(e) => { e.stopPropagation(); onNavigatePrev(); }}
                      disabled={!canNavigatePrev}
                      className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Previous Message (Left Arrow)"
                  >
                      <ChevronLeftIcon className="w-5 h-5" />
                  </button>
                  <div className="w-px h-4 bg-white/10 mx-1"></div>
                  <button
                      onClick={(e) => { e.stopPropagation(); onNavigateNext(); }}
                      disabled={!canNavigateNext}
                      className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Next Message (Right Arrow)"
                  >
                      <ChevronRightIcon className="w-5 h-5" />
                  </button>
              </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              cycleFontSize();
            }}
            className="text-gray-400 p-2 rounded-full transition-shadow hover:text-white hover:bg-white/10 hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]"
            title="Change Text Size"
            aria-label="Change Text Size"
          >
            <TextAaIcon className="w-6 h-6" />
          </button>

          {onPlay && (
            <button
                onClick={(e) => {
                e.stopPropagation();
                onPlay();
                }}
                className="text-gray-400 p-2 rounded-full transition-shadow hover:text-white hover:bg-white/10 hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]"
                title="Play Audio"
                aria-label="Play Audio"
            >
                <SpeakerWaveIcon className="w-6 h-6" />
            </button>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation(); 
              onClose();
            }}
            className="text-gray-400 p-2 rounded-full transition-shadow hover:text-white hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]"
            aria-label="Close Read Mode"
          >
            <CloseIcon className="w-7 h-7" />
          </button>
      </div>

      {isAudioBarVisible && (
        <div 
            className="flex-shrink-0 w-full mx-auto pb-4"
            onClick={(e) => e.stopPropagation()} 
        >
          <AdvancedAudioPlayer
            onCloseView={handleClosePlayerViewOnly}
            onSeekRelative={seekRelative}
            onSeekToAbsolute={seekToAbsolute}
            onTogglePlayPause={togglePlayPause}
            currentMessageText={getFullTextForAudioBar()}
            onGoToMessage={handleGoToMessageFromReadMode}
            onIncreaseSpeed={increaseSpeed}
            onDecreaseSpeed={decreaseSpeed}
            onPlayNext={onPlayNext}
            onPlayPrevious={onPlayPrevious}
            currentPartIndex={currentPartIndex}
            totalParts={totalParts}
          />
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="flex-grow w-full mx-auto overflow-y-auto hide-scrollbar"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className={`bg-[var(--aurora-msg-ai-bg)] text-[var(--aurora-text-on-surface)] border border-[var(--aurora-border)] p-6 sm:p-8 rounded-lg markdown-content shadow-2xl ${getFontSizeClass(readModeFontSizeLevel)} transition-all duration-200`}>
             <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                rehypePlugins={[rehypeRaw]}
                components={{ 
                    code: CodeBlock, 
                    p: 'div',
                    a: (props: any) => <a target="_blank" rel="noopener noreferrer" {...props} />
                }}
             >
                {processedContent}
            </ReactMarkdown>
        </div>
      </div>
    </div>
  );
});

export default ReadModeView;
