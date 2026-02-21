
import React, { memo, useMemo, useCallback } from 'react';
import { ChatMessage, ChatMessageRole } from '../../../types.ts';
import ResetAudioCacheButton from '../../common/ResetAudioCacheButton.tsx';
import { useConfirmationUI } from '../../../store/ui/useConfirmationUI.ts';
import { useSelectionStore } from '../../../store/useSelectionStore.ts';
import { useAudioStore } from '../../../store/useAudioStore.ts';
import {
    MagnifyingGlassIcon, UsersIcon, StarIcon, GitHubIcon, ArrowPathIcon, BrainIcon, ClockIcon, TrashIcon, KeyIcon
} from '../../common/Icons.tsx';
import { splitTextForTts, parseInteractiveChoices } from '../../../services/utils.ts';
import { useActiveChatStore } from '../../../store/useActiveChatStore.ts';
import { useInteractionStore } from '../../../store/useInteractionStore.ts';
import { useDataStore } from '../../../store/useDataStore.ts';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { useSettingsUI } from '../../../store/ui/useSettingsUI.ts';
import { useShallow } from 'zustand/react/shallow';
import { useSettingsPersistence } from '../../../hooks/useSettingsPersistence.ts';

// Sub-components
import MessageContent from './MessageContent.tsx';
import MessageAudioControls from './MessageAudioControls.tsx';
import MessageAttachments from './MessageAttachments.tsx';
import MessageActions from './MessageActions.tsx';
import MessageThoughts from './MessageThoughts.tsx';
import PythonExecutionBlock from './PythonExecutionBlock.tsx';
import InteractiveChoices from './InteractiveChoices.tsx';

interface MessageItemProps {
  message: ChatMessage;
  canRegenerateFollowingAI?: boolean;
  chatScrollContainerRef?: React.RefObject<HTMLDivElement>;
  highlightTerm?: string;
  onEnterReadMode: (messageId: string) => void;
  isContentExpanded?: boolean;
  isThoughtsExpanded?: boolean;
  onToggleExpansion: (messageId: string, type: 'content' | 'thoughts') => void;
  isLatestMemoryUpdate?: boolean; 
}

