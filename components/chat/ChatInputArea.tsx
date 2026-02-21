
import React, { useState, useCallback, memo, useMemo, useRef } from 'react';
import { useActiveChatStore } from '../../store/useActiveChatStore.ts';
import { useGeminiApiStore } from '../../store/useGeminiApiStore.ts';
import { useFileHandler } from '../../hooks/useFileHandler.ts';
import { useAutoSendStore } from '../../store/useAutoSendStore.ts';
import { useToastStore } from '../../store/useToastStore.ts';
import { useSelectionStore } from '../../store/useSelectionStore.ts';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';
import { DocumentIcon } from '../common/Icons.tsx';
import AutoSendControls from './AutoSendControls.tsx';
import { useShallow } from 'zustand/react/shallow';
import { useTranscribe } from '../../hooks/useTranscribe.ts';
import { ChatMessageRole } from '../../types.ts';

import AttachmentZone from './input/AttachmentZone.tsx';
import CharacterBar from './input/CharacterBar.tsx';
import InputActions from './input/InputActions.tsx';
import ChatTextArea, { ChatTextAreaHandle } from './input/ChatTextArea.tsx';
import GenerationTimer from '../common/GenerationTimer.tsx';
import PromptButtonsBar from './input/PromptButtonsBar.tsx';

interface ChatInputAreaProps {
    isReorderingActive: boolean;
}

