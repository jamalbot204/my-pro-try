
import React, { useRef, useCallback, useState, memo, useEffect, useMemo, Suspense } from 'react';
import { useAudioStore } from '../store/useAudioStore.ts';
import { useGlobalUiStore } from '../store/useGlobalUiStore.ts';
import { useChatListStore } from '../store/useChatListStore.ts';
import { useActiveChatStore } from '../store/useActiveChatStore.ts';
import { splitTextForTts, parseInteractiveChoices } from '../services/utils.ts';
import { DEFAULT_TTS_SETTINGS } from '../constants.ts';
import { useTranslation } from '../hooks/useTranslation.ts';
import { useShallow } from 'zustand/react/shallow';
import { ChatMessageRole } from '../types.ts';

import Sidebar from './panels/Sidebar.tsx';
import ChatView from './chat/ChatView.tsx';
import ToastNotification from './common/ToastNotification.tsx';
import ProgressNotification from './common/ProgressNotification.tsx';
import ModalManager from './managers/ModalManager.tsx';

const ReadModeView = React.lazy(() => import('./panels/ReadModeView.tsx'));
const AdvancedAudioPlayer = React.lazy(() => import('./audio/AdvancedAudioPlayer.tsx'));

const AppContent: React.FC = memo(() => {
  const { currentChatSession } = useActiveChatStore();
  const { isLoadingData } = useChatListStore();
  
  const {
      audioId,
      audioIsLoading,
      audioIsPlaying,
      audioText
  } = useAudioStore(useShallow(state => ({
      audioId: state.audioPlayerState.currentMessageId,
      audioIsLoading: state.audioPlayerState.isLoading,
      audioIsPlaying: state.audioPlayerState.isPlaying,
      audioText: state.audioPlayerState.currentPlayingText
  })));

  const { 
      handleClosePlayerViewOnly, 
      seekRelative, 
      seekToAbsolute, 
      togglePlayPause, 
      increaseSpeed, 
      decreaseSpeed, 
      playNextPart, 
      playPreviousPart 
  } = useAudioStore(useShallow(state => ({
      handleClosePlayerViewOnly: state.handleClosePlayerViewOnly,
      seekRelative: state.seekRelative,
      seekToAbsolute: state.seekToAbsolute,
      togglePlayPause: state.togglePlayPause,
      increaseSpeed: state.increaseSpeed,
      decreaseSpeed: state.decreaseSpeed,
      playNextPart: state.playNextPart,
      playPreviousPart: state.playPreviousPart
  })));

  const { isSidebarOpen, closeSidebar } = useGlobalUiStore();
  const chatViewRef = useRef<any>(null);
  const { t } = useTranslation();

  const [isReadModeOpen, setIsReadModeOpen] = useState(false);
  const [readModeMessageId, setReadModeMessageId] = useState<string | null>(null);

  const handleEnterReadMode = useCallback((messageId: string) => {
    setReadModeMessageId(messageId);
    setIsReadModeOpen(true);
  }, []);

  const handleCloseReadMode = useCallback(() => {
    setIsReadModeOpen(false);
    setReadModeMessageId(null);
  }, []);

  // --- Read Mode Navigation Logic ---
  
  // Filter for AI/Model messages only
  const navigableMessages = useMemo(() => {
      if (!currentChatSession) return [];
      return currentChatSession.messages.filter(m => m.role === ChatMessageRole.MODEL && m.content.trim().length > 0);
  }, [currentChatSession]);

  const currentNavIndex = useMemo(() => {
      if (!readModeMessageId) return -1;
      return navigableMessages.findIndex(m => m.id === readModeMessageId);
  }, [readModeMessageId, navigableMessages]);

  const canNavigateNext = currentNavIndex !== -1 && currentNavIndex < navigableMessages.length - 1;
  const canNavigatePrev = currentNavIndex > 0;

  const handleReadModeNext = useCallback(() => {
      if (canNavigateNext) {
          const nextMsg = navigableMessages[currentNavIndex + 1];
          setReadModeMessageId(nextMsg.id);
      }
  }, [canNavigateNext, currentNavIndex, navigableMessages]);

  const handleReadModePrev = useCallback(() => {
      if (canNavigatePrev) {
          const prevMsg = navigableMessages[currentNavIndex - 1];
          setReadModeMessageId(prevMsg.id);
      }
  }, [canNavigatePrev, currentNavIndex, navigableMessages]);

  // Derive content dynamically
  const readModeContent = useMemo(() => {
      if (!readModeMessageId || !currentChatSession) return '';
      const msg = currentChatSession.messages.find(m => m.id === readModeMessageId);
      if (!msg) return '';
      
      // Clean content (remove interactive choices syntax for pure reading)
      const { cleanContent } = parseInteractiveChoices(msg.content);
      return cleanContent;
  }, [readModeMessageId, currentChatSession]);

  const handlePlayReadModeMessage = useCallback(() => {
      if (readModeMessageId && currentChatSession) {
          const message = currentChatSession.messages.find(m => m.id === readModeMessageId);
          if (message) {
              useAudioStore.getState().handlePlayTextForMessage(message.content, message.id, 0);
          }
      }
  }, [readModeMessageId, currentChatSession]);

  // ----------------------------------

  const handleScrollToMessage = useCallback((messageId: string) => {
    if (chatViewRef.current) {
      chatViewRef.current.scrollToMessage(messageId);
    }
  }, []);

  const handleGoToMessageFromAudio = useCallback(() => {
    if (audioId) {
      const baseMessageId = audioId.split('_part_')[0];
      handleScrollToMessage(baseMessageId);
    }
  }, [audioId, handleScrollToMessage]);

  const audioPartInfo = useMemo(() => {
    const defaultInfo = { currentPart: -1, totalParts: 0, fullText: audioText || "" };

    if (!audioId || !currentChatSession) {
        return defaultInfo;
    }

    const parts = audioId.split('_part_');
    const baseId = parts[0];
    const currentPart = parts.length === 2 ? parseInt(parts[1], 10) : 0;
    
    const message = currentChatSession.messages.find(m => m.id === baseId);
    if (!message) {
        return { ...defaultInfo, fullText: t.loadingAudio };
    }
    
    const ttsSettings = currentChatSession.settings.ttsSettings || DEFAULT_TTS_SETTINGS;
    const maxWords = message.ttsWordsPerSegmentCache ?? ttsSettings.maxWordsPerSegment ?? 999999;
    const textSegments = splitTextForTts(message.content, maxWords);
    const totalParts = textSegments.length;

    const finalCurrentPart = totalParts > 1 ? currentPart : 0;

    return {
        currentPart: finalCurrentPart,
        totalParts,
        fullText: message.content,
    };
  }, [audioId, audioText, currentChatSession, t.loadingAudio]);
  
  const handleEnterReadModeFromPlayer = useCallback(() => {
    // Determine the base message ID from the playing audio ID
    if (audioId) {
        const baseId = audioId.split('_part_')[0];
        handleEnterReadMode(baseId);
    }
  }, [audioId, handleEnterReadMode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || !audioId) {
        return;
      }
      
      const activeElement = document.activeElement;
      const isTyping = activeElement instanceof HTMLElement && (
                       activeElement.tagName === 'INPUT' || 
                       activeElement.tagName === 'TEXTAREA' || 
                       activeElement.isContentEditable);

      if (isTyping) {
        return;
      }

      event.preventDefault();
      togglePlayPause();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [audioId, togglePlayPause]);

  const isAudioBarVisible = !!(audioId || audioIsLoading || audioIsPlaying || audioText) && !isReadModeOpen;
  
  if (isLoadingData) {
    return <div className="flex justify-center items-center h-screen bg-transparent text-white text-lg">{t.loading}</div>;
  }

  return (
    <div className="flex h-screen antialiased text-[var(--aurora-text-primary)] bg-transparent overflow-hidden">
      
        <div className={`fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-72`}>
          <Sidebar />
        </div>

        {isSidebarOpen && <div className="fixed inset-0 z-20 bg-black bg-opacity-50" onClick={closeSidebar} aria-hidden="true" />}
        
        <main className={`relative z-10 flex-1 flex flex-col overflow-y-auto transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-72' : ''} ${isAudioBarVisible ? 'pt-[76px]' : ''}`}>
          <ChatView ref={chatViewRef} onEnterReadMode={handleEnterReadMode} />
        </main>
        
        <div className='absolute'>
            <Suspense fallback={null}>
                {isAudioBarVisible && (
                    <div className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:left-72' : ''}`}>
                      <AdvancedAudioPlayer
                        onCloseView={handleClosePlayerViewOnly} 
                        onSeekRelative={seekRelative}
                        onSeekToAbsolute={seekToAbsolute}
                        onTogglePlayPause={togglePlayPause}
                        currentMessageText={audioPartInfo.fullText}
                        onGoToMessage={handleGoToMessageFromAudio}
                        onIncreaseSpeed={increaseSpeed} 
                        onDecreaseSpeed={decreaseSpeed}
                        onEnterReadMode={handleEnterReadModeFromPlayer}
                        onPlayNext={playNextPart}
                        onPlayPrevious={playPreviousPart}
                        currentPartIndex={audioPartInfo.currentPart}
                        totalParts={audioPartInfo.totalParts}
                      />
                    </div>
                )}

                {isReadModeOpen && (
                    <ReadModeView 
                        isOpen={isReadModeOpen} 
                        content={readModeContent} 
                        onClose={handleCloseReadMode}
                        onGoToMessage={() => {
                            if (readModeMessageId) handleScrollToMessage(readModeMessageId);
                        }}
                        onPlay={handlePlayReadModeMessage}
                        onPlayNext={playNextPart}
                        onPlayPrevious={playPreviousPart}
                        currentPartIndex={audioPartInfo.currentPart}
                        totalParts={audioPartInfo.totalParts}
                        // New Navigation Props
                        onNavigateNext={handleReadModeNext}
                        onNavigatePrev={handleReadModePrev}
                        canNavigateNext={canNavigateNext}
                        canNavigatePrev={canNavigatePrev}
                    />
                )}
                
                <ModalManager onScrollToMessage={handleScrollToMessage} />
            </Suspense>
          
          <ToastNotification />
          <ProgressNotification />
        </div>
    </div>
  );
});

export default AppContent;