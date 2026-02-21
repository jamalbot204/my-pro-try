import React, { useRef, useEffect, memo, useCallback } from 'react';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';
import { useConfirmationUI } from '../../store/ui/useConfirmationUI.ts';
import { useGlobalUiStore } from '../../store/useGlobalUiStore.ts';
import { useChatListStore } from '../../store/useChatListStore.ts';
import { useChatTitleStore } from '../../store/useChatTitleStore.ts';
import { useActiveChatStore } from '../../store/useActiveChatStore.ts';
import { useCharacterStore } from '../../store/useCharacterStore.ts';
import { useDataStore } from '../../store/useDataStore.ts';
import { useImportStore } from '../../store/useImportStore.ts';
import { APP_TITLE, APP_VERSION } from '../../constants.ts';
import { PlusIcon, TrashIcon, CogIcon, ExportIcon, ImportIcon, UsersIcon, IconDirectionLtr, IconDirectionRtl, PencilIcon, CheckIcon, XCircleIcon, DocumentDuplicateIcon, SunIcon, MoonIcon, LanguageIcon, ClipboardDocumentCheckIcon, SparklesIcon, ArrowPathIcon, TelegramIcon, DocumentIcon } from '../common/Icons.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { useHistorySelectionStore } from '../../store/useHistorySelectionStore.ts';