const MessageItemComponent: React.FC<MessageItemProps> = ({ message, canRegenerateFollowingAI, highlightTerm, onEnterReadMode, isContentExpanded, isThoughtsExpanded, onToggleExpansion, isLatestMemoryUpdate }) => {
  const { messageGenerationTimes } = useDataStore();
  const { currentChatSession } = useActiveChatStore();
  const { toggleFavoriteMessage } = useInteractionStore();
  const { saveSessionSettings } = useSettingsPersistence();
  
  const { requestResetAudioCacheConfirmation, requestDeleteConfirmation } = useConfirmationUI();
  
  const audioState = useAudioStore(useShallow(state => ({
      currentMessageId: state.audioPlayerState.currentMessageId,
      isPlaying: state.audioPlayerState.isPlaying,
      isLoading: state.audioPlayerState.isLoading,
      globalError: state.audioPlayerState.error,
      fetchingSegmentIds: state.fetchingSegmentIds,
      segmentFetchErrors: state.segmentFetchErrors,
      activeMultiPartFetches: state.activeMultiPartFetches,
  })));

  const { isSelectionModeActive, toggleMessageSelection, selectRange } = useSelectionStore(useShallow(state => ({
      isSelectionModeActive: state.isSelectionModeActive,
      toggleMessageSelection: state.toggleMessageSelection,
      selectRange: state.selectRange
  })));

  const selectionOrder = useSelectionStore(state => {
      if (!state.isSelectionModeActive) return 0;
      const idx = state.selectedMessageIds.indexOf(message.id);
      return idx + 1;
  });
  const isSelected = selectionOrder > 0;

  const { openChatAttachmentsModal } = useSettingsUI();
  const { t } = useTranslation();

  // --- Range Selection Handler ---
  const handleSelectionClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isSelectionModeActive) return;

      if (e.shiftKey && currentChatSession?.messages) {
          e.preventDefault(); // Prevent text selection
          selectRange(message.id, currentChatSession.messages);
      } else {
          toggleMessageSelection(message.id);
      }
  }, [isSelectionModeActive, message.id, currentChatSession?.messages, selectRange, toggleMessageSelection]);
  // ------------------------------

  // --- Interactive Choices Logic ---
  const isInteractiveChoicesEnabled = currentChatSession?.settings.enableInteractiveChoices ?? false;
  
  const { cleanContent, choices } = useMemo(() => {
      if (!isInteractiveChoicesEnabled || !message.content) {
          return { cleanContent: message.content, choices: [] };
      }
      return parseInteractiveChoices(message.content);
  }, [message.content, isInteractiveChoicesEnabled]);
  
  const displayContent = cleanContent;
  // ---------------------------------

  const handleLockSeed = useCallback(async () => {
      if (!currentChatSession || message.seedUsed === undefined) return;
      
      await saveSessionSettings({
          ...currentChatSession.settings,
          seed: message.seedUsed
      }, t.seedLocked);
  }, [currentChatSession, message.seedUsed, saveSessionSettings, t.seedLocked]);

  if (message.isTimeMarker) {
      const date = new Date(message.timestamp);
      const displayTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const displayDate = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

      return (
          <div className="flex justify-center items-center my-6 w-full opacity-70 select-none pointer-events-none animate-message-enter">
              <span className="text-[10px] sm:text-xs font-medium text-[var(--aurora-text-secondary)] bg-black/20 px-3 py-1 rounded-full border border-white/5 flex items-center shadow-sm">
                  <ClockIcon className="w-3 h-3 mr-1.5 opacity-60" />
                  {displayDate} &bull; {displayTime}
              </span>
          </div>
      );
  }

  const isUser = message.role === ChatMessageRole.USER;
  const isError = message.role === ChatMessageRole.ERROR;
  const isModel = message.role === ChatMessageRole.MODEL;
  
  const extractedThoughts = message.thoughts;

  const maxWordsForThisMessage = message.ttsWordsPerSegmentCache ?? currentChatSession?.settings?.ttsSettings?.maxWordsPerSegment ?? 999999;
  const textSegmentsForTts = splitTextForTts(displayContent, maxWordsForThisMessage); // Use displayContent (cleaned) for TTS
  const hasAnyCachedAudio = !!message.cachedAudioSegmentCount && message.cachedAudioSegmentCount > 0;
  const allTtsPartsCached = hasAnyCachedAudio && message.cachedAudioSegmentCount === textSegmentsForTts.length;

  if (message.role === ChatMessageRole.SYSTEM) {
    const isGithubMessage = message.content.includes("GitHub repository");
    return ( <div className="flex justify-center items-center my-3 w-full animate-message-enter" id={`message-item-${message.id}`}><div className="text-center text-xs text-gray-400 bg-black/25 px-4 py-1.5 rounded-full shadow-inner flex items-center gap-2 backdrop-blur-sm border border-white/5">{isGithubMessage && <GitHubIcon className="w-4 h-4 flex-shrink-0" />}<p>{message.content}</p></div></div>);
  }

  if (message.isSystemReminder) {
      const isSelectedAnchor = isSelectionModeActive && isSelected;
      
      const handleDeleteAnchor = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (currentChatSession) {
             requestDeleteConfirmation({ sessionId: currentChatSession.id, messageId: message.id });
          }
      };

      return (
          <div 
            className={`flex justify-center items-center my-2 w-full group/divider relative animate-message-enter transition-all duration-200 ${isSelectionModeActive ? 'cursor-pointer' : ''} ${isSelectedAnchor ? 'bg-blue-900/20 py-3 rounded-lg border border-blue-500/30 my-3' : ''}`} 
            id={`message-item-${message.id}`}
            onClick={handleSelectionClick}
          >
              <div className="relative flex items-center">
                  <div 
                      className={`flex items-center justify-center p-1.5 rounded-full bg-white/5 border border-white/5 transition-all cursor-help ${isLatestMemoryUpdate ? 'border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)] bg-cyan-900/20' : 'hover:border-[var(--aurora-accent-primary)] hover:bg-[var(--aurora-accent-primary)]/10'}`}
                  >
                      {isLatestMemoryUpdate ? (
                          <BrainIcon className="w-4 h-4 text-cyan-400 animate-pulse" />
                      ) : (
                          <ArrowPathIcon className="w-3.5 h-3.5 text-gray-500 group-hover/divider:text-[var(--aurora-accent-primary)] transition-colors" />
                      )}
                  </div>
                  
                  {!isSelectionModeActive && (
                      <button
                          onClick={handleDeleteAnchor}
                          className="absolute left-full ml-3 p-1.5 text-gray-500 hover:text-red-400 bg-black/60 rounded-full border border-white/10 opacity-0 group-hover/divider:opacity-100 transition-all duration-200 hover:bg-red-900/30 hover:border-red-500/50 transform -translate-x-2 group-hover/divider:translate-x-0 z-30"
                          title="Delete Anchor (Rollback Memory)"
                      >
                          <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                  )}
              </div>
              
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-96 max-w-[90vw] bg-black/90 border border-white/10 rounded-lg p-3 shadow-xl opacity-0 group-hover/divider:opacity-100 transition-opacity pointer-events-none group-hover/divider:pointer-events-auto z-20">
                  <p className="text-xs font-bold text-gray-400 mb-1 flex items-center">
                      {isLatestMemoryUpdate ? <BrainIcon className="w-3 h-3 mr-1.5 text-cyan-400"/> : null}
                      {message.hasMemoryUpdate ? (isLatestMemoryUpdate ? "USER PROFILE UPDATE (Current)" : "USER PROFILE SNAPSHOT") : "System Reminder Injected"}
                  </p>
                  <pre className="text-[10px] text-gray-300 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
                      {message.content}
                  </pre>
              </div>
          </div>
      );
  }

  const layoutClasses = isUser ? 'justify-end' : 'justify-start';
  const generationTime = messageGenerationTimes[message.id];
  const groundingChunks = message.groundingMetadata?.groundingChunks;
  
  let bubbleClasses = '';
  if (isUser) {
      bubbleClasses = 'bg-[var(--aurora-msg-user-bg)] text-[var(--aurora-text-on-accent)] rounded-2xl rounded-br-sm shadow-md border border-[var(--aurora-border)]';
  } else if (isError) {
      bubbleClasses = 'bg-red-900/30 backdrop-blur-md border border-red-500/50 text-red-100 shadow-lg shadow-red-900/20 rounded-2xl rounded-bl-sm';
  } else {
      bubbleClasses = 'bg-[var(--aurora-msg-ai-bg)] backdrop-blur-md border border-[var(--aurora-border)] text-[var(--aurora-text-on-surface)] rounded-2xl rounded-bl-sm shadow-sm';
  }

  const isMainButtonMultiFetching = audioState.activeMultiPartFetches.has(message.id);
  const isFetchingThisSegment = (textSegmentsForTts.length <= 1 && audioState.fetchingSegmentIds.has(message.id));
  const isPlayingThisMessage = audioState.currentMessageId?.startsWith(message.id) && (audioState.isLoading || audioState.isPlaying);
  
  const isAnyAudioOperationActiveForMessage = message.isStreaming || isMainButtonMultiFetching || isFetchingThisSegment || isPlayingThisMessage;

  const handleResetCacheClick = () => { if (!currentChatSession) return; requestResetAudioCacheConfirmation(currentChatSession.id, message.id); };

  const segmentFetchError = audioState.segmentFetchErrors.get(message.id);
  const currentPlayerError = (audioState.currentMessageId?.startsWith(message.id) ? audioState.globalError : null);
  const overallAudioErrorMessage = segmentFetchError || currentPlayerError;
  const hasErrorOverall = !!overallAudioErrorMessage;

  // Smart Error Handling Logic
  // Only show Refresh button if error is explicitly about attachments
  const shouldShowRefreshButton = isError && message.errorType === 'link_expired';

  return (
    <div 
        id={`message-item-${message.id}`} 
        className={`group flex items-start mb-4 w-full relative transition-colors duration-200 animate-message-enter ${isSelected ? 'bg-blue-900/20 rounded-xl -mx-2 px-2 py-2 border border-blue-500/30' : ''} ${isSelectionModeActive ? 'cursor-pointer' : ''} ${layoutClasses} message-item-root`} 
        onClick={handleSelectionClick} 
        role="listitem"
    >
      {!isUser && isSelectionModeActive && (
          <div className="flex-shrink-0 self-center px-2 flex items-center space-x-2">
              {selectionOrder > 0 && (
                  <span className="text-xs font-bold text-blue-300 bg-blue-900/80 rounded-full w-5 h-5 flex items-center justify-center shadow">
                      {selectionOrder}
                  </span>
              )}
              <input 
                type="checkbox" 
                checked={isSelected} 
                onChange={() => {}} /* Handled by parent div onClick for shift support */
                className="w-4 h-4 text-[var(--aurora-accent-primary)] bg-black/30 border-white/20 rounded focus:ring-[var(--aurora-accent-primary)] focus:ring-offset-black cursor-pointer pointer-events-none" 
                aria-label={`Select message from ${message.role}`} 
              />
          </div>
      )}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-5xl w-full sm:w-auto`}>
        {isModel && message.isStreaming && !isError && !extractedThoughts && (<div className={`flex items-center space-x-1.5 mb-1.5 px-3 py-2 rounded-2xl shadow-sm ${message.characterName ? 'bg-purple-900/30 border border-purple-500/20' : 'bg-white/5 border border-white/5'} animate-pulse`} aria-label="AI is thinking" role="status"><div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></div><div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></div></div>)}
        {isModel && !isError && extractedThoughts && (
            <MessageThoughts 
                messageId={message.id}
                thoughts={extractedThoughts} 
                isExpanded={!!isThoughtsExpanded} 
                onToggle={() => onToggleExpansion(message.id, 'thoughts')} 
            />
        )}
        {(isUser || isModel || isError) && (
            <div className={`px-5 py-4 ${bubbleClasses} relative w-full sm:w-auto mt-1 min-w-[100px]`}>
                <div className="sticky top-2 z-20 flex w-full h-0 pointer-events-none">
                    <div className="absolute top-0 w-fit ltr:-left-3 rtl:-right-3 flex items-start opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-auto" aria-label="Message actions">
                        <div className="flex items-center gap-1 p-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 shadow-lg scale-90 hover:scale-100 origin-top">
                            {displayContent.trim() && !isError && !message.isGithubContextMessage && (
                                <>
                                    <MessageAudioControls 
                                        message={message} 
                                        displayContent={displayContent} 
                                        textSegmentsForTts={textSegmentsForTts} 
                                        allTtsPartsCached={allTtsPartsCached} 
                                        hasAnyCachedAudio={hasAnyCachedAudio} 
                                        isSelectionModeActive={isSelectionModeActive} 
                                    />
                                    {hasAnyCachedAudio && !isAnyAudioOperationActiveForMessage && (
                                        <ResetAudioCacheButton onClick={handleResetCacheClick} disabled={isAnyAudioOperationActiveForMessage || isSelectionModeActive} title={t.resetAudioCache} className="hover:bg-white/10" />
                                    )}
                                </>
                            )}
                            {/* Hide Actions menu for errors to simplify UI as requested */}
                            {!isError && (
                                <MessageActions 
                                    message={message} 
                                    isSelectionModeActive={isSelectionModeActive} 
                                    currentChatSession={currentChatSession} 
                                    canRegenerateFollowingAI={!!canRegenerateFollowingAI} 
                                    onEnterReadMode={onEnterReadMode}
                                    displayContent={displayContent}
                                    allTtsPartsCached={allTtsPartsCached}
                                    textSegmentsForTts={textSegmentsForTts}
                                />
                            )}
                        </div>
                    </div>

                    {!isError && (
                        <button
                            onClick={() => toggleFavoriteMessage(message.id)}
                            title={message.isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                            aria-label={message.isFavorited ? 'Remove message from favorites' : 'Add message to favorites'}
                            className={`absolute top-0 ltr:-right-3 rtl:-left-3 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 rounded-full hover:bg-black/20 ${isSelectionModeActive ? 'hidden' : ''} pointer-events-auto`}
                        >
                            <StarIcon filled={!!message.isFavorited} className={`w-3.5 h-3.5 ${message.isFavorited ? 'text-yellow-400' : 'text-current opacity-50 hover:opacity-100'}`} />
                        </button>
                    )}
                </div>

                <>{isModel && message.characterName && (<div className="flex items-center mb-2 pb-1 border-b border-black/10 dark:border-white/10"><UsersIcon className="w-3.5 h-3.5 mr-1.5 text-purple-600 dark:text-purple-300" /><p className="text-xs font-bold text-purple-600 dark:text-purple-300 uppercase tracking-wide">{message.characterName}</p></div>)}
                
                {message.toolInvocations && message.toolInvocations.length > 0 && (
                    <div className="mb-2">
                        {message.toolInvocations.map((invocation, idx) => (
                            invocation.toolName === 'execute_python' ? (
                                <PythonExecutionBlock key={idx} invocation={invocation} />
                            ) : null
                        ))}
                    </div>
                )}

                {message.isGithubContextMessage ? (
                    <div className="flex items-center space-x-2 text-sm py-2">
                        <GitHubIcon className="w-5 h-5 flex-shrink-0 opacity-80" />
                        <span className="font-medium">{t.githubContextAdded}</span>
                    </div>
                ) : (
                    <MessageContent 
                        message={message}
                        displayContent={displayContent} 
                        highlightTerm={highlightTerm} 
                        isContentExpanded={!!isContentExpanded} 
                        onToggleExpansion={onToggleExpansion} 
                    />
                )}
                {/* Interactive Choices Rendering */}
                {isInteractiveChoicesEnabled && choices.length > 0 && (
                    <InteractiveChoices choices={choices} />
                )}

                {/* Specific Error Actions: Refresh Link */}
                {shouldShowRefreshButton && (
                    <div className="mt-3 bg-red-950/40 border border-red-500/30 rounded-lg p-3">
                        <button 
                            onClick={(e) => { e.stopPropagation(); currentChatSession && openChatAttachmentsModal(currentChatSession, { autoHighlightRefresh: true }); }}
                            className="flex items-center px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-md transition-colors w-full sm:w-auto justify-center shadow-md shadow-red-900/20"
                        >
                            <ArrowPathIcon className="w-3.5 h-3.5 ltr:mr-2 rtl:ml-2 rtl:mr-0 animate-pulse" />
                            Refresh Attachments (Fix Link)
                        </button>
                    </div>
                )}

                <MessageAttachments 
                    messageId={message.id} 
                    attachments={message.attachments || []} 
                    isSelectionModeActive={isSelectionModeActive} 
                />
                {groundingChunks && groundingChunks.length > 0 && (<div className="mt-4 pt-3 border-t border-black/10 dark:border-white/10"><h4 className="text-[10px] font-bold uppercase tracking-widest mb-2 opacity-60 flex items-center"><MagnifyingGlassIcon className="w-3 h-3 mr-1.5" />{t.sources}</h4><ul className="grid grid-cols-1 gap-1">{groundingChunks.map((chunk: any, index: number) => (<li key={index} className="text-xs truncate"><a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" title={chunk.web.uri} className="text-blue-500 dark:text-blue-300 hover:underline flex items-center bg-black/5 dark:bg-black/20 px-2 py-1 rounded border border-black/5 dark:border-white/5"><span className="mr-2 opacity-50">{index + 1}.</span> {chunk.web.title || chunk.web.uri}</a></li>))}</ul></div>)}</>
                <><div className="text-[10px] mt-2 opacity-60 flex items-center space-x-2 font-medium"><span>{new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>{displayContent.trim() && !isError && (<><span>&bull;</span><span>{displayContent.trim().split(/\s+/).filter(Boolean).length} words</span></>)}
                {message.hasMemoryUpdate && (
                    <>
                        <span>&bull;</span>
                        <span 
                            className={`flex items-center font-bold ${isLatestMemoryUpdate ? 'text-cyan-400 animate-pulse' : 'text-gray-500 opacity-70'}`} 
                            title={isLatestMemoryUpdate ? "User Profile Update (Current)" : "User Profile Snapshot (Historical)"}
                        >
                            <BrainIcon className="w-3 h-3 mr-1" />
                            {isLatestMemoryUpdate ? "Profile Updated" : "Profile Snapshot"}
                        </span>
                    </>
                )}
                {/* Seed Display */}
                {message.seedUsed !== undefined && (
                    <>
                        <span>&bull;</span>
                        <div className="flex items-center gap-1 group/seed">
                            <span 
                                className="flex items-center cursor-help text-teal-500/70 hover:text-teal-400 transition-colors"
                                title={`Seed: ${message.seedUsed}`}
                            >
                                <KeyIcon className="w-3 h-3 mr-0.5" />
                                {message.seedUsed}
                            </span>
                            <button
                                onClick={handleLockSeed}
                                className="opacity-0 group-hover/seed:opacity-100 text-teal-400 hover:text-teal-200 p-0.5 rounded hover:bg-teal-900/30 transition-all"
                                title={t.lockSeed}
                            >
                                <ArrowPathIcon className="w-3 h-3" />
                            </button>
                        </div>
                    </>
                )}
                </div>{isModel && generationTime !== undefined && (<p className="text-[10px] mt-0.5 text-green-600/70 dark:text-green-300/70">Generated in {generationTime.toFixed(1)}s</p>)}{hasErrorOverall && (<p className="text-xs mt-1 text-red-300 bg-red-900/20 px-2 py-1 rounded border border-red-500/20" title={overallAudioErrorMessage || undefined}>{t.audioError}: {overallAudioErrorMessage?.substring(0,50) || "Playback failed."}{overallAudioErrorMessage && overallAudioErrorMessage.length > 50 ? "..." : ""}</p>)}
                </>
            </div>
        )}
      </div>
       {isUser && isSelectionModeActive && (
           <div className="flex-shrink-0 self-center px-2 flex items-center space-x-2">
               {selectionOrder > 0 && (
                   <span className="text-xs font-bold text-blue-300 bg-blue-900/80 rounded-full w-5 h-5 flex items-center justify-center shadow">
                       {selectionOrder}
                   </span>
               )}
               <input 
                type="checkbox" 
                checked={isSelected} 
                onChange={() => {}} /* Handled by parent div onClick for shift support */
                className="w-4 h-4 text-[var(--aurora-accent-primary)] bg-black/30 border-white/20 rounded focus:ring-[var(--aurora-accent-primary)] focus:ring-offset-black cursor-pointer pointer-events-none" 
                aria-label={`Select message from ${message.role}`} 
               />
           </div>
       )}
    </div>
  );
};

export default memo(MessageItemComponent);
