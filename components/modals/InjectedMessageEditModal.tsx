
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditorUI } from '../../store/ui/useEditorUI.ts';
import { useActiveChatStore } from '../../store/useActiveChatStore.ts';
import { useGeminiApiStore } from '../../store/useGeminiApiStore.ts';
import { useFileHandler } from '../../hooks/useFileHandler.ts';
import useAutoResizeTextarea from '../../hooks/useAutoResizeTextarea.ts';
import { XCircleIcon, ArrowPathIcon, UserIcon, MicrophoneIcon, StopCircleIcon, PaperClipIcon, DocumentIcon } from '../common/Icons.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { useTranscribe } from '../../hooks/useTranscribe.ts';
import AttachmentZone from '../chat/input/AttachmentZone.tsx';

const InjectedMessageEditModal: React.FC = () => {
  const { 
    isInjectedMessageEditModalOpen, 
    closeInjectedMessageEditModal, 
    injectedMessageEditTarget 
  } = useEditorUI();
  
  const { updateCurrentChatSession, currentChatSession } = useActiveChatStore();
  const { handleRegenerateResponseForUserMessage } = useGeminiApiStore.getState();
  const isLoading = useGeminiApiStore(s => s.isLoading);
  const { t } = useTranslation();

  const [inputValue, setInputValue] = useState('');
  const [areButtonsDisabled, setAreButtonsDisabled] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  
  const textareaRef = useAutoResizeTextarea<HTMLTextAreaElement>(inputValue);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Handler Hook
  const {
      files,
      handleFileSelection,
      handlePaste,
      removeFile,
      resetFiles,
      getValidFiles,
      isAnyFileStillProcessing
  } = useFileHandler();

  const originalMessage = currentChatSession?.messages.find(m => m.id === injectedMessageEditTarget?.messageId);

  const onTranscriptionComplete = useCallback((text: string) => {
    setInputValue(prev => prev ? `${prev} ${text}` : text);
    setTimeout(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
            const len = textareaRef.current.value.length;
            textareaRef.current.setSelectionRange(len, len);
        }
    }, 50);
  }, [textareaRef]);

  const { isRecording, isTranscribing, startRecording, stopRecording } = useTranscribe(onTranscriptionComplete);

  useEffect(() => {
    if (isInjectedMessageEditModalOpen) {
      setAreButtonsDisabled(true);
      const timerId = setTimeout(() => {
        setAreButtonsDisabled(false);
      }, 500);

      if (originalMessage) {
        setInputValue(originalMessage.content);
        resetFiles(); // New attachments only, simplistic approach for injected modal
      }
      return () => clearTimeout(timerId);
    }
  }, [isInjectedMessageEditModalOpen, originalMessage, resetFiles]);

  const handleSaveAndRegenerate = useCallback(async () => {
    if (!injectedMessageEditTarget || !originalMessage) return;

    // 1. Update the user message content & attachments
    await updateCurrentChatSession(session => {
      if (!session) return null;
      const messageIndex = session.messages.findIndex(m => m.id === injectedMessageEditTarget.messageId);
      if (messageIndex === -1) return session;

      const updatedMessages = [...session.messages];
      
      // Combine original attachments + new files
      const newAttachments = getValidFiles();
      const existingAttachments = originalMessage.attachments || [];
      const combinedAttachments = [...existingAttachments, ...newAttachments];

      updatedMessages[messageIndex] = {
        ...updatedMessages[messageIndex],
        content: inputValue,
        attachments: combinedAttachments
      };
      return { ...session, messages: updatedMessages };
    });

    // 2. Trigger regeneration
    handleRegenerateResponseForUserMessage(injectedMessageEditTarget.messageId);

    closeInjectedMessageEditModal();
  }, [injectedMessageEditTarget, inputValue, originalMessage, updateCurrentChatSession, handleRegenerateResponseForUserMessage, closeInjectedMessageEditModal, getValidFiles]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveAndRegenerate();
    }
  };
  
  const handleClose = () => {
    if (isRecording) stopRecording();
    closeInjectedMessageEditModal();
  };

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  const handleAttachClick = () => fileInputRef.current?.click();

  // Drag & Drop Handlers
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleFileSelection(e.dataTransfer.files);
      }
  }, [handleFileSelection]);

  if (!isInjectedMessageEditModalOpen || !injectedMessageEditTarget) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="injected-edit-modal-title"
    >
      <div 
        className={`aurora-panel p-6 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col relative transition-all ${isDragging ? 'ring-2 ring-[var(--aurora-accent-primary)] bg-black/40' : ''}`}
        onClick={e => e.stopPropagation()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-none rounded-lg">
                <div className="text-white font-bold text-lg flex items-center animate-bounce">
                    <DocumentIcon className="w-8 h-8 mr-3 text-[var(--aurora-accent-primary)]" />
                    <span>Drop files to attach</span>
                </div>
            </div>
        )}

        <header className="flex items-center justify-between mb-6">
          <h2 id="injected-edit-modal-title" className="text-lg font-semibold text-gray-100 flex items-center">
            <UserIcon className="w-5 h-5 mr-3 text-indigo-400" />
            {t.editUserMessageInjected}
          </h2>
          <button 
            onClick={handleClose} 
            disabled={areButtonsDisabled}
            className="p-1.5 text-gray-400 hover:text-white rounded-full transition-colors hover:bg-white/10 disabled:opacity-60"
            aria-label={t.close}
          >
            <XCircleIcon className="w-6 h-6" />
          </button>
        </header>

        {/* Card - Indigo */}
        <div className="relative p-4 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-indigo-500 bg-gradient-to-r from-indigo-500/5 to-transparent flex-grow mb-6 flex flex-col gap-3">
            
            {/* Attachments Area */}
            <AttachmentZone files={files} onRemove={removeFile} />

            <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                onPaste={handlePaste}
                className="w-full h-48 p-3 bg-black/20 border border-indigo-500/30 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder={t.typeUserMessage}
                aria-label="User message text"
            />
        </div>

        <footer className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
             {/* File Input */}
             <input 
                type="file" 
                multiple 
                ref={fileInputRef} 
                className="hidden" 
                onChange={(e) => handleFileSelection(e.target.files)}
             />
             <button
                onClick={handleAttachClick}
                disabled={areButtonsDisabled || isAnyFileStillProcessing}
                className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-md transition-colors disabled:opacity-50"
                title={t.addFiles}
             >
                <PaperClipIcon className="w-5 h-5" />
             </button>

             {/* Microphone */}
             <button
                onClick={toggleRecording}
                disabled={areButtonsDisabled || isTranscribing}
                className={`p-2 rounded-md transition-all duration-200 disabled:opacity-50 flex items-center justify-center border
                    ${isRecording 
                        ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]' 
                        : 'bg-white/5 text-gray-400 border-white/5 hover:text-white hover:bg-white/10'
                    }`}
                title={isRecording ? "Stop Recording" : "Voice Input"}
              >
                {isTranscribing ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent"></div>
                ) : isRecording ? (
                    <StopCircleIcon className="w-5 h-5" />
                ) : (
                    <MicrophoneIcon className="w-5 h-5" />
                )}
              </button>
          </div>

          <div className="flex space-x-3">
            <button 
                onClick={handleClose}
                disabled={areButtonsDisabled}
                className="px-5 py-2.5 text-sm font-medium text-gray-300 bg-white/5 rounded-md hover:bg-white/10 transition-colors disabled:opacity-60"
            >
                {t.cancel}
            </button>
            <button
                onClick={handleSaveAndRegenerate}
                disabled={areButtonsDisabled || isLoading || (inputValue.trim() === '' && files.length === 0) || isAnyFileStillProcessing}
                className="px-5 py-2.5 text-sm font-medium text-white bg-[var(--aurora-accent-primary)] rounded-md transition-all hover:shadow-[0_0_12px_2px_rgba(90,98,245,0.6)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
                <ArrowPathIcon className="w-5 h-5 mr-2" />
                {isLoading ? t.regenerating : t.regenerateAiResponse}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default InjectedMessageEditModal;
