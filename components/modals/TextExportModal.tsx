import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';
import { useChatListStore } from '../../store/useChatListStore.ts';
import { useExportStore } from '../../store/useExportStore.ts';
import { CloseIcon, CheckIcon, DocumentIcon, UsersIcon } from '../common/Icons.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';
import BaseModal from '../common/BaseModal.tsx';

const TextExportModal: React.FC = memo(() => {
  const { isTextExportModalOpen, closeTextExportModal } = useSettingsUI();
  const { chatHistory } = useChatListStore();
  const { handleBatchExportChatsToTxt } = useExportStore();
  const { t } = useTranslation();

  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [areButtonsDisabled, setAreButtonsDisabled] = useState(true);

  useEffect(() => {
    if (isTextExportModalOpen) {
      setAreButtonsDisabled(true);
      const timerId = setTimeout(() => {
        setAreButtonsDisabled(false);
      }, 500);

      setSelectedChatIds([]);
      setSearchTerm('');
      return () => clearTimeout(timerId);
    }
  }, [isTextExportModalOpen]);

  const filteredSessions = useMemo(() => {
    if (!searchTerm.trim()) return chatHistory;
    return chatHistory.filter(session =>
      session.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [chatHistory, searchTerm]);

  const handleChatSelectionChange = useCallback((chatId: string) => {
    setSelectedChatIds(prev =>
      prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
    );
  }, []);

  const handleSelectAllChats = useCallback(() => {
    setSelectedChatIds(filteredSessions.map(s => s.id));
  }, [filteredSessions]);

  const handleDeselectAllChats = useCallback(() => {
    setSelectedChatIds([]);
  }, []);

  const handleExport = useCallback(() => {
    if (selectedChatIds.length === 0) return;
    handleBatchExportChatsToTxt(selectedChatIds);
    closeTextExportModal();
  }, [selectedChatIds, handleBatchExportChatsToTxt, closeTextExportModal]);

  const footerButtons = (
    <>
        <button
            onClick={closeTextExportModal}
            disabled={areButtonsDisabled}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 rounded-md transition-shadow hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)] disabled:opacity-60"
        >
            {t.cancel}
        </button>
        <button
            onClick={handleExport}
            disabled={areButtonsDisabled || selectedChatIds.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--aurora-accent-primary)] rounded-md transition-shadow hover:shadow-[0_0_12px_2px_rgba(90,98,245,0.6)] disabled:opacity-60 flex items-center"
        >
            <CheckIcon className="w-4 h-4 mr-1.5" />
            {t.export} ({selectedChatIds.length})
        </button>
    </>
  );

  return (
    <BaseModal
        isOpen={isTextExportModalOpen}
        onClose={closeTextExportModal}
        title={
            <div className="flex items-center">
                <DocumentIcon className="w-5 h-5 mr-3 text-amber-400" />
                {t.exportTxtBatch}
            </div>
        }
        footer={footerButtons}
        maxWidth="sm:max-w-lg"
    >
        <div className="space-y-4">
            <p className="text-sm text-gray-400">
                {t.exportTxtBatchDesc}
            </p>

            {/* Chat Selection Card - Amber */}
            <div className="relative p-4 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-500/5 to-transparent">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                        {t.selectChatsToExport}
                    </h4>
                    <div className="space-x-2">
                        <button onClick={handleSelectAllChats} className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-1 rounded hover:bg-amber-500/20 disabled:opacity-50" disabled={filteredSessions.length === 0}>{t.selectAll}</button>
                        <button onClick={handleDeselectAllChats} className="text-[10px] bg-white/5 text-gray-400 px-2 py-1 rounded hover:bg-white/10 disabled:opacity-50" disabled={selectedChatIds.length === 0}>{t.deselectAll}</button>
                    </div>
                </div>
                
                {chatHistory.length > 0 ? (
                <>
                    <input
                    type="text"
                    placeholder="Search chats..."
                    className="w-full p-2 aurora-input mb-2 text-sm border-amber-500/30 focus:border-amber-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="max-h-64 overflow-y-auto border border-[var(--aurora-border)] rounded-md p-1 space-y-1 bg-black/20 custom-scrollbar">
                    {filteredSessions.map(session => (
                        <div key={session.id} className={`flex items-center p-1.5 rounded-md cursor-pointer transition-colors ${selectedChatIds.includes(session.id) ? 'bg-amber-500/10' : 'hover:bg-white/5'}`} onClick={() => handleChatSelectionChange(session.id)}>
                        <input
                            type="checkbox"
                            checked={selectedChatIds.includes(session.id)}
                            readOnly
                            className="h-4 w-4 text-amber-500 bg-black/30 border-white/20 rounded focus:ring-amber-500 focus:ring-offset-black"
                        />
                        <label className="ltr:ml-2 rtl:mr-2 text-sm text-gray-300 truncate cursor-pointer flex items-center flex-grow">
                            {session.isCharacterModeActive && <UsersIcon className="w-3.5 h-3.5 ltr:mr-1.5 rtl:ml-1.5 text-purple-400 flex-shrink-0"/>}
                            {session.title}
                        </label>
                        </div>
                    ))}
                    {filteredSessions.length === 0 && <p className="text-sm text-gray-500 italic text-center py-2">No chats match.</p>}
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-right">{selectedChatIds.length} of {filteredSessions.length} chat(s) selected.</p>
                </>
                ) : (
                <p className="text-sm text-gray-500 italic">{t.noChats}</p>
                )}
            </div>
        </div>
    </BaseModal>
  );
});

export default TextExportModal;