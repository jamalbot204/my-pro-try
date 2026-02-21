
import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { useEditorUI } from '../../store/ui/useEditorUI.ts';
import { ChatMessageRole, Attachment } from '../../types.ts';
import { CloseIcon, SparklesIcon, UserIcon, SaveDiskIcon, XCircleIcon, SubmitPlayIcon, ContinueArrowIcon, PaperClipIcon, DocumentIcon } from '../common/Icons.tsx';
import useAutoResizeTextarea from '../../hooks/useAutoResizeTextarea.ts';
import { useGeminiApiStore } from '../../store/useGeminiApiStore.ts'; 
import { useFileHandler } from '../../hooks/useFileHandler.ts';
import { useTranslation } from '../../hooks/useTranslation.ts';
import AttachmentZone from '../chat/input/AttachmentZone.tsx';

export enum EditMessagePanelAction {
  CANCEL = 'cancel',
  SAVE_LOCALLY = 'save_locally',
  SAVE_AND_SUBMIT = 'save_and_submit',
  CONTINUE_PREFIX = 'continue_prefix',
}

export interface EditMessagePanelDetails {
  sessionId: string;
  messageId: string;
  originalContent: string;
  role: ChatMessageRole;
  attachments?: Attachment[];
}

const EditMessagePanel: React.FC = memo(() => {
  const { handleEditPanelSubmit, handleCancelGeneration } = useGeminiApiStore.getState();
  const isLoading = useGeminiApiStore(s => s.isLoading);
  const { isEditPanelOpen, editingMessageDetail, closeEditPanel } = useEditorUI();
  const { t } = useTranslation();

  const [editedContent, setEditedContent] = useState('');
  // Use hook for NEW attachments
  const { 
      files: newAttachments, 
      handleFileSelection, 
      handlePaste,
      removeFile: removeNewAttachment, 
      resetFiles,
      isAnyFileStillProcessing
  } = useFileHandler();

  // Local state for KEPT attachments (from original message)
  const [keptAttachments, setKeptAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  const textareaRef = useAutoResizeTextarea<HTMLTextAreaElement>(editedContent, 300);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [areButtonsDisabled, setAreButtonsDisabled] = useState(true);

  const isUserMessage = editingMessageDetail?.role === ChatMessageRole.USER;

  useEffect(() => {
    if (isEditPanelOpen) {
      setAreButtonsDisabled(true); 
      const timerId = setTimeout(() => {
        setAreButtonsDisabled(false);
      }, 500); 

      if (editingMessageDetail) {
        setEditedContent(editingMessageDetail.originalContent);
        resetFiles(); // Clear any previous new files
        setKeptAttachments(editingMessageDetail.attachments || []);
      }
      return () => clearTimeout(timerId); 
    }
  }, [isEditPanelOpen, editingMessageDetail, resetFiles]);

  useEffect(() => {
    if (isEditPanelOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditPanelOpen, textareaRef]);

  const handleAction = useCallback((action: EditMessagePanelAction) => {
    if (!editingMessageDetail) return;
    closeEditPanel();
    handleEditPanelSubmit(action, editedContent, editingMessageDetail as any, newAttachments, keptAttachments);
  }, [editingMessageDetail, handleEditPanelSubmit, editedContent, newAttachments, keptAttachments, closeEditPanel]);
  
  const handleCancelClick = useCallback(() => {
    if (editingMessageDetail && isLoading && editingMessageDetail.role === ChatMessageRole.MODEL) {
      handleCancelGeneration();
    }
    closeEditPanel();
  }, [isLoading, editingMessageDetail, handleCancelGeneration, closeEditPanel]);

  const removeKeptAttachment = useCallback((id: string) => {
      setKeptAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  // Drag & Drop Handlers
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isUserMessage) return;
      if (!isDragging) setIsDragging(true);
  }, [isDragging, isUserMessage]);

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
      if (!isUserMessage) return;
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleFileSelection(e.dataTransfer.files);
      }
  }, [handleFileSelection, isUserMessage]);

  const onPasteHandler = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (isUserMessage) handlePaste(e);
  }, [handlePaste, isUserMessage]);

  if (!isEditPanelOpen || !editingMessageDetail) return null;
  
  const panelTitle = editingMessageDetail.role === ChatMessageRole.USER ? t.editUserMessage : t.editAiResponse;
  const IconComponent = editingMessageDetail.role === ChatMessageRole.USER ? UserIcon : SparklesIcon;

  const baseButtonClass = "px-4 py-2.5 text-sm font-medium rounded-md transition-shadow flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black";
  const cancelButtonClass = `${baseButtonClass} text-gray-300 bg-white/5 hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)] focus:ring-gray-500`;
  const saveLocallyButtonClass = `${baseButtonClass} text-white bg-blue-600/80 hover:shadow-[0_0_12px_2px_rgba(59,130,246,0.6)] focus:ring-blue-500`;
  const continuePrefixButtonClass = `${baseButtonClass} text-white bg-teal-600/80 hover:shadow-[0_0_12px_2px_rgba(13,148,136,0.6)] focus:ring-teal-500`;
  const saveSubmitButtonClass = `${baseButtonClass} text-white bg-green-600/80 hover:shadow-[0_0_12px_2px_rgba(34,197,94,0.6)] focus:ring-green-500`;

  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex justify-center items-center p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="edit-message-panel-title" onClick={handleCancelClick}>
      <div 
        className={`aurora-panel p-5 sm:p-6 rounded-lg shadow-2xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col text-gray-200 relative overflow-hidden transition-all ${isDragging ? 'ring-2 ring-[var(--aurora-accent-primary)] bg-black/40' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-none">
                <div className="text-white font-bold text-lg flex items-center animate-bounce">
                    <DocumentIcon className="w-8 h-8 mr-3 text-[var(--aurora-accent-primary)]" />
                    <span>Drop files to attach</span>
                </div>
            </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-gray-400" />
            <h2 id="edit-message-panel-title" className="text-lg sm:text-xl font-semibold text-gray-100">{panelTitle}</h2>
          </div>
          <button onClick={handleCancelClick} disabled={areButtonsDisabled} className="text-gray-400 p-1 rounded-full disabled:opacity-60 transition-shadow hover:text-gray-100 hover:shadow-[0_0_10px_1px_rgba(255,255,255,0.2)]" aria-label={t.close}>
            <CloseIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        <textarea ref={textareaRef} value={editedContent} onChange={(e) => setEditedContent(e.target.value)} onPaste={onPasteHandler} className="w-full flex-grow p-3 aurora-textarea resize-none hide-scrollbar text-sm sm:text-base leading-relaxed" placeholder={t.enterMessageContent} style={{ minHeight: '200px' }} disabled={isLoading && editingMessageDetail.role === ChatMessageRole.MODEL} aria-label="Message content editor" />
        
        {/* Render Kept Attachments (Using reused AttachmentZone) */}
        {keptAttachments.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--aurora-border)]">
                <p className="text-xs text-gray-400 mb-1.5">Existing Attachments</p>
                <AttachmentZone files={keptAttachments} onRemove={removeKeptAttachment} />
            </div>
        )}

        {isUserMessage && (
          <div className="mt-3 pt-3 border-t border-[var(--aurora-border)]">
              <div className="flex justify-between items-center mb-2">
                 <p className="text-xs text-gray-400">{t.addNewAttachments}</p>
                 <input type="file" multiple ref={fileInputRef} onChange={(e) => handleFileSelection(e.target.files)} className="hidden" />
                 <button onClick={() => fileInputRef.current?.click()} disabled={areButtonsDisabled || isAnyFileStillProcessing} className="flex items-center px-2 py-1 text-xs font-medium text-white bg-blue-600/50 rounded-md transition-shadow hover:shadow-[0_0_10px_1px_rgba(59,130,246,0.6)] disabled:opacity-50">
                    <PaperClipIcon className="w-3.5 h-3.5 mr-1" /> {t.addFiles}
                 </button>
              </div>
              
              {/* Render New Attachments using the unified component */}
              <AttachmentZone files={newAttachments} onRemove={removeNewAttachment} />
          </div>
        )}

        <div className="mt-5 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <button onClick={handleCancelClick} className={cancelButtonClass} disabled={areButtonsDisabled} aria-label={t.cancel}><XCircleIcon className="w-4 h-4 mr-1.5" /> {t.cancel}</button>
          <button onClick={() => handleAction(EditMessagePanelAction.SAVE_LOCALLY)} className={saveLocallyButtonClass} disabled={areButtonsDisabled || isLoading || isAnyFileStillProcessing || (editedContent.trim() === editingMessageDetail.originalContent.trim() && newAttachments.length === 0 && keptAttachments.length === (editingMessageDetail.attachments?.length || 0))} aria-label={t.saveLocally}><SaveDiskIcon className="w-4 h-4 mr-1.5"/>{t.saveLocally}</button>
          <button onClick={() => handleAction(EditMessagePanelAction.CONTINUE_PREFIX)} className={continuePrefixButtonClass} disabled={areButtonsDisabled || isLoading || isAnyFileStillProcessing || editedContent.trim() === ''} aria-label={t.continuePrefix}>
            {isLoading && editingMessageDetail.role === ChatMessageRole.MODEL ? (<svg className="animate-spin h-4 w-4 mr-1.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>) : <ContinueArrowIcon className="w-4 h-4 mr-1.5"/>}
            {isLoading && editingMessageDetail.role === ChatMessageRole.MODEL ? t.continuing : t.continuePrefix}
          </button>
          <button onClick={() => handleAction(EditMessagePanelAction.SAVE_AND_SUBMIT)} className={saveSubmitButtonClass} disabled={areButtonsDisabled || isLoading || isAnyFileStillProcessing || editedContent.trim() === ''} aria-label={t.saveAndSubmit}><SubmitPlayIcon className="w-4 h-4 mr-1.5"/>{t.saveAndSubmit}</button>
        </div>
      </div>
    </div>
  );
});

export default EditMessagePanel;
