
import React, { useCallback, memo, Suspense } from 'react';
import { useConfirmationUI } from '../../store/ui/useConfirmationUI.ts';
import { useEditorUI } from '../../store/ui/useEditorUI.ts';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';

import { useApiKeyStore } from '../../store/useApiKeyStore.ts';
import { useChatListStore } from '../../store/useChatListStore.ts';
import { useActiveChatStore } from '../../store/useActiveChatStore.ts';
import { useInteractionStore } from '../../store/useInteractionStore.ts';
import { useToastStore } from '../../store/useToastStore.ts';
import { useGithubStore } from '../../store/useGithubStore.ts';
import { useSelectionStore } from '../../store/useSelectionStore.ts';
import { useHistorySelectionStore } from '../../store/useHistorySelectionStore.ts';
import { usePromptButtonStore } from '../../store/usePromptButtonStore.ts';
import { useArchiverStore } from '../../store/useArchiverStore.ts';
import { useTranslation } from '../../hooks/useTranslation.ts';

// Lazy Imports for Modals (Performance Optimization)
const SettingsPanel = React.lazy(() => import('../settings/SettingsPanel.tsx'));
const EditMessagePanel = React.lazy(() => import('../panels/EditMessagePanel.tsx'));
const CharacterManagementModal = React.lazy(() => import('../modals/CharacterManagementModal.tsx'));
const CharacterContextualInfoModal = React.lazy(() => import('../modals/CharacterContextualInfoModal.tsx'));
const DebugTerminalPanel = React.lazy(() => import('../panels/DebugTerminalPanel.tsx'));
const ConfirmationModal = React.lazy(() => import('../modals/ConfirmationModal.tsx'));
const TtsSettingsModal = React.lazy(() => import('../modals/TtsSettingsModal.tsx'));
const ExportConfigurationModal = React.lazy(() => import('../modals/ExportConfigurationModal.tsx'));
const FilenameInputModal = React.lazy(() => import('../modals/FilenameInputModal.tsx'));
const ChatAttachmentsModal = React.lazy(() => import('../chat/ChatAttachmentsModal.tsx'));
const MultiSelectActionBar = React.lazy(() => import('../chat/MultiSelectActionBar.tsx'));
const ApiKeyModal = React.lazy(() => import('../modals/ApiKeyModal.tsx'));
const GitHubImportModal = React.lazy(() => import('../modals/GitHubImportModal.tsx'));
const InjectedMessageEditModal = React.lazy(() => import('../modals/InjectedMessageEditModal.tsx'));
const MemorySourceSelectionModal = React.lazy(() => import('../modals/MemorySourceSelectionModal.tsx'));
const ReasoningSetupModal = React.lazy(() => import('../modals/ReasoningSetupModal.tsx'));
const ShadowSetupModal = React.lazy(() => import('../modals/ShadowSetupModal.tsx'));
const ActiveMemoryModal = React.lazy(() => import('../modals/ActiveMemoryModal.tsx'));
const StrategySetupModal = React.lazy(() => import('../modals/StrategySetupModal.tsx'));
const TelegramImportModal = React.lazy(() => import('../modals/TelegramImportModal.tsx'));
const CustomStrategyModal = React.lazy(() => import('../modals/CustomStrategyModal.tsx'));
const TextExportModal = React.lazy(() => import('../modals/TextExportModal.tsx'));
const MermaidModal = React.lazy(() => import('../modals/MermaidModal.tsx'));
const MoveMessagesModal = React.lazy(() => import('../modals/MoveMessagesModal.tsx'));
const PromptButtonManagerModal = React.lazy(() => import('../modals/PromptButtonManagerModal.tsx'));
const ArchiverModal = React.lazy(() => import('../modals/ArchiverModal.tsx')); 
const StoryManagerModal = React.lazy(() => import('../modals/StoryManagerModal.tsx')); // ADDED

const ModalLoadingFallback = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/10 backdrop-blur-[1px] pointer-events-none">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
);

interface ModalManagerProps {
  onScrollToMessage: (messageId: string) => void;
}

