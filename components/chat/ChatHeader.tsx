
import React, { memo, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGlobalUiStore } from '../../store/useGlobalUiStore.ts';
import { useActiveChatStore } from '../../store/useActiveChatStore.ts';
import { useDataStore } from '../../store/useDataStore.ts';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';
import { useSelectionStore } from '../../store/useSelectionStore.ts';
import { useInteractionStore } from '../../store/useInteractionStore.ts';
import { useGeminiApiStore } from '../../store/useGeminiApiStore.ts';
import { clearCacheAndReload } from '../../services/pwaService.ts';
import { getModelDisplayName } from '../../services/llm/config.ts';
import { MODEL_DEFINITIONS } from '../../constants.ts';
import { 
    Bars3Icon, UsersIcon, ArrowPathIcon, ClipboardDocumentCheckIcon, 
    XCircleIcon, StarIcon, ArrowsUpDownIcon, CheckIcon, PlusIcon, SparklesIcon,
    ChevronDownIcon
} from '../common/Icons.tsx';
import ManualSaveButton from '../common/ManualSaveButton.tsx';
import FavoritesDropdown from '../common/FavoritesDropdown.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';

interface ChatHeaderProps {
    isReorderingActive: boolean;
    toggleReordering: () => void;
    onJumpToMessage: (messageId: string) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = memo(({ isReorderingActive, toggleReordering, onJumpToMessage }) => {
    const { currentChatSession } = useActiveChatStore();
    const { toggleSidebar, isSidebarOpen } = useGlobalUiStore();
    const { handleManualSave, updateModel } = useDataStore();
    const { isLoading } = useGeminiApiStore();
    const { isSelectionModeActive, toggleSelectionMode } = useSelectionStore();
    const { toggleFavoriteMessage } = useInteractionStore();
    const { openCharacterManagementModal } = useSettingsUI();
    const { t } = useTranslation();
    
    const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
    const favoritesButtonRef = useRef<HTMLButtonElement>(null);

    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const modelButtonRef = useRef<HTMLButtonElement>(null);
    const modelMenuRef = useRef<HTMLDivElement>(null);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    const isCharacterMode = currentChatSession?.isCharacterModeActive || false;
    const modelName = currentChatSession ? getModelDisplayName(currentChatSession.model) : '';

    // Calculate position when menu opens
    useLayoutEffect(() => {
        if (isModelMenuOpen && modelButtonRef.current) {
            const rect = modelButtonRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + 6, // Slight gap
                left: rect.left
            });
        }
    }, [isModelMenuOpen]);

