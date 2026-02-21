
import React, { useRef, useCallback, useImperativeHandle, forwardRef, memo, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useActiveChatStore } from '../../store/useActiveChatStore.ts';
import { useMessageStore } from '../../store/useMessageStore.ts';
import { ChatMessageRole } from '../../types.ts';
import MessageItem from './message/MessageItem.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { ChevronDoubleDownIcon, ChevronDoubleUpIcon } from '../common/Icons.tsx';

export interface ChatMessageListHandles {
    scrollToMessage: (messageId: string) => void;
}

interface ChatMessageListProps {
    onEnterReadMode: (messageId: string) => void;
}

const ChatMessageList = memo(forwardRef<ChatMessageListHandles, ChatMessageListProps>(({ onEnterReadMode }, ref) => {
    const { currentChatSession } = useActiveChatStore();
    const { visibleMessages, totalMessagesInSession, scrollBottomTrigger } = useMessageStore();
    const { t } = useTranslation();

    const messageListRef = useRef<HTMLDivElement>(null);
    const [expansionState, setExpansionState] = useState<Record<string, { content?: boolean; thoughts?: boolean }>>({});
    
    // Scroll Buttons State
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [showScrollBottom, setShowScrollBottom] = useState(false);

    // Smart Scroll Logic Refs
    const isAtBottomRef = useRef(true);

    const isCharacterMode = currentChatSession?.isCharacterModeActive || false;
    const characters = currentChatSession?.aiCharacters || [];
    const activeMemoryAnchorId = currentChatSession?.settings.activeMemoryAnchorId;

    const virtualizer = useVirtualizer({
        count: visibleMessages.length,
        getScrollElement: () => messageListRef.current,
        estimateSize: () => 150,
        overscan: 5,
        measureElement: (element) => (element as HTMLElement).offsetHeight,
    });

    const toggleExpansion = useCallback((messageId: string, type: 'content' | 'thoughts') => {
        setExpansionState(prev => ({ ...prev, [messageId]: { ...prev[messageId], [type]: !prev[messageId]?.[type] } }));
    }, []);

    // 1. SCROLL HANDLER: Track if user is at the bottom
    const handleScroll = useCallback(() => {
        if (messageListRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messageListRef.current;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
            
            // Smart Scroll Logic
            isAtBottomRef.current = distanceFromBottom < 100;

            // Toggle Buttons Visibility
            // Show Top button if scrolled down more than 500px
            setShowScrollTop(scrollTop > 500);
            
            // Show Bottom button if scrolled up more than 500px from bottom
            setShowScrollBottom(distanceFromBottom > 500);
        }
    }, []);

    const scrollToTop = useCallback(() => {
        virtualizer.scrollToIndex(0, { align: 'start', behavior: 'auto' });
    }, [virtualizer]);

    const scrollToBottom = useCallback(() => {
        if (visibleMessages.length > 0) {
            virtualizer.scrollToIndex(visibleMessages.length - 1, { align: 'end', behavior: 'auto' });
        }
    }, [virtualizer, visibleMessages.length]);

    // 2. CHAT SWITCH: Always force scroll to bottom when opening a new chat
    useEffect(() => {
        if (currentChatSession?.id && visibleMessages.length > 0) {
            isAtBottomRef.current = true; // Reset state for new chat
            setTimeout(() => {
                virtualizer.scrollToIndex(visibleMessages.length - 1, { align: 'end' });
            }, 0);
        }
    }, [currentChatSession?.id]);

    // 3. SMART STICKINESS: Only scroll on new messages if we were ALREADY at the bottom
    useEffect(() => {
        if (visibleMessages.length > 0) {
            // Only auto-scroll if the user hasn't scrolled up to read history
            if (isAtBottomRef.current) {
                setTimeout(() => {
                    virtualizer.scrollToIndex(visibleMessages.length - 1, { align: 'end' });
                }, 0);
            }
        }
    }, [visibleMessages, virtualizer]);

    // 4. EXPLICIT TRIGGER: Auto-scroll on delete/bulk actions
    useEffect(() => {
        if (visibleMessages.length > 0) {
            setTimeout(() => {
                virtualizer.scrollToIndex(visibleMessages.length - 1, { align: 'end' });
            }, 0);
        }
    }, [scrollBottomTrigger]);

    useImperativeHandle(ref, () => ({
        scrollToMessage: (messageId: string) => {
            const index = visibleMessages.findIndex(m => m.id === messageId);
    
            const highlightElement = (targetId: string) => {
                // Delay to allow virtualizer to render the element in the DOM
                setTimeout(() => {
                    const element = messageListRef.current?.querySelector(`#message-item-${targetId}`);
                    if (element) {
                        // Cleanup previous animation classes if present to reset
                        element.classList.remove(
                            'transition-all', 'duration-300', 'duration-[1500ms]', 'ease-out', 
                            'scale-[1.02]', 'bg-cyan-500/10', 'shadow-[0_0_20px_rgba(6,182,212,0.15)]', 
                            'z-10', 'relative'
                        );
                        
                        // Force reflow
                        void (element as HTMLElement).offsetWidth;

                        // Phase 1: Focus Flash & Pop (Fast entry)
                        element.classList.add(
                            'transition-all', 
                            'duration-300', 
                            'ease-out',
                            'scale-[1.02]', 
                            'bg-cyan-500/10', 
                            'shadow-[0_0_20px_rgba(6,182,212,0.15)]',
                            'z-10', 
                            'relative'
                        );

                        // Phase 2: Slow Fade Out (Relaxation)
                        setTimeout(() => {
                            // Switch to slow duration for the return animation
                            element.classList.remove('duration-300');
                            element.classList.add('duration-[1500ms]');
                            
                            // Remove transform/highlight properties to trigger the transition back to normal
                            element.classList.remove('scale-[1.02]', 'bg-cyan-500/10', 'shadow-[0_0_20px_rgba(6,182,212,0.15)]');
                            
                            // Final cleanup after fade completes
                            setTimeout(() => {
                                element.classList.remove('transition-all', 'duration-[1500ms]', 'z-10', 'relative');
                            }, 1500);
                        }, 400); // Hold the "Pop" for 400ms before fading out
                    }
                }, 150); // Short delay for virtualizer rendering
            };
    
            if (index > -1) {
                virtualizer.scrollToIndex(index, { align: 'center', behavior: 'auto' });
                highlightElement(messageId);
            }
        }
    }), [visibleMessages, virtualizer]);

    return (
        <div ref={messageListRef} onScroll={handleScroll} className={`flex-1 p-4 sm:p-6 overflow-y-auto relative`} role="log" aria-live="polite">
            
            {/* Top Scroll Button - Stick to absolute top edge */}
            <div className={`sticky top-0 w-full flex justify-end px-1 z-50 pointer-events-none transition-opacity duration-300 -mb-10 ${showScrollTop ? 'opacity-100' : 'opacity-0'}`}>
                <button
                    onClick={scrollToTop}
                    className="p-1.5 rounded-full bg-black/60 text-gray-400 hover:text-white hover:bg-black/80 backdrop-blur-md border border-white/10 shadow-lg pointer-events-auto transform translate-y-1"
                    title="Scroll to Top"
                >
                    <ChevronDoubleUpIcon className="w-4 h-4" />
                </button>
            </div>

            {currentChatSession ? (
                visibleMessages.length > 0 ? (
                    <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                        {virtualizer.getVirtualItems().map((virtualItem) => {
                            const msg = visibleMessages[virtualItem.index];
                            if (!msg) return null;
                            const fullMessageList = currentChatSession!.messages;
                            const currentMessageIndexInFullList = fullMessageList.findIndex(m => m.id === msg.id);
                            const nextMessageInFullList = (currentMessageIndexInFullList !== -1 && currentMessageIndexInFullList < fullMessageList.length - 1) ? fullMessageList[currentMessageIndexInFullList + 1] : null;
                            const canRegenerateFollowingAI = msg.role === ChatMessageRole.USER && nextMessageInFullList !== null && (nextMessageInFullList.role === ChatMessageRole.MODEL || nextMessageInFullList.role === ChatMessageRole.ERROR) && !isCharacterMode;
                            
                            const isLatestMemoryUpdate = msg.id === activeMemoryAnchorId;

                            return (
                                <div className="virtual-item-container" key={virtualItem.key} ref={virtualizer.measureElement} data-index={virtualItem.index} style={{ position: 'absolute', top: `${virtualItem.start}px`, left: 0, width: '100%' }}>
                                    <MessageItem 
                                        message={msg} 
                                        canRegenerateFollowingAI={canRegenerateFollowingAI} 
                                        chatScrollContainerRef={messageListRef} 
                                        onEnterReadMode={onEnterReadMode} 
                                        isContentExpanded={!!expansionState[msg.id]?.content} 
                                        isThoughtsExpanded={!!expansionState[msg.id]?.thoughts} 
                                        onToggleExpansion={toggleExpansion} 
                                        isLatestMemoryUpdate={isLatestMemoryUpdate}
                                    />
                                </div>
                            );
                        })}
                    </div>
                ) : ( <div className="text-center text-[var(--aurora-text-secondary)] italic mt-10">{isCharacterMode && characters.length === 0 ? "Add some characters and start the scene!" : (isCharacterMode ? "Select a character to speak." : t.noChats)}</div>)
            ) : ( <div className="text-center text-[var(--aurora-text-secondary)] italic mt-10">{t.noChats}</div>)}

            {/* Bottom Scroll Button - Stick to absolute bottom edge */}
            <div className={`sticky bottom-0 w-full flex justify-end px-1 z-50 pointer-events-none transition-opacity duration-300 -mt-10 ${showScrollBottom ? 'opacity-100' : 'opacity-0'}`}>
                <button
                    onClick={scrollToBottom}
                    className="p-1.5 rounded-full bg-[var(--aurora-accent-primary)]/90 text-white hover:bg-[var(--aurora-accent-primary)] backdrop-blur-md border border-white/10 shadow-lg pointer-events-auto transform -translate-y-1"
                    title="Scroll to Bottom"
                >
                    <ChevronDoubleDownIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}));

export default ChatMessageList;