const ChatInputArea: React.FC<ChatInputAreaProps> = memo(({ isReorderingActive }) => {
    const { 
        currentChatSessionId, 
        isCharacterMode, 
        showContinueFlowButton, 
        showAutoSendControls,
        showPromptButtonsBar,
        lastMessageRole 
    } = useActiveChatStore(useShallow(state => {
        const msgs = state.currentChatSession?.messages;
        return {
            currentChatSessionId: state.currentChatSession?.id,
            isCharacterMode: state.currentChatSession?.isCharacterModeActive || false,
            showContinueFlowButton: state.currentChatSession?.settings?.showContinueFlowButton || false,
            showAutoSendControls: state.currentChatSession?.settings?.showAutoSendControls || false,
            showPromptButtonsBar: state.currentChatSession?.settings?.showPromptButtonsBar ?? true,
            lastMessageRole: msgs && msgs.length > 0 ? msgs[msgs.length - 1].role : null,
        };
    }));

    const { isLoading, handleSendMessage, handleContinueFlow, handleCancelGeneration, handleRegenerateResponseForUserMessage } = useGeminiApiStore();
    
    const { 
        isAutoSendingActive, autoSendText, setAutoSendText, autoSendRepetitionsInput, 
        setAutoSendRepetitionsInput, autoSendRemaining, startAutoSend, stopAutoSend, 
        canStartAutoSend, isWaitingForErrorRetry, errorRetryCountdown 
    } = useAutoSendStore();

    const showToast = useToastStore(state => state.showToast);
    const { isSelectionModeActive } = useSelectionStore();
    const { t } = useTranslation();

    const chatTextAreaRef = useRef<ChatTextAreaHandle>(null);
    const [isTextEmpty, setIsTextEmpty] = useState(true); 
    const [isInfoInputModeActive, setIsInfoInputModeActive] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Use local file handler hook
    const {
        files: selectedFiles,
        handleFileSelection,
        handlePaste,
        removeFile,
        resetFiles,
        getValidFiles,
        isAnyFileStillProcessing
    } = useFileHandler();

    const onTranscriptionComplete = useCallback((text: string) => {
        if (chatTextAreaRef.current) {
            const currentText = chatTextAreaRef.current.getText();
            const newText = currentText ? `${currentText} ${text}` : text;
            chatTextAreaRef.current.setText(newText);
            chatTextAreaRef.current.focus();
        }
    }, []);

    const { isRecording, isTranscribing, startRecording, stopRecording } = useTranscribe(onTranscriptionComplete);

    const isPreparingAutoSend = useMemo(() => {
        return autoSendText.trim() !== '' && parseInt(autoSendRepetitionsInput, 10) > 0 && !isAutoSendingActive;
    }, [autoSendText, autoSendRepetitionsInput, isAutoSendingActive]);

    const canResend = useMemo(() => {
        return isTextEmpty && selectedFiles.length === 0 && (lastMessageRole === ChatMessageRole.USER || lastMessageRole === ChatMessageRole.ERROR);
    }, [isTextEmpty, selectedFiles.length, lastMessageRole]);

    const handleSendMessageClick = useCallback(async (characterId?: string, forceText?: string) => {
        let currentInputMessageValue = forceText !== undefined ? forceText : (chatTextAreaRef.current?.getText() || '');
        let attachmentsToSend = getValidFiles();
        let temporaryContextFlag = false;

        if (isLoading || !currentChatSessionId || isAutoSendingActive) return;

        if (isAnyFileStillProcessing) {
            showToast("Some files are still being processed. Please wait.", "error");
            return;
        }

        if (canResend && !currentInputMessageValue && attachmentsToSend.length === 0 && !isCharacterMode) {
             const currentSession = useActiveChatStore.getState().currentChatSession;
             if (currentSession) {
                 const msgs = currentSession.messages;
                 const lastUserMsg = msgs.slice().reverse().find(m => m.role === ChatMessageRole.USER);
                 
                 if (lastUserMsg) {
                     handleRegenerateResponseForUserMessage(lastUserMsg.id);
                     return; 
                 }
             }
        }

        if (isCharacterMode && characterId) {
            if (isPreparingAutoSend) {
                startAutoSend(autoSendText, parseInt(autoSendRepetitionsInput, 10) || 1, characterId);
                chatTextAreaRef.current?.clear();
                resetFiles();
                return;
            }
            if (isInfoInputModeActive) { temporaryContextFlag = !!currentInputMessageValue.trim(); }
        } else if (!isCharacterMode) {
            if (currentInputMessageValue.trim() === '' && attachmentsToSend.length === 0) return;
        } else { return; }

        chatTextAreaRef.current?.clear();
        resetFiles();
        if (isInfoInputModeActive && temporaryContextFlag) setIsInfoInputModeActive(false);

        await handleSendMessage(currentInputMessageValue, attachmentsToSend, undefined, characterId, temporaryContextFlag);
    }, [getValidFiles, isLoading, currentChatSessionId, isAutoSendingActive, isAnyFileStillProcessing, showToast, isCharacterMode, isInfoInputModeActive, handleSendMessage, resetFiles, isPreparingAutoSend, startAutoSend, autoSendText, autoSendRepetitionsInput, canResend, handleRegenerateResponseForUserMessage]);

    const handleInsertText = useCallback((text: string) => {
        if (chatTextAreaRef.current) {
            const current = chatTextAreaRef.current.getText();
            const newText = current ? `${current}\n${text}` : text;
            chatTextAreaRef.current.setText(newText);
            chatTextAreaRef.current.focus();
        }
    }, []);

    const handleDirectSend = useCallback((text: string) => {
        handleSendMessageClick(undefined, text);
    }, [handleSendMessageClick]);

    const handleContinueFlowClick = useCallback(async () => {
        if (isLoading || !currentChatSessionId || isCharacterMode || isAutoSendingActive) return;
        chatTextAreaRef.current?.clear();
        resetFiles();
        await handleContinueFlow();
    }, [isLoading, currentChatSessionId, isCharacterMode, isAutoSendingActive, handleContinueFlow, resetFiles]);

    const toggleInfoInputMode = useCallback(() => {
        setIsInfoInputModeActive(prev => {
            if (!prev) {
                chatTextAreaRef.current?.clear();
                resetFiles();
                setTimeout(() => chatTextAreaRef.current?.focus(), 50);
            }
            return !prev;
        });
    }, [resetFiles]);

    const handleMainCancelButtonClick = useCallback(async () => {
        if (isAutoSendingActive) await stopAutoSend();
        else if (isLoading) handleCancelGeneration();
    }, [isAutoSendingActive, stopAutoSend, isLoading, handleCancelGeneration]);

    const handleViewAttachments = useCallback(() => {
        const session = useActiveChatStore.getState().currentChatSession;
        if (session) {
            useSettingsUI.getState().openChatAttachmentsModal(session);
        } else {
            showToast("No active chat session.", "error");
        }
    }, [showToast]);

    const handleFileDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) setIsDragging(true);
    }, [isDragging]);

    const handleFileDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragging(false);
    }, []);

    const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelection(e.dataTransfer.files);
        }
    }, [handleFileSelection]);

    const onAttachHandler = useCallback((files: FileList | null) => {
        handleFileSelection(files);
    }, [handleFileSelection]);

    const onPasteHandler = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        handlePaste(e);
    }, [handlePaste]);

    const toggleRecording = useCallback(() => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }, [isRecording, startRecording, stopRecording]);

    const hasValidInputForMainSend = !isTextEmpty || selectedFiles.length > 0 || canResend;
    
    const loadingMessageContent = isLoading ? (
        isAutoSendingActive 
            ? <>{t.autoSending}: {autoSendRemaining} left... <GenerationTimer /></> 
            : <>{t.thinking} <GenerationTimer /></>
    ) : null;
    
    let placeholderText = isCharacterMode ? (isInfoInputModeActive ? t.enterContextualInfo : t.typeMessageChar) : t.typeMessage;

    return (
        <div className="sticky bottom-0 z-20 pb-6 px-4">
            <div className="mx-auto w-full max-w-4xl relative">
                
                {loadingMessageContent && (
                    <div className="absolute -top-7 left-0 right-0 text-center text-xs text-blue-400 font-medium animate-pulse drop-shadow-md z-30 pointer-events-none">
                        {loadingMessageContent}
                    </div>
                )}

                <div 
                    className={`border transition-all duration-200 relative overflow-hidden ${isDragging ? 'border-dashed border-[var(--aurora-accent-primary)] bg-[var(--aurora-accent-primary)]/10 ring-2 ring-[var(--aurora-accent-primary)]/50 scale-[1.01]' : 'border-white/10 bg-[var(--aurora-input-bg)] backdrop-blur-xl shadow-2xl'} ${isLoading ? 'ring-1 ring-[var(--aurora-accent-primary)]/50' : ''}`}
                    style={{ borderRadius: 'var(--aurora-input-radius)' }}
                    onDragOver={handleFileDragOver}
                    onDragLeave={handleFileDragLeave}
                    onDrop={handleFileDrop}
                >
                    {isDragging && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-none transition-opacity">
                            <div className="text-white font-bold text-lg flex items-center animate-bounce">
                                <DocumentIcon className="w-8 h-8 mr-3 text-[var(--aurora-accent-primary)]" />
                                <span>Drop files to attach</span>
                            </div>
                        </div>
                    )}
                    
                    {showPromptButtonsBar && currentChatSessionId && (
                        <PromptButtonsBar onInsert={handleInsertText} onSend={handleDirectSend} />
                    )}

                    <AttachmentZone files={selectedFiles} onRemove={removeFile} disabled={isSelectionModeActive} />

                    {isCharacterMode && (
                        <CharacterBar 
                            isReorderingActive={isReorderingActive} 
                            onCharacterClick={handleSendMessageClick} 
                            isInfoInputModeActive={isInfoInputModeActive}
                            disabled={!currentChatSessionId}
                            isFileProcessing={isAnyFileStillProcessing}
                        />
                    )}

                    {showAutoSendControls && (
                        <AutoSendControls 
                            isAutoSendingActive={isAutoSendingActive} 
                            autoSendText={autoSendText} 
                            setAutoSendText={setAutoSendText} 
                            autoSendRepetitionsInput={autoSendRepetitionsInput} 
                            setAutoSendRepetitionsInput={setAutoSendRepetitionsInput} 
                            autoSendRemaining={autoSendRemaining} 
                            onStartAutoSend={() => { if (!isCharacterMode && canStartAutoSend() && !isAutoSendingActive && !isLoading) { startAutoSend(autoSendText, parseInt(autoSendRepetitionsInput, 10) || 1); } }} 
                            onStopAutoSend={() => stopAutoSend()} 
                            canStart={canStartAutoSend()} 
                            isChatViewLoading={isLoading} 
                            currentChatSessionExists={!!currentChatSessionId} 
                            isCharacterMode={isCharacterMode} 
                            isPreparingAutoSend={isPreparingAutoSend} 
                            isWaitingForErrorRetry={isWaitingForErrorRetry} 
                            errorRetryCountdown={errorRetryCountdown} 
                        />
                    )}

                    <div className="p-3 relative flex items-end gap-2">
                        
                        <InputActions 
                            group="start"
                            isLoading={isLoading}
                            isAutoSendingActive={isAutoSendingActive}
                            isCharacterMode={isCharacterMode}
                            isSelectionModeActive={isSelectionModeActive}
                            isInfoInputModeActive={isInfoInputModeActive}
                            showContinueFlow={showContinueFlowButton}
                            hasValidInput={hasValidInputForMainSend}
                            onAttachClick={onAttachHandler}
                            onToggleInfoInput={toggleInfoInputMode}
                            onContinueFlow={handleContinueFlowClick}
                            onSend={handleSendMessageClick}
                            onCancel={handleMainCancelButtonClick}
                            onViewAttachments={handleViewAttachments}
                            onToggleRecording={toggleRecording}
                            isRecording={isRecording}
                            isTranscribing={isTranscribing}
                            isFileProcessing={isAnyFileStillProcessing}
                        />

                        <ChatTextArea
                            ref={chatTextAreaRef}
                            placeholder={placeholderText}
                            disabled={!currentChatSessionId || isAutoSendingActive || isSelectionModeActive}
                            onSend={() => { if (!isCharacterMode && !isAutoSendingActive) handleSendMessageClick(); }}
                            onPaste={onPasteHandler}
                            onEmptyChange={setIsTextEmpty}
                        />
                        
                        <InputActions 
                            group="end"
                            isLoading={isLoading}
                            isAutoSendingActive={isAutoSendingActive}
                            isCharacterMode={isCharacterMode}
                            isSelectionModeActive={isSelectionModeActive}
                            isInfoInputModeActive={isInfoInputModeActive}
                            showContinueFlow={showContinueFlowButton}
                            hasValidInput={hasValidInputForMainSend}
                            onAttachClick={onAttachHandler}
                            onToggleInfoInput={toggleInfoInputMode}
                            onContinueFlow={handleContinueFlowClick}
                            onSend={handleSendMessageClick}
                            onCancel={handleMainCancelButtonClick}
                            onViewAttachments={handleViewAttachments}
                            onToggleRecording={toggleRecording}
                            isRecording={isRecording}
                            isTranscribing={isTranscribing}
                            isFileProcessing={isAnyFileStillProcessing}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
});

export default ChatInputArea;