const ModalManager: React.FC<ModalManagerProps> = memo(({ onScrollToMessage }) => {
  const { t } = useTranslation();
  
  // Use specialized stores
  const settingsUI = useSettingsUI();
  const editorUI = useEditorUI();
  const confirmationUI = useConfirmationUI();

  const { deleteApiKey } = useApiKeyStore();
  const { deleteMessageAndSubsequent, resetAudioCache } = useInteractionStore();
  const { deleteChat, deleteMultipleChats } = useChatListStore();
  const { deletePromptButton } = usePromptButtonStore();
  const { currentChatSession } = useActiveChatStore();
  const { showToast } = useToastStore();
  const { setGithubRepo } = useGithubStore();
  const { isSelectionModeActive } = useSelectionStore();
  const { selectedChatIds } = useHistorySelectionStore();
  const { deleteChapter } = useArchiverStore();

  const handleConfirmDeletion = useCallback(() => {
    if (confirmationUI.deleteTarget) {
      if (confirmationUI.deleteTarget.messageId === 'api-key') {
        deleteApiKey(confirmationUI.deleteTarget.sessionId);
        showToast("API Key deleted.", "success");
      } else {
        deleteMessageAndSubsequent(confirmationUI.deleteTarget.messageId);
      }
    }
    confirmationUI.cancelDeleteConfirmation();
  }, [confirmationUI.deleteTarget, deleteApiKey, deleteMessageAndSubsequent, showToast, confirmationUI.cancelDeleteConfirmation]);

  const handleConfirmChatDeletion = useCallback(() => {
    if (confirmationUI.deleteChatTarget) {
      deleteChat(confirmationUI.deleteChatTarget.sessionId);
    }
    confirmationUI.cancelDeleteChatConfirmation();
  }, [confirmationUI.deleteChatTarget, deleteChat, confirmationUI.cancelDeleteChatConfirmation]);

  const handleConfirmHistoryDeletion = useCallback(() => {
    if (selectedChatIds.length > 0) {
      deleteMultipleChats(selectedChatIds);
    }
    confirmationUI.cancelDeleteHistoryConfirmation();
  }, [selectedChatIds, deleteMultipleChats, confirmationUI.cancelDeleteHistoryConfirmation]);

  const handleConfirmPromptButtonDeletion = useCallback(() => {
    if (confirmationUI.deletePromptButtonTarget) {
        deletePromptButton(confirmationUI.deletePromptButtonTarget);
    }
    confirmationUI.cancelDeletePromptButtonConfirmation();
  }, [confirmationUI.deletePromptButtonTarget, deletePromptButton, confirmationUI.cancelDeletePromptButtonConfirmation]);

  const handleConfirmChapterDeletion = useCallback(() => {
    if (confirmationUI.deleteChapterIndex !== null) {
        deleteChapter(confirmationUI.deleteChapterIndex);
    }
    confirmationUI.cancelDeleteChapterConfirmation();
  }, [confirmationUI.deleteChapterIndex, deleteChapter, confirmationUI.cancelDeleteChapterConfirmation]);

  const handleGoToAttachmentInChat = useCallback((messageId: string) => {
    settingsUI.closeChatAttachmentsModal();
    onScrollToMessage(messageId);
  }, [settingsUI.closeChatAttachmentsModal, onScrollToMessage]);

  const handleJumpToMessageFromMemory = useCallback((messageId: string) => {
    settingsUI.closeActiveMemoryModal();
    onScrollToMessage(messageId);
  }, [settingsUI.closeActiveMemoryModal, onScrollToMessage]);

  return (
    <Suspense fallback={<ModalLoadingFallback />}>
        {settingsUI.isSettingsPanelOpen && <SettingsPanel />}
        {settingsUI.isApiKeyModalOpen && <ApiKeyModal isOpen={settingsUI.isApiKeyModalOpen} onClose={settingsUI.closeApiKeyModal} />}
        {settingsUI.isGitHubImportModalOpen && (
            <GitHubImportModal
                isOpen={settingsUI.isGitHubImportModalOpen}
                onClose={settingsUI.closeGitHubImportModal}
                onImport={setGithubRepo}
            />
        )}
        {settingsUI.isExportConfigModalOpen && <ExportConfigurationModal />}
        {settingsUI.isTtsSettingsModalOpen && <TtsSettingsModal />}
        {editorUI.isEditPanelOpen && <EditMessagePanel />}
        {settingsUI.isCharacterManagementModalOpen && <CharacterManagementModal />}
        {settingsUI.isContextualInfoModalOpen && <CharacterContextualInfoModal />}
        {settingsUI.isDebugTerminalOpen && <DebugTerminalPanel />}
        {isSelectionModeActive && <MultiSelectActionBar />}
        {settingsUI.isChatAttachmentsModalOpen && (
            <ChatAttachmentsModal
                isOpen={settingsUI.isChatAttachmentsModalOpen}
                attachments={settingsUI.attachmentsForModal}
                chatTitle={currentChatSession?.title || "Current Chat"}
                onClose={settingsUI.closeChatAttachmentsModal}
                onGoToMessage={handleGoToAttachmentInChat}
                autoHighlightRefresh={settingsUI.autoHighlightRefresh}
            />
        )}

        {editorUI.isFilenameInputModalOpen && editorUI.filenameInputModalProps && (
            <FilenameInputModal
            isOpen={editorUI.isFilenameInputModalOpen}
            title={editorUI.filenameInputModalProps.title}
            defaultFilename={editorUI.filenameInputModalProps.defaultFilename}
            promptMessage={editorUI.filenameInputModalProps.promptMessage}
            onSubmit={editorUI.submitFilenameInputModal}
            onClose={editorUI.closeFilenameInputModal}
            />
        )}

        {editorUI.isInjectedMessageEditModalOpen && <InjectedMessageEditModal />}
        {editorUI.isMermaidModalOpen && <MermaidModal />}
        {settingsUI.isMemorySourceModalOpen && <MemorySourceSelectionModal />} 
        {settingsUI.isCustomStrategyModalOpen && <CustomStrategyModal />}
        {settingsUI.isReasoningSetupModalOpen && <ReasoningSetupModal />}
        {settingsUI.isShadowSetupModalOpen && <ShadowSetupModal />}
        {settingsUI.isActiveMemoryModalOpen && <ActiveMemoryModal onJumpToMessage={handleJumpToMessageFromMemory} />}
        {settingsUI.isStrategySetupModalOpen && <StrategySetupModal />}
        {settingsUI.isTelegramImportModalOpen && <TelegramImportModal />}
        {settingsUI.isTextExportModalOpen && <TextExportModal />}
        {settingsUI.isMoveMessagesModalOpen && <MoveMessagesModal />}
        {settingsUI.isPromptButtonManagerOpen && <PromptButtonManagerModal />}
        {settingsUI.isArchiverModalOpen && <ArchiverModal />}
        {settingsUI.isStoryManagerModalOpen && <StoryManagerModal />}

        {/* Confirmation Modals placed last to ensure they stack on top */}
        {confirmationUI.isDeleteConfirmationOpen && (
            <ConfirmationModal
                isOpen={confirmationUI.isDeleteConfirmationOpen}
                title={t.confirmDeletion}
                message={confirmationUI.deleteTarget?.messageId === 'api-key' ? t.confirmApiKeyDeletionMsg : <>{t.confirmMsgDeletionMsg} <strong className="text-red-400">{t.subsequentMessages}</strong>? <br/>{t.cannotUndo}</>}
                confirmText={t.yesDelete} cancelText={t.noCancel}
                onConfirm={handleConfirmDeletion}
                onCancel={confirmationUI.cancelDeleteConfirmation}
                isDestructive={true}
            />
        )}
        
        {confirmationUI.isDeleteChatConfirmationOpen && (
            <ConfirmationModal
                isOpen={confirmationUI.isDeleteChatConfirmationOpen}
                title={t.confirmChatDeletion}
                message={confirmationUI.deleteChatTarget ? `${t.confirmChatDeletionMsg} "${confirmationUI.deleteChatTarget.sessionTitle}"? ${t.cannotUndo}` : ''}
                confirmText={t.yesDelete}
                cancelText={t.noCancel}
                onConfirm={handleConfirmChatDeletion}
                onCancel={confirmationUI.cancelDeleteChatConfirmation}
                isDestructive={true}
            />
        )}

        {confirmationUI.isResetAudioConfirmationOpen && (
            <ConfirmationModal
                isOpen={confirmationUI.isResetAudioConfirmationOpen}
                title={t.confirmAudioReset}
                message={t.confirmAudioResetMsg}
                confirmText={t.yesResetAudio} cancelText={t.noCancel}
                onConfirm={() => { 
                if(confirmationUI.resetAudioTarget) {
                    resetAudioCache(confirmationUI.resetAudioTarget.messageId);
                }
                confirmationUI.cancelResetAudioCacheConfirmation(); 
                }} 
                onCancel={confirmationUI.cancelResetAudioCacheConfirmation}
                isDestructive={true}
            />
        )}

        {confirmationUI.isDeleteHistoryConfirmationOpen && (
            <ConfirmationModal
                isOpen={confirmationUI.isDeleteHistoryConfirmationOpen}
                title={t.confirmHistoryDeletion}
                message={`${t.confirmHistoryDeletionMsg} (${confirmationUI.deleteHistoryCount} chats)`}
                confirmText={t.yesDelete}
                cancelText={t.noCancel}
                onConfirm={handleConfirmHistoryDeletion}
                onCancel={confirmationUI.cancelDeleteHistoryConfirmation}
                isDestructive={true}
            />
        )}

        {confirmationUI.isDeletePromptButtonConfirmationOpen && (
            <ConfirmationModal
                isOpen={confirmationUI.isDeletePromptButtonConfirmationOpen}
                title="Delete Quick Action"
                message="Are you sure you want to delete this button?"
                confirmText={t.delete}
                cancelText={t.cancel}
                onConfirm={handleConfirmPromptButtonDeletion}
                onCancel={confirmationUI.cancelDeletePromptButtonConfirmation}
                isDestructive={true}
            />
        )}

        {confirmationUI.isDeleteChapterConfirmationOpen && (
            <ConfirmationModal
                isOpen={confirmationUI.isDeleteChapterConfirmationOpen}
                title="Delete Chapter"
                message="Are you sure you want to delete this chapter? This cannot be undone."
                confirmText={t.delete}
                cancelText={t.cancel}
                onConfirm={handleConfirmChapterDeletion}
                onCancel={confirmationUI.cancelDeleteChapterConfirmation}
                isDestructive={true}
            />
        )}
    </Suspense>
  );
});

export default ModalManager;
