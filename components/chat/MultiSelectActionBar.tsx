
import React, { memo, useCallback } from 'react';
import { useSelectionStore } from '../../store/useSelectionStore.ts';
import { useAudioStore } from '../../store/useAudioStore.ts';
import { useGlobalUiStore } from '../../store/useGlobalUiStore.ts';
import { TrashIcon, AudioResetIcon, XCircleIcon, ArrowDownTrayIcon, PdfIcon, ArrowRightStartOnRectangleIcon } from '../common/Icons.tsx';
import { useInteractionStore } from '../../store/useInteractionStore.ts';
import { useMessageStore } from '../../store/useMessageStore.ts';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';

const MultiSelectActionBar: React.FC = memo(() => {
  const { visibleMessages } = useMessageStore();
  const { deleteMultipleMessages, handleExportBatchPdf } = useInteractionStore();
  const { handleResetAudioCacheForMultipleMessages, handleBatchDownloadAudios } = useAudioStore();
  const { isSidebarOpen } = useGlobalUiStore();
  const { selectedMessageIds, clearSelection, toggleSelectionMode, selectAllVisible } = useSelectionStore();
  const { openMoveMessagesModal } = useSettingsUI();
  const { t } = useTranslation();

  const selectedCount = selectedMessageIds.length;
  const visibleMessageIds = visibleMessages.map(m => m.id);

  const handleDelete = useCallback(() => {
    if (selectedCount === 0) return;
    deleteMultipleMessages(selectedMessageIds);
  }, [selectedCount, deleteMultipleMessages, selectedMessageIds]);

  const handleResetAudio = useCallback(() => {
    if (selectedCount === 0) return;
    handleResetAudioCacheForMultipleMessages(selectedMessageIds);
  }, [selectedCount, handleResetAudioCacheForMultipleMessages, selectedMessageIds]);
  
  const handleDownload = useCallback(() => {
    if (selectedCount === 0) return;
    handleBatchDownloadAudios();
  }, [selectedCount, handleBatchDownloadAudios]);

  const handleExportPdf = useCallback(() => {
    if (selectedCount === 0) return;
    handleExportBatchPdf(selectedMessageIds);
  }, [selectedCount, handleExportBatchPdf, selectedMessageIds]);

  const handleMove = useCallback(() => {
    if (selectedCount === 0) return;
    openMoveMessagesModal();
  }, [selectedCount, openMoveMessagesModal]);

  const handleSelectAll = useCallback(() => {
    selectAllVisible(visibleMessageIds);
  }, [selectAllVisible, visibleMessageIds]);

  const handleDone = useCallback(() => {
    toggleSelectionMode();
  }, [toggleSelectionMode]);

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-sm border-t border-gray-700 p-2 sm:p-3 z-30 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:left-72' : ''}`}>
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
                <span className="text-sm font-medium text-gray-300 w-24 text-center">{selectedCount} {t.selected}</span>
                <div className="space-x-2">
                    <button onClick={handleSelectAll} className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50" disabled={visibleMessageIds.length === 0}>{t.selectAllVisible}</button>
                    <button onClick={clearSelection} className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50" disabled={selectedCount === 0}>{t.deselectAll}</button>
                </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
                <button onClick={handleMove} disabled={selectedCount === 0} className="flex items-center px-2 py-1.5 sm:px-3 text-xs font-medium text-blue-200 bg-blue-600/30 rounded-md hover:bg-blue-600/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Copy to Chat">
                    <ArrowRightStartOnRectangleIcon className="w-4 h-4 mr-1 sm:mr-1.5" />
                    <span className="hidden sm:inline">Copy To</span>
                </button>
                <button onClick={handleExportPdf} disabled={selectedCount === 0} className="flex items-center px-2 py-1.5 sm:px-3 text-xs font-medium text-gray-200 bg-white/10 rounded-md hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title={t.exportToPdf}>
                    <PdfIcon className="w-4 h-4 mr-1 sm:mr-1.5 text-red-500" />
                    <span className="hidden sm:inline">PDF</span>
                </button>
                <button onClick={handleDownload} disabled={selectedCount === 0} className="flex items-center px-2 py-1.5 sm:px-3 text-xs font-medium text-blue-300 bg-blue-600 bg-opacity-20 rounded-md hover:bg-opacity-40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title={t.downloadAudios}>
                    <ArrowDownTrayIcon className="w-4 h-4 mr-1 sm:mr-1.5" />
                    <span className="hidden sm:inline">{t.downloadAudios}</span>
                </button>
                <button onClick={handleResetAudio} disabled={selectedCount === 0} className="flex items-center px-2 py-1.5 sm:px-3 text-xs font-medium text-yellow-300 bg-yellow-600 bg-opacity-20 rounded-md hover:bg-opacity-40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title={t.resetAudio}>
                    <AudioResetIcon className="w-4 h-4 mr-1 sm:mr-1.5" />
                    <span className="hidden sm:inline">{t.resetAudio}</span>
                </button>
                <button onClick={handleDelete} disabled={selectedCount === 0} className="flex items-center px-2 py-1.5 sm:px-3 text-xs font-medium text-red-300 bg-red-600 bg-opacity-20 rounded-md hover:bg-opacity-40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title={t.delete}>
                    <TrashIcon className="w-4 h-4 mr-1 sm:mr-1.5" />
                    <span className="hidden sm:inline">{t.delete}</span>
                </button>
                 <button onClick={handleDone} className="flex items-center px-2 py-1.5 sm:px-3 text-xs font-medium text-gray-200 bg-gray-600 rounded-md hover:bg-gray-500 transition-colors" title={t.done}>
                    <XCircleIcon className="w-4 h-4 mr-1 sm:mr-1.5" /> {t.done}
                </button>
            </div>
        </div>
    </div>
  );
});

export default MultiSelectActionBar;
