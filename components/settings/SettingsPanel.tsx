
import React, { useState, useEffect, memo, useCallback } from 'react';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';
import { GeminiSettings, SafetySetting, TTSSettings } from '../../types.ts';
import { DEFAULT_SETTINGS, DEFAULT_MODEL_ID, MODELS_SUPPORTING_THINKING_BUDGET_UI, MODELS_SUPPORTING_THINKING_LEVEL_UI, THINKING_BUDGET_MAX_FLASH } from '../../constants.ts';
import { CloseIcon, CogIcon, LinkIcon, CalculatorIcon, CheckIcon, ArrowPathIcon } from '../common/Icons.tsx';
import SafetySettingsModal from '../modals/SafetySettingsModal.tsx';
import InstructionEditModal from '../modals/InstructionEditModal.tsx';
import TtsSettingsModal from '../modals/TtsSettingsModal.tsx';
import * as dbService from '../../services/dbService.ts';
import { METADATA_KEYS } from '../../services/dbService.ts';
import { useToastStore } from '../../store/useToastStore.ts';
import { useActiveChatStore } from '../../store/useActiveChatStore.ts';
import { useGithubStore } from '../../store/useGithubStore.ts';
import { useInteractionStore } from '../../store/useInteractionStore.ts';
import { useDataStore } from '../../store/useDataStore.ts';
import { useExportStore } from '../../store/useExportStore.ts';
import { useSettingsPersistence } from '../../hooks/useSettingsPersistence.ts';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { useShallow } from 'zustand/react/shallow';

// New Modular Components (Siblings)
import SettingsGeneral from './SettingsGeneral.tsx';
import SettingsToolsContext from './SettingsToolsContext.tsx';
import SettingsAdvanced from './SettingsAdvanced.tsx';

type SettingsTab = 'general' | 'tools' | 'advanced';

