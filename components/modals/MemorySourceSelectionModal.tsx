import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts'; 
import { useChatListStore } from '../../store/useChatListStore.ts';
import { useActiveChatStore } from '../../store/useActiveChatStore.ts';
import { useDataStore } from '../../store/useDataStore.ts';
import { CloseIcon, CheckIcon, ClipboardDocumentListIcon, UsersIcon, CogIcon, InfoIcon, FlowRightIcon, UserIcon } from '../common/Icons.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { MEMORY_STRATEGIES } from '../../constants.ts';

const MemorySourceSelectionModal: React.FC = memo(() => {
  const { isMemorySourceModalOpen, closeMemorySourceModal, openCustomStrategyModal } = useSettingsUI(); 
  const { chatHistory } = useChatListStore();
  const { currentChatSession, updateCurrentChatSession } = useActiveChatStore();
  const { updateSettings, customMemoryStrategies, updateChatPartnerRole } = useDataStore();
  const { t } = useTranslation();

  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [areButtonsDisabled, setAreButtonsDisabled] = useState(true);
  
  // Advanced Settings State
  const [maxResults, setMaxResults] = useState<number>(15);
  const [minRelevance, setMinRelevance] = useState<number>(0.35);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('companion');
  const [showAdvancedHelp, setShowAdvancedHelp] = useState<string | null>(null);

  // Local state for partner roles to avoid excessive re-renders/DB writes on typing
  const [partnerRoles, setPartnerRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isMemorySourceModalOpen && currentChatSession) {
        setAreButtonsDisabled(true);
        const timerId = setTimeout(() => {
            setAreButtonsDisabled(false);
        }, 500);

        const currentSettings = currentChatSession.settings;
        if (currentSettings.memorySourceChatIds === undefined) {
            setSelectedChatIds(chatHistory.map(chat => chat.id));
        } else {
            setSelectedChatIds(currentSettings.memorySourceChatIds);
        }
        
        setMaxResults(currentSettings.memoryMaxResults ?? 15);
        setMinRelevance(currentSettings.memoryMinRelevance ?? 0.35);
        setSelectedStrategy(currentSettings.memoryQueryStrategy || 'companion');

        // Initialize local role state
        const roleMap: Record<string, string> = {};
        chatHistory.forEach(c => {
            roleMap[c.id] = c.partnerRole || '';
        });
        setPartnerRoles(roleMap);

        setSearchTerm('');
        setShowAdvancedHelp(null);
        return () => clearTimeout(timerId);
    }
  }, [isMemorySourceModalOpen, currentChatSession, chatHistory]);

  const filteredChats = useMemo(() => {
    if (!searchTerm.trim()) return chatHistory;
    return chatHistory.filter(chat => 
        chat.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [chatHistory, searchTerm]);

  const handleToggleChat = useCallback((chatId: string) => {
    setSelectedChatIds(prev => 
        prev.includes(chatId) 
            ? prev.filter(id => id !== chatId) 
            : [...prev, chatId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    const visibleIds = filteredChats.map(c => c.id);
    setSelectedChatIds(prev => {
        const newSet = new Set([...prev, ...visibleIds]);
        return Array.from(newSet);
    });
  }, [filteredChats]);

  const handleDeselectAll = useCallback(() => {
    const visibleIds = new Set(filteredChats.map(c => c.id));
    setSelectedChatIds(prev => prev.filter(id => !visibleIds.has(id)));
  }, [filteredChats]);

  const handleSave = useCallback(async () => {
    if (!currentChatSession) return;

    const newSettings = {
        ...currentChatSession.settings,
        memorySourceChatIds: selectedChatIds,
        memoryMaxResults: maxResults,
        memoryMinRelevance: minRelevance,
        memoryQueryStrategy: selectedStrategy
    };

    await updateCurrentChatSession(s => s ? ({ ...s, settings: newSettings }) : null);
    
    await updateSettings(currentChatSession.id, newSettings);

    closeMemorySourceModal();
  }, [currentChatSession, selectedChatIds, maxResults, minRelevance, selectedStrategy, updateCurrentChatSession, updateSettings, closeMemorySourceModal]);

  const toggleHelp = (key: string) => {
      setShowAdvancedHelp(prev => prev === key ? null : key);
  };

  const handleMaxResultsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value);
      if (!isNaN(val) && val > 0) {
          setMaxResults(val);
      }
  }, []);

  const handleStrategyChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (val === '__create_new__') {
          openCustomStrategyModal();
          // Keep the current selection until a new one is created and selected later
      } else {
          setSelectedStrategy(val);
      }
  }, [openCustomStrategyModal]);

  const handleRoleChange = useCallback((chatId: string, newValue: string) => {
      setPartnerRoles(prev => ({ ...prev, [chatId]: newValue }));
  }, []);

  const handleRoleBlur = useCallback((chatId: string, newValue: string) => {
      // Find original role to check if changed
      const original = chatHistory.find(c => c.id === chatId)?.partnerRole || '';
      if (newValue.trim() !== original) {
          updateChatPartnerRole(chatId, newValue.trim());
      }
  }, [chatHistory, updateChatPartnerRole]);

  if (!isMemorySourceModalOpen) return null;

  const currentDesc = MEMORY_STRATEGIES[selectedStrategy]?.description || customMemoryStrategies.find(s => s.id === selectedStrategy)?.description;

  return (
    <div 
        className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="memory-source-modal-title"
        onClick={closeMemorySourceModal}
    >
      <div 
        className="aurora-panel p-6 rounded-lg shadow-2xl w-full sm:max-w-xl max-h-[90vh] flex flex-col text-gray-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 id="memory-source-modal-title" className="text-xl font-semibold text-gray-100 flex items-center">
            <ClipboardDocumentListIcon className="w-5 h-5 mr-3 text-purple-400" />
            {t.memoryScopeTitle}
          </h2>
          <button
            onClick={closeMemorySourceModal}
            disabled={areButtonsDisabled}
            className="text-gray-400 p-1 rounded-full transition-shadow hover:text-gray-100 hover:shadow-[0_0_10px_1px_rgba(255,255,255,0.2)] disabled:opacity-60"
            aria-label={t.close}
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-4">
            {t.memoryScopeDesc}
        </p>

        {/* Search & Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-3 flex-shrink-0">
            <input 
                type="text" 
                placeholder="Search chats..." 
                className="flex-grow p-2 aurora-input text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex gap-2">
                <button 
                    onClick={handleSelectAll}
                    className="px-3 py-2 text-xs font-medium text-blue-400 bg-blue-500/10 rounded hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                    disabled={areButtonsDisabled}
                >
                    {t.selectAll}
                </button>
                <button 
                    onClick={handleDeselectAll}
                    className="px-3 py-2 text-xs font-medium text-gray-400 bg-white/5 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
                    disabled={areButtonsDisabled}
                >
                    {t.deselectAll}
                </button>
            </div>
        </div>

        {/* Chat List */}
        <div className="flex-grow min-h-0 overflow-y-auto border border-[var(--aurora-border)] rounded-md bg-black/20 p-1 custom-scrollbar mb-4">
            {filteredChats.length === 0 ? (
                <p className="text-center text-gray-500 py-8 italic">{t.noChatsFound}</p>
            ) : (
                <div className="space-y-1">
                    {filteredChats.map(chat => {
                        const isSelected = selectedChatIds.includes(chat.id);
                        const isCurrent = currentChatSession?.id === chat.id;
                        return (
                            <div 
                                key={chat.id} 
                                className={`flex items-center p-2 rounded transition-colors group ${isSelected ? 'bg-purple-900/20 hover:bg-purple-900/30' : 'hover:bg-white/5'}`}
                            >
                                <div className="flex items-center flex-grow min-w-0 cursor-pointer" onClick={() => !areButtonsDisabled && handleToggleChat(chat.id)}>
                                    <div className={`w-5 h-5 flex items-center justify-center border rounded mr-3 flex-shrink-0 transition-colors ${isSelected ? 'bg-purple-600 border-purple-500' : 'border-gray-600 bg-transparent'}`}>
                                        {isSelected && <CheckIcon className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center">
                                            <p className={`text-sm truncate font-medium ${isSelected ? 'text-purple-200' : 'text-gray-300'}`}>
                                                {chat.title}
                                            </p>
                                            {chat.isCharacterModeActive && <UsersIcon className="w-3.5 h-3.5 ml-2 text-purple-400 flex-shrink-0" />}
                                            {isCurrent && <span className="ml-2 text-[10px] bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30 uppercase tracking-wider font-bold">{t.current}</span>}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">
                                            {new Date(chat.lastUpdatedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Partner Role Input - Only visible if selected */}
                                {isSelected && (
                                    <div className="flex items-center ml-2 flex-shrink-0 bg-black/40 rounded p-1 border border-purple-500/30">
                                        <UserIcon className="w-3 h-3 text-purple-400 mr-1.5" />
                                        <input
                                            type="text"
                                            value={partnerRoles[chat.id] || ''}
                                            onChange={(e) => handleRoleChange(chat.id, e.target.value)}
                                            onBlur={(e) => handleRoleBlur(chat.id, e.target.value)}
                                            placeholder="Role (e.g. Boss)"
                                            className="w-24 bg-transparent text-xs text-purple-200 placeholder-purple-500/50 focus:outline-none"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* Strategy Selection (Steerable RAG) */}
        <div className="pt-4 border-t border-[var(--aurora-border)] flex-shrink-0 mb-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
                <FlowRightIcon className="w-4 h-4 mr-2 text-gray-400" />
                {t.memoryStrategy}
            </h3>
            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                <select
                    value={selectedStrategy}
                    onChange={handleStrategyChange}
                    className="w-full p-2.5 aurora-select text-sm border-purple-500/30 focus:border-purple-500 rounded-md mb-2"
                >
                    <optgroup label="Built-in Strategies">
                        {Object.entries(MEMORY_STRATEGIES).map(([key, strategy]) => (
                            <option key={key} value={key}>{strategy.label}</option>
                        ))}
                    </optgroup>
                    
                    {customMemoryStrategies.length > 0 && (
                        <optgroup label="Custom Strategies">
                            {customMemoryStrategies.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                        </optgroup>
                    )}

                    <option value="__create_new__" className="font-bold text-green-400">+ Create Custom...</option>
                </select>
                <p className="text-xs text-purple-300 italic">
                    {currentDesc}
                </p>
            </div>
        </div>

        {/* Advanced Settings Section */}
        <div className="pt-2 border-t border-[var(--aurora-border)] flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
                <CogIcon className="w-4 h-4 mr-2 text-gray-400" />
                {t.advancedSearchSettings}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Result Count Input */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-medium text-gray-400 flex items-center">
                            {t.maxResults}
                            <button onClick={() => toggleHelp('count')} className="ml-1 text-gray-500 hover:text-gray-300 focus:outline-none">
                                <InfoIcon className="w-3.5 h-3.5" />
                            </button>
                        </label>
                    </div>
                    {showAdvancedHelp === 'count' && <p className="text-[10px] text-gray-500 mb-2 bg-black/20 p-1.5 rounded">{t.maxResultsDesc}</p>}
                    <input 
                        type="number" 
                        min="1" 
                        step="1"
                        value={maxResults}
                        onChange={handleMaxResultsChange}
                        className="w-full p-2 aurora-input text-sm"
                        placeholder="e.g., 50"
                    />
                </div>

                {/* Relevance Threshold Slider */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-medium text-gray-400 flex items-center">
                            {t.minRelevance}
                            <button onClick={() => toggleHelp('relevance')} className="ml-1 text-gray-500 hover:text-gray-300 focus:outline-none">
                                <InfoIcon className="w-3.5 h-3.5" />
                            </button>
                        </label>
                        <span className="text-xs font-bold text-purple-300">{minRelevance.toFixed(2)}</span>
                    </div>
                    {showAdvancedHelp === 'relevance' && <p className="text-[10px] text-gray-500 mb-2 bg-black/20 p-1.5 rounded">{t.minRelevanceDesc}</p>}
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05"
                        value={minRelevance}
                        onChange={(e) => setMinRelevance(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                </div>
            </div>
        </div>

        <div className="mt-6 flex justify-between items-center flex-shrink-0">
            <span className="text-xs text-gray-400">
                {selectedChatIds.length} {t.chatsSelected}
            </span>
            <div className="flex gap-3">
                <button 
                    onClick={closeMemorySourceModal}
                    disabled={areButtonsDisabled}
                    className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 rounded-md transition-shadow hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)] disabled:opacity-60"
                >
                    {t.cancel}
                </button>
                <button 
                    onClick={handleSave}
                    disabled={areButtonsDisabled}
                    className="px-4 py-2 text-sm font-medium text-white bg-[var(--aurora-accent-primary)] rounded-md transition-shadow hover:shadow-[0_0_12px_2px_rgba(90,98,245,0.6)] disabled:opacity-60"
                >
                    {t.save}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
});

export default MemorySourceSelectionModal;