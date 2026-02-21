
import React, { memo, useRef, useCallback, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PaperClipIcon, InfoIcon, FlowRightIcon, StopIcon, SendIcon, FolderOpenIcon, PlusIcon, MicrophoneIcon, StopCircleIcon } from '../../common/Icons.tsx';
import ChatToolsMenu from '../ChatToolsMenu.tsx';
import { useTranslation } from '../../../hooks/useTranslation.ts';

interface InputActionsProps {
    group: 'start' | 'end';
    isLoading: boolean;
    isAutoSendingActive: boolean;
    isCharacterMode: boolean;
    isSelectionModeActive: boolean;
    isInfoInputModeActive: boolean;
    showContinueFlow: boolean;
    hasValidInput: boolean;
    onAttachClick: (files: FileList | null) => void;
    onToggleInfoInput: () => void;
    onContinueFlow: () => void;
    onSend: () => void;
    onCancel: () => void;
    onViewAttachments: () => void;
    onToggleRecording: () => void;
    isRecording: boolean;
    isTranscribing: boolean;
    isFileProcessing: boolean; // Prop for file status
}

const InputActions: React.FC<InputActionsProps> = memo(({
    group,
    isLoading,
    isAutoSendingActive,
    isCharacterMode,
    isSelectionModeActive,
    isInfoInputModeActive,
    showContinueFlow,
    hasValidInput,
    onAttachClick,
    onToggleInfoInput,
    onContinueFlow,
    onSend,
    onCancel,
    onViewAttachments,
    onToggleRecording,
    isRecording,
    isTranscribing,
    isFileProcessing
}) => {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Dropdown state
    const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
    const attachBtnRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onAttachClick(e.target.files);
        // Reset input value to allow selecting same file again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [onAttachClick]);

    const handleAttachBtnClick = useCallback(() => {
        setIsAttachMenuOpen(prev => !prev);
    }, []);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current && 
                !menuRef.current.contains(event.target as Node) && 
                attachBtnRef.current && 
                !attachBtnRef.current.contains(event.target as Node)
            ) {
                setIsAttachMenuOpen(false);
            }
        };

        if (isAttachMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('resize', () => setIsAttachMenuOpen(false));
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', () => setIsAttachMenuOpen(false));
        };
    }, [isAttachMenuOpen]);

    // Menu Positioning Logic
    useEffect(() => {
        if (isAttachMenuOpen && attachBtnRef.current) {
            const rect = attachBtnRef.current.getBoundingClientRect();
            // Position above the button with a small gap
            const bottom = window.innerHeight - rect.top + 8; 
            
            // Check if button is on the left half of the screen
            const isLeft = rect.left < window.innerWidth / 2;
            
            setMenuStyle({
                position: 'fixed',
                bottom: bottom,
                left: isLeft ? rect.left : 'auto',
                right: isLeft ? 'auto' : window.innerWidth - rect.right,
                zIndex: 50,
                opacity: 1
            });
        }
    }, [isAttachMenuOpen]);

    const isDisabledGeneral = isInfoInputModeActive || isAutoSendingActive || isSelectionModeActive;

    if (group === 'start') {
        return (
            <div className="flex flex-col gap-1 pb-1.5">
                <input 
                    type="file" 
                    multiple 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                />
                <button 
                    ref={attachBtnRef}
                    onClick={handleAttachBtnClick} 
                    disabled={isDisabledGeneral} 
                    className={`p-2 rounded-full transition-colors disabled:opacity-50 ${isAttachMenuOpen ? 'text-[var(--aurora-accent-primary)] bg-[var(--aurora-accent-primary)]/10' : 'text-gray-400 hover:text-white hover:bg-white/10'}`} 
                    title={t.attachFiles}
                >
                    <PaperClipIcon className="w-5 h-5" />
                </button>
                
                {/* Dropdown Menu Portal */}
                {isAttachMenuOpen && createPortal(
                    <div 
                        ref={menuRef}
                        className="aurora-panel rounded-lg shadow-xl p-1 min-w-[160px] flex flex-col gap-1 border border-white/10 bg-[rgba(20,20,20,0.95)] backdrop-blur-md"
                        style={menuStyle}
                    >
                        <button 
                            onClick={() => { fileInputRef.current?.click(); setIsAttachMenuOpen(false); }}
                            className="flex items-center px-3 py-2 text-xs font-medium text-gray-200 hover:bg-white/10 rounded-md transition-colors w-full text-left"
                        >
                            <PlusIcon className="w-4 h-4 mr-2 text-green-400" />
                            {t.addFiles}
                        </button>
                        <button 
                            onClick={() => { onViewAttachments(); setIsAttachMenuOpen(false); }}
                            className="flex items-center px-3 py-2 text-xs font-medium text-gray-200 hover:bg-white/10 rounded-md transition-colors w-full text-left"
                        >
                            <FolderOpenIcon className="w-4 h-4 mr-2 text-orange-400" />
                            {t.chatAttachments}
                        </button>
                    </div>,
                    document.body
                )}
                
                <ChatToolsMenu />
                
                {isCharacterMode && (
                    <button 
                        onClick={onToggleInfoInput} 
                        disabled={isLoading || isAutoSendingActive || isSelectionModeActive} 
                        className={`p-2 rounded-full transition-colors disabled:opacity-50 ${isInfoInputModeActive ? 'bg-yellow-500/20 text-yellow-300' : 'text-gray-400 hover:text-white hover:bg-white/10'}`} 
                        title={isInfoInputModeActive ? t.disableContextInput : t.enableContextInput}
                    >
                        <InfoIcon className="w-5 h-5" />
                    </button>
                )}
            </div>
        );
    }

    if (group === 'end') {
        return (
            <div className="flex flex-col gap-1 pb-1.5 items-center">
                {!isCharacterMode && showContinueFlow && (
                    <button 
                        onClick={onContinueFlow} 
                        disabled={isLoading || isFileProcessing || isCharacterMode || isAutoSendingActive || isSelectionModeActive} 
                        className="p-2 text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 rounded-full transition-colors disabled:opacity-30" 
                        title={t.continueFlow}
                    >
                        <FlowRightIcon className="w-5 h-5" />
                    </button>
                )}

                {/* Microphone Button */}
                <button
                    onClick={onToggleRecording}
                    disabled={isTranscribing || isLoading || isAutoSendingActive || isSelectionModeActive}
                    className={`p-2 rounded-full transition-all duration-200 disabled:opacity-50 
                        ${isRecording 
                            ? 'bg-red-500/20 text-red-400 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.4)]' 
                            : 'text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                    title={isRecording ? "Stop Recording" : "Voice Input"}
                >
                    {isTranscribing ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent"></div>
                    ) : isRecording ? (
                        <StopCircleIcon className="w-6 h-6" />
                    ) : (
                        <MicrophoneIcon className="w-5 h-5" />
                    )}
                </button>
                
                {(isLoading || isAutoSendingActive) ? (
                    <button 
                        onClick={onCancel} 
                        className="p-2.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30" 
                        aria-label={t.stop}
                    >
                        <StopIcon className="w-5 h-5" />
                    </button>
                ) : (
                    <button 
                        onClick={onSend} 
                        disabled={!hasValidInput || isFileProcessing || isCharacterMode || isAutoSendingActive || isSelectionModeActive || isRecording} 
                        className={`p-2.5 bg-[var(--aurora-accent-primary)] text-white rounded-full hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:shadow-none ${isCharacterMode ? 'hidden' : ''}`} 
                        aria-label={t.sendMessage}
                    >
                        <SendIcon className="w-5 h-5" />
                    </button>
                )}
            </div>
        );
    }

    return null;
});

export default InputActions;