const SettingsPanel: React.FC = memo(() => {
    // Optimized Selector: Only fetch what is needed for the panel logic.
    // Crucially, we DO NOT select 'messages', so text generation won't re-render this panel.
    const sessionData = useActiveChatStore(useShallow(state => {
        const s = state.currentChatSession;
        return {
            id: s?.id,
            title: s?.title,
            settings: s?.settings,
            model: s?.model,
            isCharacterModeActive: s?.isCharacterModeActive,
            githubRepoContext: s?.githubRepoContext,
            aiCharacters: s?.aiCharacters,
            hasApiLogs: (s?.apiRequestLogs?.length ?? 0) > 0,
            apiLogsCount: s?.apiRequestLogs?.length ?? 0,
        };
    }));

    const { clearChatCache } = useInteractionStore();
    const { setGithubRepo } = useGithubStore();
    
    // Optimized UI Store Selectors
    const isSettingsPanelOpen = useSettingsUI(state => state.isSettingsPanelOpen);
    const closeSettingsPanel = useSettingsUI(state => state.closeSettingsPanel);
    const openApiKeyModal = useSettingsUI(state => state.openApiKeyModal);
    const openGitHubImportModal = useSettingsUI(state => state.openGitHubImportModal);
    const openChatAttachmentsModal = useSettingsUI(state => state.openChatAttachmentsModal);
    const openDebugTerminal = useSettingsUI(state => state.openDebugTerminal);
    const openExportConfigurationModal = useSettingsUI(state => state.openExportConfigurationModal);

    // Optimized Data Store Selectors: Select only functions to prevent re-render on data changes (like generation times)
    const cleanSystemReminders = useDataStore(state => state.cleanSystemReminders);
    const updateModel = useDataStore(state => state.updateModel);

    const { exportChatToTxt } = useExportStore(); 
    const showToast = useToastStore.getState().showToast;
    const { saveSessionSettings } = useSettingsPersistence();
    const { t } = useTranslation();

    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    
    // Initialize local state. 
    // Default to session data if available, otherwise global defaults.
    const [localSettings, setLocalSettings] = useState<GeminiSettings>(sessionData.settings || DEFAULT_SETTINGS);
    const [localModel, setLocalModel] = useState<string>(sessionData.model || DEFAULT_MODEL_ID);
    
    // Modals state
    const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
    const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);
    const [editingInstructionType, setEditingInstructionType] = useState<'systemInstruction' | 'userPersonaInstruction' | 'customReminderMessage' | null>(null);
    const [instructionModalContent, setInstructionModalContent] = useState('');
    
    // Local TTS Modal State (for Draft Mode)
    const [isLocalTtsModalOpen, setIsLocalTtsModalOpen] = useState(false);

    // Initialization Effect: Only runs ONCE when the component mounts (panel opens).
    // This prevents resetting the user's unsaved work if background sync happens.
    useEffect(() => {
        if (sessionData.settings && sessionData.model) {
            setLocalSettings(sessionData.settings);
            setLocalModel(sessionData.model);
        }
    }, []); 

    const handleOpenInstructionModal = useCallback((type: 'systemInstruction' | 'userPersonaInstruction' | 'customReminderMessage') => {
        setEditingInstructionType(type);
        setInstructionModalContent(localSettings[type] || '');
        setIsInstructionModalOpen(true);
    }, [localSettings]);

    const handleApplyInstructionChange = useCallback((newInstruction: string) => {
        if (editingInstructionType) {
            const newSettings = { ...localSettings, [editingInstructionType]: newInstruction };
            setLocalSettings(newSettings);
        }
        setIsInstructionModalOpen(false);
        setEditingInstructionType(null);
    }, [editingInstructionType, localSettings]);

    const handleOpenTtsModal = useCallback(() => {
        setIsLocalTtsModalOpen(true);
    }, []);

    const handleApplyTtsSettings = useCallback((newTtsSettings: TTSSettings) => {
        setLocalSettings(prev => ({ ...prev, ttsSettings: newTtsSettings }));
        setIsLocalTtsModalOpen(false);
    }, []);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (name === "model") {
            setLocalModel(value);
            
            // Logic for Thinking Budget support
            if (!MODELS_SUPPORTING_THINKING_BUDGET_UI.includes(value)) {
                setLocalSettings(prev => ({ ...prev, thinkingBudget: undefined }));
            } else {
                // If it supports Thinking Budget
                const isFlashOrLite = value.includes('flash') || value.includes('lite');
                
                // If user hasn't set one yet, default to DEFAULT (32768)
                // BUT if it's Flash/Lite, we must clamp it to 24576 if it's currently higher or undefined (assuming default is max)
                
                let nextBudget = localSettings.thinkingBudget;
                
                if (nextBudget === undefined) {
                    // If undefined, it uses global default (32768). 
                    // For Flash, we should explicitly set it to 24576 to respect the user's request for "Max by default"
                    if (isFlashOrLite) {
                        nextBudget = THINKING_BUDGET_MAX_FLASH;
                    } else {
                        nextBudget = DEFAULT_SETTINGS.thinkingBudget;
                    }
                } else if (isFlashOrLite && nextBudget > THINKING_BUDGET_MAX_FLASH) {
                    // Clamp existing high value down to Flash max
                    nextBudget = THINKING_BUDGET_MAX_FLASH;
                }

                setLocalSettings(prev => ({ ...prev, thinkingBudget: nextBudget }));
            }

            if (!MODELS_SUPPORTING_THINKING_LEVEL_UI.includes(value)) {
                 setLocalSettings(prev => ({ ...prev, thinkingLevel: undefined }));
            }
        } else if (type === 'checkbox') {
            const { checked } = (e.target as HTMLInputElement);
            setLocalSettings(prev => ({ ...prev, [name]: checked }));
        } else if (name === 'urlContext') {
            setLocalSettings(prev => ({ ...prev, urlContext: value.split('\n').map(url => url.trim()).filter(url => url) }));
        } else {
            setLocalSettings(prev => ({ ...prev, [name]: value }));
        }
    }, [localSettings.thinkingBudget]);

    const handleRangeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({ ...prev, [name]: parseFloat(value) }));
    }, []);

    const handleNumericInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let numValue: number | undefined = parseInt(value, 10);
        if (isNaN(numValue) || value === '') {
            numValue = undefined;
        }
        setLocalSettings(prev => ({ ...prev, [name]: numValue }));
    }, []);
    
    const handleThinkingBudgetChange = useCallback((newValue: number | undefined) => {
        setLocalSettings(prev => ({...prev, thinkingBudget: newValue}));
    }, []);
    
    const handleThinkingLevelChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
         const val = e.target.value;
         setLocalSettings(prev => ({...prev, thinkingLevel: val as 'low' | 'high'}));
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!sessionData.id) return;

        // Use Hook for settings part
        await saveSessionSettings(localSettings, "Settings Applied.");
        
        // Model is separate in DB/State, handle it here alongside
        if (sessionData.model !== localModel) {
             useActiveChatStore.getState().updateCurrentChatSession(s => s ? ({ ...s, model: localModel }) : null);
             await updateModel(sessionData.id, localModel);
        }
        
        // Check using non-shallow accessor to compare if really needed, or just compare to initial
        const currentSession = useActiveChatStore.getState().currentChatSession;
        if (currentSession && localSettings.systemReminderFrequency !== currentSession.settings.systemReminderFrequency) {
             await cleanSystemReminders(sessionData.id);
        }

        closeSettingsPanel();
    }, [sessionData.id, sessionData.model, localSettings, localModel, saveSessionSettings, updateModel, cleanSystemReminders, closeSettingsPanel]);
    
    const handleMakeDefaults = useCallback(async () => {
        await dbService.setAppMetadata(METADATA_KEYS.USER_DEFINED_GLOBAL_DEFAULTS, {
            model: localModel,
            settings: localSettings,
        });
        showToast("Global defaults saved.", "success");
    }, [localModel, localSettings, showToast]);

    const resetToDefaults = useCallback(() => {
        setLocalSettings(DEFAULT_SETTINGS);
        setLocalModel(DEFAULT_MODEL_ID);
    }, []);

    const handleApplySafetySettings = useCallback((newSafetySettings: SafetySetting[]) => {
        setLocalSettings(prev => ({ ...prev, safetySettings: newSafetySettings }));
        setIsSafetyModalOpen(false);
    }, []);

    const handleViewChatAttachments = useCallback(() => {
        // Need full session object for the attachment modal logic unfortunately, 
        // or we refactor that modal to take ID.
        // For now, fetching current session from store purely for this action is fine.
        const fullSession = useActiveChatStore.getState().currentChatSession;
        if (fullSession) {
            openChatAttachmentsModal(fullSession);
        } else {
            showToast("No active chat session.", "error");
        }
    }, [openChatAttachmentsModal, showToast]);

    const handleRemoveGithubRepo = useCallback(() => {
        setGithubRepo(null);
    }, [setGithubRepo]);

    const handleOpenDebugTerminal = useCallback(() => {
        openDebugTerminal();
        closeSettingsPanel();
    }, [openDebugTerminal, closeSettingsPanel]);

    if (!isSettingsPanelOpen || !sessionData.id) return null;

    let modalTitle = "";
    if (editingInstructionType === 'systemInstruction') modalTitle = "System Instruction (Persona)";
    else if (editingInstructionType === 'userPersonaInstruction') modalTitle = "User Persona Instruction";
    else if (editingInstructionType === 'customReminderMessage') modalTitle = t.editReminderMessage;

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-40 flex justify-center items-center p-4 backdrop-blur-md" onClick={closeSettingsPanel}>
                <div 
                    className="aurora-panel p-0 rounded-lg shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col text-gray-200 relative overflow-hidden" 
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-5 pb-0 flex justify-between items-center bg-[rgba(13,15,24,0.3)]">
                        <h2 className="text-xl font-semibold text-gray-100">{t.settings}</h2>
                        <button onClick={closeSettingsPanel} className="text-gray-400 p-1.5 rounded-full hover:bg-white/10 hover:text-white transition-colors" aria-label={t.close}>
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                    
                    {/* Tabs Navigation */}
                    <div className="flex border-b border-[var(--aurora-border)] px-5 bg-[rgba(13,15,24,0.3)]">
                        {[
                            { id: 'general', label: 'General', icon: CogIcon },
                            { id: 'tools', label: 'Tools & Context', icon: LinkIcon },
                            { id: 'advanced', label: 'Advanced', icon: CalculatorIcon }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                className={`flex-1 pb-3 text-sm font-medium border-b-2 flex items-center justify-center transition-colors duration-200 ${
                                    activeTab === tab.id 
                                    ? 'border-[var(--aurora-accent-primary)] text-[var(--aurora-accent-primary)]' 
                                    : 'border-transparent text-gray-400 hover:text-gray-200'
                                }`}
                                onClick={() => setActiveTab(tab.id as SettingsTab)}
                            >
                                <tab.icon className="w-4 h-4 mr-2" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-grow min-h-0 overflow-y-auto p-5 space-y-6 bg-transparent custom-scrollbar">
                        {activeTab === 'general' && (
                            <SettingsGeneral 
                                localModel={localModel}
                                localSettings={localSettings}
                                handleInputChange={handleInputChange}
                                onOpenApiKeyModal={openApiKeyModal}
                                onOpenInstructionModal={handleOpenInstructionModal}
                                onOpenTtsModal={handleOpenTtsModal} // Use local handler
                                onOpenSafetyModal={() => setIsSafetyModalOpen(true)}
                            />
                        )}

                        {activeTab === 'tools' && (
                            <SettingsToolsContext 
                                sessionId={sessionData.id}
                                githubRepoContext={sessionData.githubRepoContext}
                                localSettings={localSettings}
                                handleInputChange={handleInputChange}
                                handleNumericInputChange={handleNumericInputChange}
                                onOpenGitHubImport={openGitHubImportModal}
                                onRemoveGithubRepo={handleRemoveGithubRepo}
                                onViewAttachments={handleViewChatAttachments}
                                onOpenInstructionModal={handleOpenInstructionModal}
                            />
                        )}

                        {activeTab === 'advanced' && (
                            <SettingsAdvanced 
                                localSettings={localSettings}
                                localModel={localModel}
                                sessionId={sessionData.id}
                                isCharacterModeActive={!!sessionData.isCharacterModeActive}
                                hasApiLogs={sessionData.hasApiLogs}
                                apiLogsCount={sessionData.apiLogsCount}
                                handleRangeChange={handleRangeChange}
                                handleNumericInputChange={handleNumericInputChange}
                                handleInputChange={handleInputChange}
                                handleThinkingBudgetChange={handleThinkingBudgetChange}
                                handleThinkingLevelChange={handleThinkingLevelChange}
                                onOpenInstructionModal={handleOpenInstructionModal}
                                onOpenDebugTerminal={handleOpenDebugTerminal}
                                onCustomizeExport={openExportConfigurationModal}
                                onExportTxt={exportChatToTxt}
                                onClearCache={clearChatCache}
                            />
                        )}
                    </div>

                    {/* Fixed Footer */}
                    <div className="p-4 border-t border-[var(--aurora-border)] bg-[rgba(13,15,24,0.5)] flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
                        <div className="flex space-x-2">
                            <button onClick={resetToDefaults} className="px-3 py-2 text-xs font-medium text-gray-400 hover:text-white transition-colors flex items-center">
                                <ArrowPathIcon className="w-3.5 h-3.5 mr-1" />
                                {t.resetDefaults}
                            </button>
                            <button onClick={handleMakeDefaults} className="px-3 py-2 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors">
                                {t.makeGlobalDefaults}
                            </button>
                        </div>
                        <button onClick={handleSubmit} className="w-full sm:w-auto px-6 py-2 text-sm font-bold text-white bg-[var(--aurora-accent-primary)] rounded-md shadow-lg hover:shadow-[0_0_15px_rgba(90,98,245,0.5)] transition-all transform hover:scale-105 flex items-center justify-center">
                            <CheckIcon className="w-4 h-4 mr-2" />
                            {t.applySettings}
                        </button>
                    </div>
                </div>
            </div>

            {isSafetyModalOpen && localSettings.safetySettings && (
                <SafetySettingsModal 
                    isOpen={isSafetyModalOpen} 
                    currentSafetySettings={localSettings.safetySettings} 
                    onClose={() => setIsSafetyModalOpen(false)} 
                    onApply={handleApplySafetySettings} 
                />
            )}
            
            {/* Render TTS Modal in Controlled Mode */}
            {isLocalTtsModalOpen && (
                <TtsSettingsModal 
                    isOpen={isLocalTtsModalOpen}
                    initialSettings={localSettings.ttsSettings}
                    onApply={handleApplyTtsSettings}
                    onClose={() => setIsLocalTtsModalOpen(false)}
                />
            )}

            {isInstructionModalOpen && editingInstructionType && (
                <InstructionEditModal 
                    isOpen={isInstructionModalOpen} 
                    title={modalTitle} 
                    currentInstruction={instructionModalContent} 
                    onApply={handleApplyInstructionChange} 
                    onClose={() => { setIsInstructionModalOpen(false); setEditingInstructionType(null); }} 
                />
            )}
        </>
    );
});

export default SettingsPanel;
