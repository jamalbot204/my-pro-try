
import React, { memo } from 'react';
import { MagnifyingGlassIcon, GitHubIcon, FolderOpenIcon, TrashIcon, PencilIcon, SparklesIcon, CogIcon, ArrowPathIcon, BrainIcon, WrenchScrewdriverIcon, ClockIcon, CheckIcon, StopCircleIcon, CloudArrowUpIcon, ServerIcon, XCircleIcon, ArchiveBoxIcon, PlusIcon } from '../common/Icons.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { ChatSession, GeminiSettings } from '../../types.ts';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';
import { useDataStore } from '../../store/useDataStore.ts';
import { usePythonStore } from '../../store/usePythonStore.ts';
import { useArchiverStore } from '../../store/useArchiverStore.ts'; // ADDED
import { MODEL_DEFINITIONS } from '../../constants.ts';

interface SettingsToolsContextProps {
  sessionId: string;
  githubRepoContext: ChatSession['githubRepoContext'];
  localSettings: GeminiSettings;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleNumericInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  onOpenGitHubImport: () => void;
  onRemoveGithubRepo: () => void;
  onViewAttachments: () => void;
  onOpenInstructionModal: (type: 'customReminderMessage') => void;
}

const SettingsToolsContext: React.FC<SettingsToolsContextProps> = memo(({
  sessionId,
  githubRepoContext,
  localSettings,
  handleInputChange,
  handleNumericInputChange,
  onOpenGitHubImport,
  onRemoveGithubRepo,
  onViewAttachments,
  onOpenInstructionModal
}) => {
  const { t } = useTranslation();
  const { openMemorySourceModal, openReasoningSetupModal, openShadowSetupModal, openArchiverModal } = useSettingsUI();
  const { cleanSystemReminders } = useDataStore();
  const { isEnabled, isLoaded, isLoading, enableAndLoad, toggleEnabled } = usePythonStore();
  const { generateIncrementalChapter, isProcessing } = useArchiverStore(); // ADDED

  const handleCleanContext = () => {
    if (sessionId) {
      cleanSystemReminders(sessionId);
    }
  };

  const handleManualArchiveTrigger = async () => {
      // Force archive with 0 threshold (immediate)
      await generateIncrementalChapter(true);
  };

  const pythonMode = localSettings.pythonExecutionMode || 'cloud';

  return (
    <div className="space-y-4">
      
      {/* Capabilities Card - Cyan */}
      <div className="relative p-4 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-cyan-500 bg-gradient-to-r from-cyan-500/5 to-transparent">
        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-4 flex items-center">
          <SparklesIcon className="w-4 h-4 mr-2" />
          Active Capabilities
        </h3>
        
        {/* Google Search */}
        <div className="flex items-center justify-between mb-4 pl-1">
          <div className="flex items-center">
            <MagnifyingGlassIcon className="w-5 h-5 mr-3 text-cyan-300" />
            <div>
              <label htmlFor="useGoogleSearch" className="block text-sm font-medium text-gray-200 cursor-pointer">
                {t.useGoogleSearch}
              </label>
              <p className="text-xs text-gray-400">{t.useGoogleSearchDesc}</p>
            </div>
          </div>
          <div className="flex items-center">
            <input
              id="useGoogleSearch"
              name="useGoogleSearch"
              type="checkbox"
              className="h-5 w-5 text-cyan-500 bg-black/30 border-white/20 rounded focus:ring-cyan-500 focus:ring-offset-black cursor-pointer"
              checked={localSettings.useGoogleSearch ?? false}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {/* Python Interpreter (Hybrid) */}
        <div className="flex flex-col pl-1 border-t border-cyan-500/20 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-cyan-900/30 flex items-center justify-center mr-3 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/30">
                Py
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-200">Python Interpreter</label>
                <p className="text-xs text-gray-400">Choose execution environment.</p>
                </div>
            </div>
            
            {/* Mode Switcher */}
            <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                <button
                    type="button"
                    onClick={() => handleInputChange({ target: { name: 'pythonExecutionMode', value: 'cloud' } } as any)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${pythonMode === 'cloud' ? 'bg-cyan-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                    <CloudArrowUpIcon className="w-3 h-3 inline mr-1" /> Cloud
                </button>
                <button
                    type="button"
                    onClick={() => handleInputChange({ target: { name: 'pythonExecutionMode', value: 'local' } } as any)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${pythonMode === 'local' ? 'bg-cyan-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                    <ServerIcon className="w-3 h-3 inline mr-1" /> Local
                </button>
                <button
                    type="button"
                    onClick={() => handleInputChange({ target: { name: 'pythonExecutionMode', value: 'disabled' } } as any)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${pythonMode === 'disabled' ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                    <StopCircleIcon className="w-3 h-3 inline mr-1" /> Off
                </button>
            </div>
          </div>

          {pythonMode === 'cloud' ? (
              <div className="ml-11 mb-2">
                  <p className="text-xs text-green-400 bg-green-900/20 p-2 rounded border border-green-500/20">
                      <CheckIcon className="w-3 h-3 inline mr-1" />
                      Uses Google's secure cloud environment. No download required. Fast & Reliable.
                  </p>
              </div>
          ) : pythonMode === 'local' ? (
              <div className="ml-11 mb-2 flex items-center justify-between">
                 <p className="text-xs text-gray-400 mr-2">Runs in-browser (Pyodide). Requires ~10MB download.</p>
                 <div className="flex items-center">
                    {isLoading ? (
                        <div className="px-3 py-1.5 text-xs font-bold text-cyan-300 bg-cyan-900/20 rounded border border-cyan-500/20 flex items-center">
                            <ArrowPathIcon className="w-3 h-3 mr-2 animate-spin" />
                            Loading...
                        </div>
                    ) : isLoaded ? (
                        <button 
                            onClick={toggleEnabled}
                            className={`flex items-center px-3 py-1.5 text-xs font-bold rounded border transition-all group ${
                                isEnabled 
                                ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30' 
                                : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30'
                            }`}
                            title={isEnabled ? "Click to Disable" : "Click to Reactivate (Ready)"}
                        >
                            {isEnabled ? (
                                <>
                                    <span className="group-hover:hidden flex items-center"><CheckIcon className="w-3.5 h-3.5 mr-1.5" /> Active</span>
                                    <span className="hidden group-hover:flex items-center"><XCircleIcon className="w-3.5 h-3.5 mr-1.5" /> Disable</span>
                                </>
                            ) : (
                                <>
                                    <StopCircleIcon className="w-3.5 h-3.5 mr-1.5" />
                                    Disabled
                                </>
                            )}
                        </button>
                    ) : isEnabled ? (
                        <button 
                            onClick={toggleEnabled}
                            className="flex items-center px-3 py-1.5 text-xs font-bold text-green-400 bg-green-900/20 border border-green-500/20 rounded hover:bg-red-900/20 hover:text-red-400 hover:border-red-500/20 transition-all group"
                            title="Click to Disable"
                        >
                            <span className="group-hover:hidden">Enabled (Lazy)</span>
                            <span className="hidden group-hover:inline">Disable</span>
                        </button>
                    ) : (
                        <button 
                            onClick={enableAndLoad}
                            className="flex items-center px-3 py-1.5 text-xs font-bold text-white bg-cyan-600/80 rounded hover:bg-cyan-500 disabled:opacity-50 transition-colors shadow-lg shadow-cyan-900/20"
                        >
                            Enable Local
                        </button>
                    )}
                 </div>
              </div>
          ) : (
              <div className="ml-11 mb-2">
                  <p className="text-xs text-gray-500 italic bg-white/5 p-2 rounded border border-white/5">
                      Python execution is disabled. The model will not be able to execute code.
                  </p>
              </div>
          )}
        </div>
        
        {/* Include History Checkbox */}
        {pythonMode !== 'disabled' && (
            <div className="ml-11 mt-[-4px] mb-4">
                <div className="flex items-center">
                    <input
                        id="includePythonHistory"
                        name="includePythonHistory"
                        type="checkbox"
                        className="h-3.5 w-3.5 text-cyan-500 bg-black/30 border-white/20 rounded focus:ring-cyan-500 focus:ring-offset-black cursor-pointer disabled:opacity-50"
                        checked={localSettings.includePythonHistory ?? false}
                        onChange={handleInputChange}
                        disabled={pythonMode === 'local' && !isEnabled} 
                    />
                    <label htmlFor="includePythonHistory" className={`ml-2 block text-xs font-medium cursor-pointer ${(pythonMode === 'cloud' || isEnabled) ? 'text-gray-300' : 'text-gray-600'}`}>
                        Include Execution History in Context
                    </label>
                </div>
                <p className={`text-[10px] ml-5 mt-0.5 ${(pythonMode === 'cloud' || isEnabled) ? 'text-gray-500' : 'text-gray-700'}`}>
                    Sends past code and results back to the model. Allows "memory" of variables.
                </p>
            </div>
        )}

        {/* Smart Time Bridge */}
        <div className="flex flex-col pl-1 border-t border-cyan-500/20 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ClockIcon className="w-5 h-5 mr-3 text-cyan-300" />
              <div>
                <label htmlFor="enableTimeBridge" className="block text-sm font-medium text-gray-200 cursor-pointer">
                  Smart Time Bridge
                </label>
                <p className="text-xs text-gray-400">Injects context updates after long pauses.</p>
              </div>
            </div>
            <input
              id="enableTimeBridge"
              name="enableTimeBridge"
              type="checkbox"
              className="h-5 w-5 text-cyan-500 bg-black/30 border-white/20 rounded focus:ring-cyan-500 focus:ring-offset-black cursor-pointer"
              checked={localSettings.enableTimeBridge ?? true}
              onChange={handleInputChange}
            />
          </div>
          
          {(localSettings.enableTimeBridge ?? true) && (
             <div className="ml-8 mt-2 animate-fade-in flex items-center gap-3">
                 <label htmlFor="timeBridgeThreshold" className="text-xs text-gray-400">Injection Threshold (Minutes):</label>
                 <input
                    type="number"
                    id="timeBridgeThreshold"
                    name="timeBridgeThreshold"
                    min="1"
                    max="1440"
                    className="w-16 p-1 text-xs bg-black/30 border border-cyan-500/30 rounded text-gray-200 focus:border-cyan-500 focus:outline-none text-center"
                    value={localSettings.timeBridgeThreshold ?? 15}
                    onChange={handleNumericInputChange}
                 />
             </div>
          )}
        </div>
      </div>

      {/* Memory & Reasoning Card - Indigo/Fuchsia */}
      <div className="relative p-4 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-indigo-500 bg-gradient-to-r from-indigo-500/5 to-transparent">
        <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4 flex items-center">
          <BrainIcon className="w-4 h-4 mr-2" />
          Advanced Logic
        </h3>
        
        {/* Force Tool Execution (ANY Mode) */}
        <div className="flex items-start justify-between pl-1 mb-4 border-b border-indigo-500/10 pb-4">
            <div className="flex-grow">
                <div className="flex items-center mb-1">
                    <input
                        id="forceToolAlways"
                        name="forceToolAlways"
                        type="checkbox"
                        className="h-4 w-4 text-rose-500 bg-black/30 border-white/20 rounded focus:ring-rose-500 focus:ring-offset-black cursor-pointer mt-0.5"
                        checked={localSettings.forceToolAlways ?? false}
                        onChange={handleInputChange}
                    />
                    <label htmlFor="forceToolAlways" className="ml-2 block text-sm text-rose-200 font-medium cursor-pointer">
                        Force Tool Execution (ANY Mode)
                    </label>
                </div>
                <p className="text-xs text-gray-400 ml-6">
                    Strictly forces the model to call a tool (like Memory Search) before generating any text response.
                </p>
            </div>
            <div className="flex-shrink-0 ml-2">
                <WrenchScrewdriverIcon className="w-4 h-4 text-rose-400 opacity-70" />
            </div>
        </div>

        {/* Reasoning Workflow */}
        <div className="flex items-start justify-between pl-1 mb-4 border-b border-indigo-500/10 pb-4">
          <div className="flex-grow">
            <div className="flex items-center mb-1">
              <input
                id="enableReasoningWorkflow"
                name="enableReasoningWorkflow"
                type="checkbox"
                className="h-4 w-4 text-fuchsia-500 bg-black/30 border-white/20 rounded focus:ring-fuchsia-500 focus:ring-offset-black cursor-pointer mt-0.5"
                checked={localSettings.enableReasoningWorkflow ?? false}
                onChange={handleInputChange}
              />
              <label htmlFor="enableReasoningWorkflow" className="ml-2 block text-sm text-fuchsia-200 font-medium cursor-pointer">
                Agentic Multi-Step Workflow
              </label>
            </div>
            <p className="text-xs text-gray-400 ml-6">
              Enable complex sequential reasoning steps before final answer.
            </p>
            {localSettings.enableReasoningWorkflow && (
              <>
                <p className="text-[10px] text-fuchsia-400 ml-6 mt-1">
                  Steps: {localSettings.reasoningSteps?.length || 0} configured
                </p>
                <div className="ml-6 mt-2">
                    <label htmlFor="agentModel" className="block text-xs font-medium text-gray-400 mb-1">Agent Model (Reasoning Engine)</label>
                    <select
                        id="agentModel"
                        name="agentModel"
                        className="w-full p-1.5 aurora-select text-xs border-fuchsia-500/30 focus:border-fuchsia-500"
                        value={localSettings.agentModel || ''}
                        onChange={handleInputChange}
                    >
                        <option value="">Use Chat Model (Default)</option>
                        {MODEL_DEFINITIONS.map(model => (
                            <option key={model.id} value={model.id}>{model.name}</option>
                        ))}
                    </select>
                </div>
                <div className="ml-6 mt-2">
                    <label htmlFor="contextUserName" className="block text-xs font-medium text-gray-400 mb-1">{t.contextUserName}</label>
                    <input
                        type="text"
                        id="contextUserName"
                        name="contextUserName"
                        value={localSettings.contextUserName || ''}
                        onChange={handleInputChange}
                        placeholder={t.contextUserNamePlaceholder}
                        className="w-full p-1.5 aurora-input text-xs border-fuchsia-500/30 focus:border-fuchsia-500"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">{t.contextUserNameDesc}</p>
                </div>
              </>
            )}
          </div>
          {localSettings.enableReasoningWorkflow && (
            <button
              onClick={openReasoningSetupModal}
              className="flex items-center px-2 py-1.5 text-xs font-medium text-fuchsia-300 bg-fuchsia-500/10 rounded-md hover:bg-fuchsia-500/20 transition-colors border border-fuchsia-500/20 ml-2 flex-shrink-0"
            >
              <CogIcon className="w-3 h-3 mr-1.5" />
              {t.customize}
            </button>
          )}
        </div>

        {/* Shadow Mode Feature */}
        <div className="flex items-start justify-between pl-1 mb-4 border-b border-indigo-500/10 pb-4">
          <div className="flex-grow">
            <div className="flex items-center mb-1">
              <input
                id="enableShadowMode"
                name="enableShadowMode"
                type="checkbox"
                className="h-4 w-4 text-emerald-500 bg-black/30 border-white/20 rounded focus:ring-emerald-500 focus:ring-offset-black cursor-pointer mt-0.5"
                checked={localSettings.enableShadowMode ?? false}
                onChange={handleInputChange}
              />
              <label htmlFor="enableShadowMode" className="ml-2 block text-sm text-emerald-200 font-medium cursor-pointer">
                Shadow Mode (Direct Generation)
              </label>
            </div>
            <p className="text-xs text-gray-400 ml-6">
              Bypasses standard generation. Directly generates response using a custom Persona and Task instruction based on history.
            </p>
          </div>
          {localSettings.enableShadowMode && (
            <button
                onClick={openShadowSetupModal}
                className="flex items-center px-2 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/10 rounded-md hover:bg-emerald-500/20 transition-colors border border-emerald-500/20 ml-2 flex-shrink-0"
            >
                <CogIcon className="w-3 h-3 mr-1.5" />
                {t.customize}
            </button>
          )}
        </div>

        {/* Long Term Memory */}
        <div className="flex items-start justify-between pl-1 mb-4 border-b border-indigo-500/10 pb-4">
          <div className="flex-grow">
            <div className="flex items-center mb-1">
              <input
                id="enableLongTermMemory"
                name="enableLongTermMemory"
                type="checkbox"
                className="h-4 w-4 text-indigo-500 bg-black/30 border-white/20 rounded focus:ring-indigo-500 focus:ring-offset-black cursor-pointer mt-0.5"
                checked={localSettings.enableLongTermMemory ?? false}
                onChange={handleInputChange}
              />
              <label htmlFor="enableLongTermMemory" className="ml-2 block text-sm text-gray-200 font-medium cursor-pointer">
                Agentic Memory (RAG)
              </label>
            </div>
            <p className="text-xs text-gray-400 ml-6">
              Allows Gemini to search past conversations for context.
            </p>
            {localSettings.enableLongTermMemory && (
              <p className="text-[10px] text-indigo-300 ml-6 mt-1">
                Scope: {localSettings.memorySourceChatIds ? `${localSettings.memorySourceChatIds.length} chats selected` : "All chats"}
              </p>
            )}
          </div>
          {localSettings.enableLongTermMemory && (
            <button
              onClick={openMemorySourceModal}
              className="flex items-center px-2 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 rounded-md hover:bg-indigo-500/20 transition-colors border border-indigo-500/20 ml-2 flex-shrink-0"
            >
              <CogIcon className="w-3 h-3 mr-1.5" />
              {t.customize}
            </button>
          )}
        </div>

        {/* Novel Archiver */}
        <div className="flex flex-col pl-1 mb-2">
          <div className="flex items-start justify-between">
            <div className="flex-grow">
                <div className="flex items-center mb-1">
                <div className="flex items-center justify-center w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 mr-2">
                    <ArchiveBoxIcon className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm text-indigo-200 font-medium">
                    Novel Archiver
                </span>
                </div>
                <p className="text-xs text-gray-400 ml-7">
                Convert chat history into a structured narrative with chapters and key quotes.
                </p>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={openArchiverModal}
                    className="flex items-center px-2 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 rounded-md hover:bg-indigo-500/20 transition-colors border border-indigo-500/20"
                >
                    <WrenchScrewdriverIcon className="w-3 h-3 mr-1.5" />
                    Launch
                </button>
            </div>
          </div>
          
          {/* Auto Archiving Checkbox */}
          <div className="ml-7 mt-2 flex items-center gap-2">
             <input
                id="autoArchivingEnabled"
                name="autoArchivingEnabled"
                type="checkbox"
                className="h-3.5 w-3.5 text-indigo-500 bg-black/30 border-white/20 rounded focus:ring-indigo-500 cursor-pointer"
                checked={localSettings.autoArchivingEnabled ?? false}
                onChange={handleInputChange}
             />
             <label htmlFor="autoArchivingEnabled" className="text-xs text-gray-300 cursor-pointer select-none">
                Auto-archive (Every 40 messages)
             </label>
             {(localSettings.autoArchivingEnabled ?? false) && (
                 <button 
                    onClick={handleManualArchiveTrigger}
                    disabled={isProcessing}
                    className="ml-auto text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors flex items-center"
                    title="Force create next chapter immediately"
                 >
                    {isProcessing ? <ArrowPathIcon className="w-3 h-3 animate-spin"/> : <PlusIcon className="w-3 h-3 mr-1"/>}
                    Add Chapter
                 </button>
             )}
          </div>
        </div>

      </div>

      {/* External Sources Card - Slate/Gray */}
      <div className="relative p-4 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-slate-500 bg-gradient-to-r from-slate-500/5 to-transparent">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
          <GitHubIcon className="w-4 h-4 mr-2" />
          External Sources
        </h3>

        {/* GitHub Repo */}
        <div className="mb-4 pl-1">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-200">{t.githubRepo}</label>
            {!githubRepoContext && (
              <button
                onClick={onOpenGitHubImport}
                className="text-xs text-slate-400 flex items-center hover:text-white bg-slate-700/30 px-2 py-1 rounded border border-slate-600"
              >
                <PencilIcon className="w-3 h-3 mr-1" /> {t.importRepo}
              </button>
            )}
          </div>
          {githubRepoContext ? (
            <div className="p-2 bg-black/20 rounded-md flex items-center justify-between border border-[var(--aurora-border)]">
              <p className="text-xs text-gray-300 truncate font-mono" title={githubRepoContext.url}>
                {githubRepoContext.url}
              </p>
              <button onClick={onRemoveGithubRepo} className="p-1 text-red-500 hover:text-red-400 ml-2" title="Remove">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-2 border border-dashed border-gray-600 rounded-md text-center">
              <p className="text-xs text-gray-500">{t.githubRepoHint}</p>
            </div>
          )}
        </div>

        {/* URL Context */}
        <div className="pl-1">
          <label htmlFor="urlContext" className="block text-sm font-medium text-gray-200 mb-1">{t.urlContext}</label>
          <textarea
            id="urlContext"
            name="urlContext"
            rows={3}
            className="w-full p-2 aurora-textarea text-xs border-slate-500/30 focus:border-slate-500"
            placeholder="https://example.com/page1&#10;https://example.com/page2"
            value={(localSettings.urlContext || []).join('\n')}
            onChange={handleInputChange}
          />
        </div>
      </div>

      {/* Files Card - Orange */}
      <div className="relative p-4 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-500/5 to-transparent flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/10 mr-3 text-orange-400">
            <FolderOpenIcon className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-medium text-gray-200">{t.chatAttachments}</h3>
        </div>
        <button
          onClick={onViewAttachments}
          className="px-3 py-1.5 text-xs font-medium text-orange-300 bg-orange-500/10 border border-orange-500/20 rounded-md hover:bg-orange-500/20 transition-colors"
        >
          {t.view}
        </button>
      </div>

      {/* Periodic Reminder Card - Pink */}
      <div className="relative p-4 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-pink-500 bg-gradient-to-r from-pink-500/5 to-transparent">
        <h3 className="text-sm font-bold text-pink-400 uppercase tracking-wider mb-4 flex items-center">
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Reinforcement (System Reminder)
        </h3>
        
        <div className="flex items-center space-x-3 mb-3 pl-1">
            <div className="flex-grow">
                <label htmlFor="systemReminderFrequency" className="block text-xs font-medium text-gray-300 mb-1">{t.systemReminderFrequency}</label>
                <input
                    type="number"
                    id="systemReminderFrequency"
                    name="systemReminderFrequency"
                    min="0"
                    step="1"
                    className="w-full p-2 aurora-input text-xs border-pink-500/20 focus:border-pink-500"
                    placeholder="0 (Disabled)"
                    value={localSettings.systemReminderFrequency ?? ''}
                    onChange={handleNumericInputChange}
                />
            </div>
             <div className="flex-shrink-0 self-end">
                 <button
                    type="button"
                    onClick={handleCleanContext}
                    disabled={!sessionId}
                    className="p-2 bg-pink-900/30 text-pink-300 hover:text-white rounded-md transition-colors hover:bg-pink-900/50 flex items-center border border-pink-500/30"
                    title={t.cleanContextDesc}
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
        
        <div className="pl-1">
            <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-gray-400">{t.systemReminderContent}</label>
                <button 
                    onClick={() => onOpenInstructionModal('customReminderMessage')} 
                    className="text-[10px] text-pink-400 hover:text-pink-200 flex items-center transition-colors"
                >
                    <PencilIcon className="w-3 h-3 mr-1" />
                    {t.customize}
                </button>
            </div>
            <div 
                className="w-full p-2 bg-black/20 border border-pink-500/20 rounded-md text-[10px] text-gray-400 truncate cursor-pointer hover:border-pink-500/50 transition-colors"
                onClick={() => onOpenInstructionModal('customReminderMessage')}
            >
                {localSettings.customReminderMessage || t.defaultReminderMessage}
            </div>
        </div>
      </div>

    </div>
  );
});

export default SettingsToolsContext;
