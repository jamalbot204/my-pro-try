
import React, { memo, useCallback } from 'react';
import { CalculatorIcon, SparklesIcon, Bars3Icon, EyeIcon, ExportBoxIcon, ArrowPathIcon, BugAntIcon, BookOpenIcon, PdfIcon, PlayIcon, FlowRightIcon, DocumentIcon, TextAaIcon, StopCircleIcon, BrainIcon, WrenchScrewdriverIcon, KeyIcon, ArchiveBoxIcon } from '../common/Icons.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { GeminiSettings } from '../../types.ts';
import { DEFAULT_SETTINGS, DEFAULT_MODEL_ID, MODELS_SUPPORTING_THINKING_BUDGET_UI, MODELS_SUPPORTING_THINKING_LEVEL_UI, MODELS_SENDING_THINKING_CONFIG_API, THINKING_BUDGET_MAX_FLASH, THINKING_BUDGET_MAX, THINKING_BUDGET_MIN_PRO } from '../../constants.ts';
import ThinkingBudgetControl from '../common/ThinkingBudgetControl.tsx';
import SessionStats from './SessionStats.tsx'; 
import { useGlobalUiStore } from '../../store/useGlobalUiStore.ts';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';
import { useInteractionStore } from '../../store/useInteractionStore.ts';

interface SettingsAdvancedProps {
  localSettings: GeminiSettings;
  localModel: string;
  sessionId: string;
  isCharacterModeActive: boolean;
  hasApiLogs: boolean;
  apiLogsCount: number;
  handleRangeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleNumericInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleThinkingBudgetChange: (newValue: number | undefined) => void;
  handleThinkingLevelChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onOpenInstructionModal: (type: 'userPersonaInstruction') => void;
  onOpenDebugTerminal: () => void;
  onCustomizeExport: () => void;
  onExportTxt: () => void;
  onClearCache: () => void;
}