    // Handle closing model menu when clicking outside or resizing
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                modelMenuRef.current && 
                !modelMenuRef.current.contains(event.target as Node) &&
                modelButtonRef.current && 
                !modelButtonRef.current.contains(event.target as Node)
            ) {
                setIsModelMenuOpen(false);
            }
        };

        const handleResize = () => {
            if (isModelMenuOpen) setIsModelMenuOpen(false);
        };

        if (isModelMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('resize', handleResize);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', handleResize);
        };
    }, [isModelMenuOpen]);

    const handleModelSelect = async (modelId: string) => {
        if (!currentChatSession) return;
        setIsModelMenuOpen(false);
        
        // Optimistic UI Update
        await useActiveChatStore.getState().updateCurrentChatSession(s => s ? ({ ...s, model: modelId }) : null);
        
        // Persist to Database
        await updateModel(currentChatSession.id, modelId);
    };

    return (
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-[rgba(13,15,24,0.6)] backdrop-blur-xl border-b border-white/5 shadow-sm transition-all duration-300">
            <div className="flex items-center gap-3 overflow-hidden">
                <button 
                    onClick={toggleSidebar} 
                    className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-white/20" 
                    title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"} 
                    aria-label={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
                >
                    <Bars3Icon className="w-5 h-5" />
                </button>
                
                <div className="flex flex-col min-w-0">
                    <h1 className="text-sm sm:text-base font-bold text-white truncate flex items-center gap-2 tracking-tight">
                        {currentChatSession ? currentChatSession.title : t.chatInterface}
                        {isCharacterMode && <UsersIcon className="w-4 h-4 text-fuchsia-400 flex-shrink-0" />}
                    </h1>
                    {currentChatSession && (
                        <>
                            <div className="flex items-center gap-2 mt-0.5">
                                <button 
                                    ref={modelButtonRef}
                                    onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider shadow-[0_0_10px_-3px_rgba(0,0,0,0.3)] transition-all hover:bg-white/5 cursor-pointer ${
                                        isCharacterMode 
                                            ? 'bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 border-fuchsia-500/20 text-fuchsia-300' 
                                            : 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-blue-500/20 text-cyan-300'
                                    }`}
                                    title="Switch Model"
                                >
                                    <SparklesIcon className="w-2.5 h-2.5 mr-1.5" />
                                    {modelName}
                                    <ChevronDownIcon className={`w-2.5 h-2.5 ml-1 opacity-70 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
                                </button>
                            </div>

                            {isModelMenuOpen && createPortal(
                                <div 
                                    ref={modelMenuRef}
                                    className="fixed w-56 aurora-panel rounded-lg shadow-xl p-1 flex flex-col gap-0.5 border border-white/10 bg-[rgba(20,20,20,0.95)] backdrop-blur-md z-[100] animate-fade-in"
                                    style={{ 
                                        top: menuPosition.top, 
                                        left: menuPosition.left,
                                        // Ensure it doesn't go off-screen roughly
                                        maxWidth: 'calc(100vw - 20px)'
                                    }}
                                >
                                    <div className="px-2 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 mb-1">
                                        Select Model
                                    </div>
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                                        {MODEL_DEFINITIONS.map(def => (
                                            <button
                                                key={def.id}
                                                onClick={() => handleModelSelect(def.id)}
                                                className={`text-left px-3 py-2 text-xs rounded-md transition-colors flex justify-between items-center ${
                                                    currentChatSession.model === def.id 
                                                        ? 'bg-[var(--aurora-accent-primary)] text-white font-medium shadow-md' 
                                                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                                                }`}
                                            >
                                                <span className="truncate mr-2">{def.name}</span>
                                                {currentChatSession.model === def.id && <CheckIcon className="w-3 h-3 flex-shrink-0" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>,
                                document.body
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
                {currentChatSession && (
                    <>
                        <div className="flex items-center gap-1">
                            <ManualSaveButton 
                                onManualSave={handleManualSave} 
                                disabled={!currentChatSession || isLoading} 
                                className="p-2 text-gray-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-all"
                            />
                            <button
                                onClick={clearCacheAndReload}
                                className="p-2 text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-all"
                                title={t.hardReload}
                                aria-label={t.hardReload}
                            >
                                <ArrowPathIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="w-px h-4 bg-white/10 mx-1"></div>

                        <div className="flex items-center gap-1">
                            <button 
                                onClick={toggleSelectionMode} 
                                className={`p-2 rounded-lg transition-all ${
                                    isSelectionModeActive 
                                        ? 'bg-blue-500/20 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`} 
                                title={isSelectionModeActive ? t.done : t.selectMultiple} 
                                aria-label={isSelectionModeActive ? t.done : t.selectMultiple}
                            >
                                {isSelectionModeActive ? <CheckIcon className="w-4 h-4" /> : <ClipboardDocumentCheckIcon className="w-4 h-4" />}
                            </button>
                            
                            <div className="relative">
                                <button
                                    ref={favoritesButtonRef}
                                    onClick={() => setIsFavoritesOpen(prev => !prev)}
                                    className={`p-2 rounded-lg transition-all ${
                                        isFavoritesOpen 
                                            ? 'bg-yellow-500/20 text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.3)]' 
                                            : 'text-gray-400 hover:text-yellow-300 hover:bg-yellow-500/10'
                                    }`}
                                    title={t.viewFavorites}
                                    aria-label={t.viewFavorites}
                                >
                                    <StarIcon className="w-4 h-4" />
                                </button>
                                <FavoritesDropdown
                                    triggerRef={favoritesButtonRef}
                                    isOpen={isFavoritesOpen}
                                    onClose={() => setIsFavoritesOpen(false)}
                                    messages={currentChatSession?.messages || []}
                                    onJumpToMessage={(messageId) => {
                                        onJumpToMessage(messageId);
                                        setIsFavoritesOpen(false);
                                    }}
                                    onRemoveFavorite={toggleFavoriteMessage}
                                />
                            </div>
                        </div>

                        {isCharacterMode && (
                            <>
                                <div className="w-px h-4 bg-white/10 mx-1"></div>
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={toggleReordering} 
                                        className={`p-2 rounded-lg transition-all ${
                                            isReorderingActive 
                                                ? 'bg-green-500/20 text-green-300 shadow-[0_0_10px_rgba(34,197,94,0.3)]' 
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`} 
                                        title={isReorderingActive ? t.done : t.editOrder}
                                    >
                                        <ArrowsUpDownIcon className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={openCharacterManagementModal} 
                                        className="p-2 text-fuchsia-400 hover:text-fuchsia-300 hover:bg-fuchsia-500/10 rounded-lg transition-all" 
                                        title={t.manageCharacters}
                                        disabled={isReorderingActive}
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </header>
    );
});

export default ChatHeader;
