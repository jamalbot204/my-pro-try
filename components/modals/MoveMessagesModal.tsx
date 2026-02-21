
import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';
import { useChatListStore } from '../../store/useChatListStore.ts';
import { useActiveChatStore } from '../../store/useActiveChatStore.ts';
import { useSelectionStore } from '../../store/useSelectionStore.ts';
import { useInteractionStore } from '../../store/useInteractionStore.ts';
import { ArrowRightStartOnRectangleIcon, CloseIcon, UsersIcon } from '../common/Icons.tsx';
import BaseModal from '../common/BaseModal.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';

const MoveMessagesModal: React.FC = memo(() => {
    const { isMoveMessagesModalOpen, closeMoveMessagesModal } = useSettingsUI();
    const { chatHistory } = useChatListStore();
    const { currentChatId } = useActiveChatStore();
    const { selectedMessageIds } = useSelectionStore();
    const { handleMoveMessagesToChat } = useInteractionStore();
    const { t } = useTranslation();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
    const [isMoving, setIsMoving] = useState(false);

    useEffect(() => {
        if (isMoveMessagesModalOpen) {
            setSearchTerm('');
            setSelectedTargetId(null);
            setIsMoving(false);
        }
    }, [isMoveMessagesModalOpen]);

    const eligibleChats = useMemo(() => {
        return chatHistory.filter(chat => chat.id !== currentChatId);
    }, [chatHistory, currentChatId]);

    const filteredChats = useMemo(() => {
        if (!searchTerm.trim()) return eligibleChats;
        const lowerTerm = searchTerm.toLowerCase();
        return eligibleChats.filter(chat => chat.title.toLowerCase().includes(lowerTerm));
    }, [eligibleChats, searchTerm]);

    const handleConfirm = useCallback(async () => {
        if (!selectedTargetId) return;
        setIsMoving(true);
        await handleMoveMessagesToChat(selectedTargetId, selectedMessageIds);
        setIsMoving(false);
        closeMoveMessagesModal();
    }, [selectedTargetId, selectedMessageIds, handleMoveMessagesToChat, closeMoveMessagesModal]);

    const footerButtons = (
        <>
            <button 
                onClick={closeMoveMessagesModal} 
                disabled={isMoving}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 rounded hover:bg-white/10 disabled:opacity-60"
            >
                {t.cancel}
            </button>
            <button 
                onClick={handleConfirm}
                disabled={!selectedTargetId || isMoving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600/80 rounded hover:bg-blue-500 hover:shadow-lg disabled:opacity-50 flex items-center"
            >
                {isMoving ? (
                    <span className="animate-pulse">Copying...</span>
                ) : (
                    <>
                        <ArrowRightStartOnRectangleIcon className="w-4 h-4 mr-1.5" />
                        Copy to Chat
                    </>
                )}
            </button>
        </>
    );

    return (
        <BaseModal
            isOpen={isMoveMessagesModalOpen}
            onClose={closeMoveMessagesModal}
            title="Copy Messages To..."
            headerIcon={<ArrowRightStartOnRectangleIcon className="w-5 h-5 text-blue-400" />}
            footer={footerButtons}
            maxWidth="sm:max-w-lg"
        >
            <div className="space-y-4">
                <p className="text-sm text-gray-400">
                    Select a destination chat to copy the <strong>{selectedMessageIds.length}</strong> selected message(s) to. 
                    They will appear at the end of the target chat history.
                </p>

                <input
                    type="text"
                    placeholder="Search chats..."
                    className="w-full p-2.5 aurora-input text-sm border-blue-500/30 focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                />

                <div className="max-h-60 overflow-y-auto border border-[var(--aurora-border)] rounded-md bg-black/20 p-1 custom-scrollbar">
                    {filteredChats.length === 0 ? (
                        <p className="text-center text-gray-500 py-6 italic text-sm">No other chats found.</p>
                    ) : (
                        <div className="space-y-1">
                            {filteredChats.map(chat => {
                                const isSelected = selectedTargetId === chat.id;
                                return (
                                    <div 
                                        key={chat.id}
                                        onClick={() => setSelectedTargetId(chat.id)}
                                        className={`flex items-center p-2 rounded cursor-pointer transition-colors ${isSelected ? 'bg-blue-600/20 border border-blue-500/50' : 'hover:bg-white/5 border border-transparent'}`}
                                    >
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-center">
                                                <p className={`text-sm truncate font-medium ${isSelected ? 'text-blue-100' : 'text-gray-300'}`}>
                                                    {chat.title}
                                                </p>
                                                {chat.isCharacterModeActive && <UsersIcon className="w-3 h-3 ml-2 text-fuchsia-400 flex-shrink-0" />}
                                            </div>
                                            <p className="text-[10px] text-gray-500 truncate">
                                                Last updated: {new Date(chat.lastUpdatedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </BaseModal>
    );
});

export default MoveMessagesModal;