const SettingsAdvanced: React.FC<SettingsAdvancedProps> = memo(({
  localSettings,
  localModel,
  sessionId,
  isCharacterModeActive,
  hasApiLogs,
  apiLogsCount,
  handleRangeChange,
  handleNumericInputChange,
  handleInputChange,
  handleThinkingBudgetChange,
  handleThinkingLevelChange,
  onOpenInstructionModal,
  onOpenDebugTerminal,
  onCustomizeExport,
  onExportTxt,
  onClearCache
}) => {
  const { t } = useTranslation();
  const { chatFontSizeLevel, setChatFontSizeLevel } = useGlobalUiStore();
  const { openPromptButtonManager } = useSettingsUI();
  const { handleCompressChat } = useInteractionStore();
  
  const showThinkingBudgetControl = MODELS_SUPPORTING_THINKING_BUDGET_UI.includes(localModel);
  const thinkingBudgetActuallyUsedByApi = MODELS_SENDING_THINKING_CONFIG_API.includes(localModel);
  const showThinkingLevelControl = MODELS_SUPPORTING_THINKING_LEVEL_UI.includes(localModel);

  // --- Dynamic Thinking Budget Configuration ---
  const isFlashOrLite = localModel.includes('flash') || localModel.includes('lite');
  
  // PRO Configuration
  const proConfig = {
      min: THINKING_BUDGET_MIN_PRO, // 128
      max: THINKING_BUDGET_MAX,     // 32768
      presets: [
          { label: 'Dynamic', value: -1, icon: SparklesIcon, colorClass: 'bg-blue-600 text-white' }
      ]
  };

  // FLASH Configuration
  const flashConfig = {
      min: 1,
      max: THINKING_BUDGET_MAX_FLASH, // 24576
      presets: [
          { label: 'Dynamic', value: -1, icon: SparklesIcon, colorClass: 'bg-blue-600 text-white' },
          { label: 'Disabled', value: 0, icon: StopCircleIcon, colorClass: 'bg-red-600 text-white' }
      ]
  };

  const activeBudgetConfig = isFlashOrLite ? flashConfig : proConfig;
  // ----------------------------------------------

  const handleFontSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setChatFontSizeLevel(parseInt(e.target.value, 10));
  }, [setChatFontSizeLevel]);

  const handleSeedClear = useCallback(() => {
      handleNumericInputChange({ target: { name: 'seed', value: '' } } as any);
  }, [handleNumericInputChange]);

  return (
    <div className="space-y-6">
      
      <div className="relative p-4 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-teal-500 bg-gradient-to-r from-teal-500/5 to-transparent">
        <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wider mb-4 flex items-center">
          <CalculatorIcon className="w-4 h-4 mr-2" />
          Model Parameters
        </h3>
        
        <div className="space-y-4 pl-1">
          <div>
            <div className="flex justify-between mb-1">
              <label htmlFor="temperature" className="text-xs font-medium text-gray-300">{t.temperature}</label>
              <span className="text-xs text-teal-400 font-mono">{localSettings.temperature?.toFixed(2) ?? DEFAULT_SETTINGS.temperature?.toFixed(2)}</span>
            </div>
            <input
              type="range"
              id="temperature"
              name="temperature"
              min="0"
              max="2"
              step="0.01"
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
              value={localSettings.temperature ?? DEFAULT_SETTINGS.temperature}
              onChange={handleRangeChange}
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label htmlFor="topP" className="text-xs font-medium text-gray-300">{t.topP}</label>
              <span className="text-xs text-teal-400 font-mono">{localSettings.topP?.toFixed(2) ?? DEFAULT_SETTINGS.topP?.toFixed(2)}</span>
            </div>
            <input
              type="range"
              id="topP"
              name="topP"
              min="0"
              max="1"
              step="0.01"
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
              value={localSettings.topP ?? DEFAULT_SETTINGS.topP}
              onChange={handleRangeChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="topK" className="block text-xs font-medium text-gray-300 mb-1">{t.topK}</label>
              <input
                type="number"
                id="topK"
                name="topK"
                min="1"
                className="w-full p-2 aurora-input text-sm border-teal-500/30 focus:border-teal-500"
                placeholder={`${DEFAULT_SETTINGS.topK}`}
                value={localSettings.topK ?? ''}
                onChange={handleNumericInputChange}
              />
            </div>
            <div>
               <button
                type="button"
                onClick={() => onOpenInstructionModal('userPersonaInstruction')}
                className="w-full h-full flex flex-col items-center justify-center p-2 bg-teal-500/5 rounded border border-dashed border-teal-500/30 hover:border-teal-500/60 transition-colors"
               >
                 <span className="text-xs text-teal-200 font-medium">User Persona</span>
                 <span className="text-[10px] text-teal-400/60">Edit Instruction</span>
               </button>
            </div>
          </div>

          {/* Seed Input */}
          <div>
              <label htmlFor="seed" className="block text-xs font-medium text-gray-300 mb-1 flex items-center justify-between">
                  <span>{t.seed}</span>
                  <button onClick={handleSeedClear} className="text-[10px] text-teal-400 hover:text-white underline">{t.random}</button>
              </label>
              <div className="relative">
                  <input
                    type="number"
                    id="seed"
                    name="seed"
                    className="w-full p-2 aurora-input text-sm border-teal-500/30 focus:border-teal-500 font-mono"
                    placeholder="Random (Empty)"
                    value={localSettings.seed ?? ''}
                    onChange={handleNumericInputChange}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <KeyIcon className="h-4 w-4 text-teal-500/50" />
                  </div>
              </div>
          </div>
        </div>
      </div>

      {(showThinkingBudgetControl || showThinkingLevelControl) && (
        <div className="relative p-4 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-fuchsia-500 bg-gradient-to-r from-fuchsia-500/5 to-transparent">
          <h3 className="text-sm font-bold text-fuchsia-400 uppercase tracking-wider mb-4 flex items-center">
            <SparklesIcon className="w-4 h-4 mr-2" />
            Thinking Config
          </h3>
          
          <div className="space-y-4 pl-1">
            <div>
                <div className="flex items-center mb-1">
                <input
                    id="showThinkingProcess"
                    name="showThinkingProcess"
                    type="checkbox"
                    className="h-4 w-4 text-fuchsia-600 bg-black/30 border-white/20 rounded focus:ring-fuchsia-500 focus:ring-offset-black"
                    checked={localSettings.showThinkingProcess ?? false}
                    onChange={handleInputChange}
                />
                <label htmlFor="showThinkingProcess" className="ml-2 text-sm text-gray-200">
                    {t.showThinkingProcess}
                </label>
                </div>
            </div>

            {showThinkingBudgetControl && (
                <ThinkingBudgetControl
                    value={localSettings.thinkingBudget}
                    onChange={handleThinkingBudgetChange}
                    modelActuallyUsesApi={thinkingBudgetActuallyUsedByApi}
                    min={activeBudgetConfig.min}
                    max={activeBudgetConfig.max}
                    presets={activeBudgetConfig.presets}
                />
            )}

            {showThinkingLevelControl && (
                <div>
                <label htmlFor="thinkingLevel" className="block text-xs font-medium text-gray-300 mb-1">{t.thinkingLevel}</label>
                <select
                    id="thinkingLevel"
                    name="thinkingLevel"
                    className="w-full p-2 aurora-select text-sm border-fuchsia-500/30 focus:border-fuchsia-500"
                    value={localSettings.thinkingLevel || 'high'}
                    onChange={handleThinkingLevelChange}
                >
                    <option value="high">{t.thinkingLevelHigh}</option>
                    <option value="low">{t.thinkingLevelLow}</option>
                </select>
                </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Thought Parsing Card - Indigo/Blue-Grey */}
      <div className="relative p-4 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-indigo-400 bg-gradient-to-r from-indigo-500/5 to-transparent">
        <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-4 flex items-center">
          <BrainIcon className="w-4 h-4 mr-2" />
          Thought Parsing
        </h3>
        
        <div className="pl-1 space-y-4">
            <div className="flex items-center justify-between">
                <label htmlFor="enableCustomThoughtParsing" className="block text-sm font-medium text-gray-200 cursor-pointer">
                  Enhance Thought Parsing
                </label>
                <input
                  id="enableCustomThoughtParsing"
                  name="enableCustomThoughtParsing"
                  type="checkbox"
                  className="h-5 w-5 text-indigo-500 bg-black/30 border-white/20 rounded focus:ring-indigo-500 cursor-pointer"
                  checked={localSettings.enableCustomThoughtParsing ?? false}
                  onChange={handleInputChange}
                />
            </div>
            <p className="text-xs text-gray-400">
                Extracts thoughts hidden within custom XML tags (e.g., &lt;thought&gt;) and moves them to the thought block.
            </p>

            {(localSettings.enableCustomThoughtParsing ?? false) && (
                <div className="mt-2 animate-fade-in">
                    <label htmlFor="customThoughtTagName" className="block text-xs font-medium text-gray-300 mb-1">
                        Custom XML Tag Name
                    </label>
                    <div className="flex items-center">
                        <span className="text-gray-500 text-sm mr-1">&lt;</span>
                        <input
                            type="text"
                            id="customThoughtTagName"
                            name="customThoughtTagName"
                            className="flex-grow p-2 aurora-input text-sm border-indigo-500/30 focus:border-indigo-500 font-mono"
                            placeholder="thought"
                            value={localSettings.customThoughtTagName || ''}
                            onChange={handleInputChange}
                        />
                        <span className="text-gray-500 text-sm ml-1">&gt;</span>
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="relative p-4 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-rose-500 bg-gradient-to-r from-rose-500/5 to-transparent">
        <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider mb-4 flex items-center">
          <Bars3Icon className="w-4 h-4 mr-2" />
          Session Limits
        </h3>
        <div className="grid grid-cols-1 gap-4 pl-1">
            <div>
                <label htmlFor="contextWindowMessages" className="block text-xs font-medium text-gray-300 mb-1">{t.contextWindow}</label>
                <input
                type="number"
                id="contextWindowMessages"
                name="contextWindowMessages"
                min="0"
                className="w-full p-2 aurora-input text-sm border-rose-500/30 focus:border-rose-500"
                placeholder="All (0)"
                value={localSettings.contextWindowMessages ?? ''}
                onChange={handleNumericInputChange}
                />
            </div>
        </div>
      </div>

      <div className="relative p-4 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-sky-500 bg-gradient-to-r from-sky-500/5 to-transparent">
        <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider mb-4 flex items-center">
          <EyeIcon className="w-4 h-4 mr-2" />
          Interface & Dev
        </h3>
        
        <div className="space-y-4 pl-1">
            {/* Font Size Control */}
            <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="text-sm text-gray-300 flex items-center">
                        <TextAaIcon className="w-3.5 h-3.5 mr-2 text-sky-500" /> Interface Text Size
                    </label>
                    <span className="text-xs text-sky-400 font-mono">Level {chatFontSizeLevel}</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="4"
                    step="1"
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    value={chatFontSizeLevel}
                    onChange={handleFontSizeChange}
                />
                <div className="flex justify-between text-[10px] text-gray-500 mt-1 px-1">
                    <span>Small</span>
                    <span>Standard</span>
                    <span>Huge</span>
                </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-sky-500/20">
                <label htmlFor="showAutoSendControls" className="text-sm text-gray-300 flex items-center">
                    <PlayIcon className="w-3.5 h-3.5 mr-2 text-sky-500" /> {t.showAutoSend}
                </label>
                <input
                    id="showAutoSendControls"
                    name="showAutoSendControls"
                    type="checkbox"
                    className="h-4 w-4 text-sky-600 bg-black/30 border-white/20 rounded focus:ring-sky-500"
                    checked={localSettings.showAutoSendControls ?? false}
                    onChange={handleInputChange}
                />
            </div>
            
            {/* Prompt Buttons Bar Toggle */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <label htmlFor="showPromptButtonsBar" className="text-sm text-gray-300 flex items-center">
                        <WrenchScrewdriverIcon className="w-3.5 h-3.5 mr-2 text-sky-500" /> Quick Action Bar
                    </label>
                    <span className="text-[10px] text-gray-500 ml-5">Shows the macro buttons above chat input.</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={openPromptButtonManager}
                        className="text-[10px] bg-sky-500/10 text-sky-300 px-2 py-1 rounded border border-sky-500/20 hover:bg-sky-500/20"
                    >
                        Manage
                    </button>
                    <input
                        id="showPromptButtonsBar"
                        name="showPromptButtonsBar"
                        type="checkbox"
                        className="h-4 w-4 text-sky-600 bg-black/30 border-white/20 rounded focus:ring-sky-500"
                        checked={localSettings.showPromptButtonsBar ?? true}
                        onChange={handleInputChange}
                    />
                </div>
            </div>

            <div className="flex items-center justify-between">
                <label htmlFor="showReadModeButton" className="text-sm text-gray-300 flex items-center">
                    <BookOpenIcon className="w-3.5 h-3.5 mr-2 text-sky-500" /> {t.showReadMode}
                </label>
                <input
                    id="showReadModeButton"
                    name="showReadModeButton"
                    type="checkbox"
                    className="h-4 w-4 text-sky-600 bg-black/30 border-white/20 rounded focus:ring-sky-500"
                    checked={localSettings.showReadModeButton ?? false}
                    onChange={handleInputChange}
                />
            </div>
            <div className="flex items-center justify-between">
                <label htmlFor="showExportPdfButton" className="text-sm text-gray-300 flex items-center">
                    <PdfIcon className="w-3.5 h-3.5 mr-2 text-sky-500" /> {t.showExportPdf}
                </label>
                <input
                    id="showExportPdfButton"
                    name="showExportPdfButton"
                    type="checkbox"
                    className="h-4 w-4 text-sky-600 bg-black/30 border-white/20 rounded focus:ring-sky-500"
                    checked={localSettings.showExportPdfButton ?? false}
                    onChange={handleInputChange}
                />
            </div>
            <div className="flex items-center justify-between">
                <label htmlFor="showContinueFlowButton" className="text-sm text-gray-300 flex items-center">
                    <FlowRightIcon className="w-3.5 h-3.5 mr-2 text-sky-500" /> {t.showContinueFlow}
                </label>
                <input
                    id="showContinueFlowButton"
                    name="showContinueFlowButton"
                    type="checkbox"
                    className="h-4 w-4 text-sky-600 bg-black/30 border-white/20 rounded focus:ring-sky-500"
                    checked={localSettings.showContinueFlowButton ?? false}
                    onChange={handleInputChange}
                />
            </div>
            <div className="flex items-center justify-between">
                <label htmlFor="showAdvancedDataTools" className="text-sm text-gray-300 flex items-center">
                    <ExportBoxIcon className="w-3.5 h-3.5 mr-2 text-sky-500" /> {t.showAdvancedDataTools}
                </label>
                <input
                    id="showAdvancedDataTools"
                    name="showAdvancedDataTools"
                    type="checkbox"
                    className="h-4 w-4 text-sky-600 bg-black/30 border-white/20 rounded focus:ring-sky-500"
                    checked={localSettings.showAdvancedDataTools ?? false}
                    onChange={handleInputChange}
                />
            </div>
            {/* Interactive Choices Toggle */}
            <div className="flex items-center justify-between">
                <label htmlFor="enableInteractiveChoices" className="text-sm text-gray-300 flex items-center">
                    <DocumentIcon className="w-3.5 h-3.5 mr-2 text-sky-500" /> {t.enableInteractiveChoices}
                </label>
                <input
                    id="enableInteractiveChoices"
                    name="enableInteractiveChoices"
                    type="checkbox"
                    className="h-4 w-4 text-sky-600 bg-black/30 border-white/20 rounded focus:ring-sky-500"
                    checked={localSettings.enableInteractiveChoices ?? false}
                    onChange={handleInputChange}
                />
            </div>
            
            <div className="pt-2 mt-2 border-t border-[var(--aurora-border)]">
                <div className="flex items-center justify-between">
                    <label htmlFor="debugApiRequests" className="text-sm text-gray-300 flex items-center">
                        <BugAntIcon className="w-3.5 h-3.5 mr-2 text-orange-400" /> {t.enableApiLogger}
                    </label>
                    <input
                        id="debugApiRequests"
                        name="debugApiRequests"
                        type="checkbox"
                        className="h-4 w-4 text-orange-600 bg-black/30 border-white/20 rounded focus:ring-orange-500"
                        checked={localSettings.debugApiRequests ?? false}
                        onChange={handleInputChange}
                    />
                </div>
                {localSettings.debugApiRequests && (
                    <button
                        onClick={onOpenDebugTerminal}
                        className="mt-2 w-full text-xs text-orange-300 bg-orange-900/20 py-1.5 rounded hover:bg-orange-900/30 transition-colors"
                    >
                        {hasApiLogs ? t.viewApiLogs : t.viewApiLogsNone} ({apiLogsCount})
                    </button>
                )}
            </div>
            
            <div className="pt-2 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">{t.sessionStats}</p>
                <SessionStats />
            </div>
        </div>
      </div>

      <div className="relative p-4 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-500/5 to-transparent">
        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4 flex items-center">
          <ExportBoxIcon className="w-4 h-4 mr-2" />
          Data & Cache
        </h3>
        
        <div className="grid grid-cols-2 gap-2 mb-3 pl-1">
            <button
                onClick={onCustomizeExport}
                className="text-xs text-amber-300 flex items-center justify-center p-2 bg-amber-500/10 rounded-md hover:bg-amber-500/20 border border-amber-500/20"
            >
                {t.exportJson}
            </button>
            <button
                onClick={onExportTxt}
                className="text-xs text-amber-300 flex items-center justify-center p-2 bg-amber-500/10 rounded-md hover:bg-amber-500/20 border border-amber-500/20"
            >
                {t.exportTxt}
            </button>
        </div>

        <button
            onClick={handleCompressChat}
            className="w-full text-xs text-green-300 flex items-center justify-center p-2 bg-green-500/10 rounded-md hover:bg-green-500/20 transition-colors border border-green-500/20 mb-2"
        >
            <ArchiveBoxIcon className="w-3.5 h-3.5 mr-1.5" />
            {t.compressChat}
        </button>

        <button
            onClick={onClearCache}
            className="w-full text-xs text-red-300 flex items-center justify-center p-2 bg-red-500/10 rounded-md hover:bg-red-500/20 transition-colors border border-red-500/20"
        >
            <ArrowPathIcon className="w-3.5 h-3.5 mr-1.5" />
            {isCharacterModeActive ? t.clearAllCharCache : t.clearCache}
        </button>
      </div>

    </div>
  );
});

export default SettingsAdvanced;