const Sidebar: React.FC = memo(() => {
  const { editingTitleInfo, startEditingTitle, setEditingTitleValue, cancelEditingTitle, saveChatTitle } = useChatTitleStore();
  const { currentChatId, currentChatSession, selectChat } = useActiveChatStore();
  const { chatHistory, createNewChat, deleteChat, duplicateChat } = useChatListStore();
  const { handleEmbedSelectedChats, handleResetEmbedFlags } = useDataStore();
  const { handleImportAll } = useImportStore();
  
  const { openSettingsPanel, openExportConfigurationModal, openTelegramImportModal, openTextExportModal } = useSettingsUI();
  const { requestDeleteChatConfirmation, requestDeleteHistoryConfirmation } = useConfirmationUI();
  
  const { layoutDirection, toggleLayoutDirection, theme, toggleTheme, toggleLanguage, isSidebarOpen } = useGlobalUiStore();
  const { toggleCharacterMode } = useCharacterStore();
  const { isHistorySelectionModeActive, toggleHistorySelectionMode, selectedChatIds, toggleChatSelection, selectAllChats, deselectAllChats } = useHistorySelectionStore();
  const { t } = useTranslation();
  
  const editInputRef = useRef<HTMLInputElement>(null);

  const showAdvancedDataTools = currentChatSession?.settings.showAdvancedDataTools ?? false;

  useEffect(() => {
    if (editingTitleInfo.id && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTitleInfo.id]);
  
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) saveChatTitle();
    else if (e.key === 'Escape') cancelEditingTitle();
  }, [saveChatTitle, cancelEditingTitle]);

  const handleSelectAll = useCallback(() => {
    selectAllChats(chatHistory.map(s => s.id));
  }, [chatHistory, selectAllChats]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedChatIds.length > 0) {
      requestDeleteHistoryConfirmation(selectedChatIds.length);
    }
  }, [selectedChatIds, requestDeleteHistoryConfirmation]);

  const handleEmbedSelected = useCallback(() => {
    if (selectedChatIds.length > 0) {
      handleEmbedSelectedChats(selectedChatIds);
    }
  }, [selectedChatIds, handleEmbedSelectedChats]);

  const handleResetEmbedsSelected = useCallback(() => {
    if (selectedChatIds.length > 0) {
        handleResetEmbedFlags(selectedChatIds);
    }
  }, [selectedChatIds, handleResetEmbedFlags]);

  return (
    <div className={`w-72 aurora-panel h-full flex flex-col border-r border-[var(--aurora-border)] gpu-accelerated`}>
      <div className="p-4 flex-shrink-0 z-10">
        <div className="p-3 rounded-xl bg-black/20 border border-[var(--aurora-border)] backdrop-blur-sm flex justify-between items-center shadow-sm">
            <h1 className="text-lg font-bold text-[var(--aurora-text-primary)] flex items-baseline tracking-tight">
            {APP_TITLE}
            <span className="text-[10px] font-normal text-cyan-300 ml-1.5 bg-cyan-500/10 px-1.5 py-0.5 rounded-full border border-cyan-500/20 shadow-[0_0_8px_rgba(6,182,212,0.15)]">v{APP_VERSION}</span>
            </h1>
            <div className="flex items-center space-x-1">
            <button
                onClick={toggleTheme}
                title={t.switchTheme}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-all hover:bg-white/10"
            >
                {theme === 'dark' ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
            </button>
            <button
                onClick={toggleLanguage}
                title={t.switchLanguage}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-all hover:bg-white/10"
            >
                <LanguageIcon className="w-4 h-4" />
            </button>
            <button
                onClick={toggleLayoutDirection}
                title={t.switchLayout}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-all hover:bg-white/10"
            >
                {layoutDirection === 'rtl' ? <IconDirectionLtr className="w-4 h-4" /> : <IconDirectionRtl className="w-4 h-4" />}
            </button>
            </div>
        </div>
      </div>

      <div className="px-4 space-y-3 flex-shrink-0">
        {isHistorySelectionModeActive ? (
           <div className="grid grid-cols-2 gap-2">
              <button onClick={handleSelectAll} className="flex items-center justify-center px-3 py-2 text-xs font-medium text-[var(--aurora-text-secondary)] bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-all">{t.selectAll}</button>
              <button onClick={deselectAllChats} className="flex items-center justify-center px-3 py-2 text-xs font-medium text-[var(--aurora-text-secondary)] bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-all">{t.deselectAll}</button>
              <button onClick={handleDeleteSelected} disabled={selectedChatIds.length === 0} className="col-span-2 flex items-center justify-center px-3 py-2 text-xs font-medium text-white bg-red-600/80 rounded-lg shadow-lg shadow-red-900/20 hover:bg-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none">{t.deleteSelected} ({selectedChatIds.length})</button>
              
              <div className="col-span-2 flex gap-2">
                  <button onClick={handleEmbedSelected} disabled={selectedChatIds.length === 0} className="flex-grow flex items-center justify-center px-3 py-2 text-xs font-medium text-white bg-purple-600/80 rounded-lg shadow-lg shadow-purple-900/20 hover:bg-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"><SparklesIcon className="w-3.5 h-3.5 ltr:mr-1.5 rtl:ml-1.5" />{t.embedSelected}</button>
                  <button onClick={handleResetEmbedsSelected} disabled={selectedChatIds.length === 0} title={t.resetEmbeddings} className="p-2 text-white bg-amber-600/80 rounded-lg shadow-lg hover:bg-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"><ArrowPathIcon className="w-4 h-4" /></button>
              </div>

              <button onClick={toggleHistorySelectionMode} className="col-span-2 flex items-center justify-center px-3 py-2 text-xs font-medium text-[var(--aurora-text-secondary)] bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-all">{t.cancelSelection}</button>
           </div>
        ) : (
          <>
            <div className="flex space-x-2">
                <button
                onClick={createNewChat}
                className="flex-1 flex items-center justify-center px-4 py-2.5 text-sm font-bold text-white bg-[var(--aurora-accent-primary)] rounded-lg shadow-lg shadow-blue-900/30 hover:shadow-blue-600/40 hover:scale-[1.02] active:scale-95 transition-all duration-200"
                >
                <PlusIcon className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" /> 
                {t.newChat}
                </button>
                <button
                    onClick={toggleCharacterMode}
                    disabled={!currentChatId}
                    title={currentChatSession?.isCharacterModeActive ? "Disable Character Mode" : "Enable Character Mode"}
                    className={`p-2.5 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none border
                                ${currentChatSession?.isCharacterModeActive 
                                    ? 'bg-fuchsia-600 text-white border-fuchsia-500 shadow-lg shadow-fuchsia-900/30 hover:bg-fuchsia-500' 
                                    : 'bg-white/5 text-[var(--aurora-text-secondary)] border-white/5 hover:bg-white/10 hover:border-white/10'}
                                ${!currentChatId ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <UsersIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={openExportConfigurationModal} title={t.export} className="flex items-center justify-center px-3 py-2 text-xs font-medium text-[var(--aurora-text-secondary)] bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-all"><ExportIcon className="w-3.5 h-3.5 mr-1.5 ltr:mr-1.5 rtl:ml-1.5 rtl:mr-0" />{t.export}</button>
                <button onClick={handleImportAll} title={t.import} className="flex items-center justify-center px-3 py-2 text-xs font-medium text-[var(--aurora-text-secondary)] bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-all"><ImportIcon className="w-3.5 h-3.5 mr-1.5 ltr:mr-1.5 rtl:ml-1.5 rtl:mr-0" />{t.import}</button>
                {showAdvancedDataTools && (
                    <>
                        <button onClick={openTextExportModal} title={t.exportTxtBatch} className="col-span-2 flex items-center justify-center px-3 py-2 text-xs font-medium text-amber-300 bg-amber-500/10 rounded-lg border border-amber-500/20 hover:bg-amber-500/20 transition-all"><DocumentIcon className="w-3.5 h-3.5 mr-1.5 ltr:mr-1.5 rtl:ml-1.5 rtl:mr-0" /> {t.exportTxtBatch}</button>
                        <button onClick={openTelegramImportModal} title="Telegram Import" className="col-span-2 flex items-center justify-center px-3 py-2 text-xs font-medium text-blue-300 bg-blue-500/10 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-all"><TelegramIcon className="w-3.5 h-3.5 ltr:mr-1.5 rtl:ml-1.5" /> Telegram Import</button>
                    </>
                )}
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 custom-scrollbar">
        <div className="flex items-center justify-between mb-2 mt-2">
            <h2 className="text-[10px] font-bold text-[var(--aurora-text-secondary)] uppercase tracking-widest opacity-70 pl-1">{t.history}</h2>
            <button 
                onClick={toggleHistorySelectionMode}
                className={`p-1 rounded-md transition-colors ${isHistorySelectionModeActive ? 'text-[var(--aurora-accent-primary)] bg-blue-500/10' : 'text-gray-500 hover:text-[var(--aurora-text-primary)] hover:bg-white/5'}`}
                title={t.select}
            >
                <ClipboardDocumentCheckIcon className="w-3.5 h-3.5" />
            </button>
        </div>
        
        {chatHistory.length === 0 && (
          <p className="text-sm text-gray-500 italic text-center py-4">{t.noChats}</p>
        )}
        
        {chatHistory.map(session => {
            const isActive = currentChatId === session.id;
            const isEditing = editingTitleInfo.id === session.id;
            const isCharMode = session.isCharacterModeActive;
            const isSelected = selectedChatIds.includes(session.id);

            let borderClass = 'border-transparent';
            let bgClass = 'hover:bg-white/5 hover:border-white/5';
            let textClass = 'text-[var(--aurora-text-secondary)]';
            
            if (isActive) {
                if (isCharMode) {
                    borderClass = 'border-l-fuchsia-500';
                    bgClass = 'bg-gradient-to-r from-fuchsia-500/10 to-transparent shadow-[0_4px_20px_-5px_rgba(192,38,211,0.3)]';
                    textClass = 'text-fuchsia-100';
                } else {
                    borderClass = 'border-l-[var(--aurora-accent-primary)]';
                    bgClass = 'bg-gradient-to-r from-[var(--aurora-accent-primary)]/10 to-transparent shadow-[0_4px_20px_-5px_rgba(59,130,246,0.3)]';
                    textClass = 'text-[var(--aurora-text-primary)]';
                }
            } else if (isSelected) {
                bgClass = 'bg-blue-500/20';
                borderClass = 'border-l-blue-500/50';
            }

            return (
            <div
                key={session.id}
                onClick={() => {
                    if (isEditing) return;
                    selectChat(session.id);
                }}
                className={`relative flex items-center justify-between p-3 mb-2 rounded-r-xl rounded-l-sm border-l-4 group transition-all duration-300 ease-out cursor-pointer ${borderClass} ${bgClass}`}
            >
                <div className="flex items-center overflow-hidden flex-grow">
                    {isHistorySelectionModeActive && (
                        <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleChatSelection(session.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mr-3 rtl:ml-3 h-4 w-4 text-blue-600 bg-black/30 border-white/20 rounded focus:ring-blue-500 focus:ring-offset-black cursor-pointer flex-shrink-0"
                        />
                    )}
                    {isCharMode && <UsersIcon className={`w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0 flex-shrink-0 ${isActive ? 'text-fuchsia-400' : 'text-fuchsia-600'}`}/>}
                    {isEditing ? (
                        <input
                            ref={editInputRef}
                            type="text"
                            value={editingTitleInfo.value}
                            onChange={(e) => setEditingTitleValue(e.target.value)}
                            onKeyDown={handleInputKeyDown}
                            onBlur={() => setTimeout(cancelEditingTitle, 100)}
                            className="text-sm bg-black/50 text-[var(--aurora-text-primary)] rounded-md px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-[var(--aurora-accent-primary)] border border-white/10"
                            aria-label="Edit chat title"
                        />
                    ) : (
                        <span className={`truncate text-sm font-medium ${textClass}`} title={session.title}>{session.title}</span>
                    )}
                </div>
                {!isHistorySelectionModeActive && (
                    <div className="flex items-center space-x-1 ml-2 rtl:mr-2 rtl:ml-0 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {isEditing ? (
                        <>
                        <button onClick={(e) => { e.stopPropagation(); saveChatTitle(); }} className="p-1.5 text-green-400 hover:bg-green-500/20 rounded-md transition-colors" title={t.save}><CheckIcon className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); cancelEditingTitle(); }} className="p-1.5 text-gray-400 hover:bg-white/10 rounded-md transition-colors" title={t.cancel}><XCircleIcon className="w-3.5 h-3.5" /></button>
                        </>
                    ) : (
                        <>
                        <button onClick={(e) => { e.stopPropagation(); startEditingTitle(session.id, session.title); }} className="p-1.5 text-gray-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-md transition-colors" title={t.edit}><PencilIcon className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); duplicateChat(session.id); }} className="p-1.5 text-gray-400 hover:text-green-300 hover:bg-green-500/10 rounded-md transition-colors" title="Duplicate"><DocumentDuplicateIcon className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); requestDeleteChatConfirmation({ sessionId: session.id, sessionTitle: session.title }); }} className="p-1.5 text-gray-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors" title={t.delete}><TrashIcon className="w-3.5 h-3.5" /></button>
                        </>
                    )}
                    </div>
                )}
            </div>
            );
        })}
      </div>

      <div className="p-4 pt-2 border-t border-[var(--aurora-border)]">
        <button
          onClick={openSettingsPanel}
          className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-[var(--aurora-text-secondary)] bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 hover:border-white/10 hover:text-white transition-all shadow-sm"
        >
          <CogIcon className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
          {t.settings}
        </button>
      </div>
    </div>
  );
});

export default Sidebar;