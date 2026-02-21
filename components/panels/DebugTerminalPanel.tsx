import React, { useState, memo, useEffect } from 'react';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';
import { useActiveChatStore } from '../../store/useActiveChatStore.ts';
import { ApiRequestLog } from '../../types.ts';
import { CloseIcon, TrashIcon, BugAntIcon, ChevronDownIcon, ChevronRightIcon, WrenchScrewdriverIcon } from '../common/Icons.tsx';
import { getModelDisplayName } from '../../services/llm/config.ts';
import { useInteractionStore } from '../../store/useInteractionStore.ts';
import { useTranslation } from '../../hooks/useTranslation.ts';

interface LogEntryProps {
  log: ApiRequestLog;
}

const LogEntryComponent: React.FC<LogEntryProps> = ({ log }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const modelName = getModelDisplayName(typeof log.payload.model === 'string' ? log.payload.model : undefined);
  const { t } = useTranslation();

  const isMemoryManager = log.characterName?.includes('Memory Manager');
  const isShadowMode = log.characterName?.includes('Shadow Mode');
  const isToolTrace = log.requestType === 'tool.trace';

  let borderColor = "border-[var(--aurora-border)]";
  let textColor = "text-gray-400";
  let badgeColor = "";
  
  if (isMemoryManager) {
      borderColor = "border-cyan-900/50";
      textColor = "text-cyan-300";
      badgeColor = "bg-cyan-600/50 text-cyan-100";
  } else if (isShadowMode) {
      borderColor = "border-emerald-900/50";
      textColor = "text-emerald-300";
      badgeColor = "bg-emerald-600/50 text-emerald-100";
  } else if (isToolTrace) {
      borderColor = "border-amber-900/50";
      textColor = "text-amber-300";
      badgeColor = "bg-amber-600/50 text-amber-100";
  } else {
      if (log.requestType === 'chat.create') badgeColor = 'bg-blue-600/50 text-blue-200';
      else if (log.requestType === 'chat.sendMessage') badgeColor = 'bg-green-600/50 text-green-200';
      else if (log.requestType === 'files.uploadFile') badgeColor = 'bg-yellow-600/50 text-yellow-200';
      else if (log.requestType === 'files.getFile') badgeColor = 'bg-indigo-600/50 text-indigo-200';
      else badgeColor = 'bg-purple-600/50 text-purple-200';
  }

  const containerBg = isMemoryManager ? "bg-cyan-950/10 hover:bg-cyan-950/20" : 
                      isShadowMode ? "bg-emerald-950/10 hover:bg-emerald-950/20" : 
                      isToolTrace ? "bg-amber-950/10 hover:bg-amber-950/20" :
                      "hover:bg-white/5";

  const IconToUse = isToolTrace ? WrenchScrewdriverIcon : (isExpanded ? ChevronDownIcon : ChevronRightIcon);

  return (
    <div className={`border-b ${borderColor} ${containerBg}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 transition-colors focus:outline-none"
        aria-expanded={isExpanded}
        aria-controls={`log-payload-${log.id}`}
      >
        <div className="flex items-center space-x-2 text-left overflow-hidden">
          <IconToUse className={`w-3.5 h-3.5 flex-shrink-0 ${textColor} ${isToolTrace && isExpanded ? 'rotate-180 transition-transform' : ''}`} />
          <span className={`text-xs flex-shrink-0 ${textColor}`}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 } as any)}</span>
          <span className={`px-2 py-0.5 text-xs rounded-full font-medium flex-shrink-0 ${badgeColor}`}>
            {log.requestType}
          </span>
          {log.characterName && <span className={`text-xs flex-shrink-0 ${isMemoryManager ? 'text-cyan-400 font-bold' : (isShadowMode ? 'text-emerald-400 font-bold' : (isToolTrace ? 'text-amber-400 font-bold' : 'text-purple-300'))}`}>
            ({log.characterName})
          </span>}
          {log.apiSessionId && !isMemoryManager && !isToolTrace && (
            <span className="text-xs text-gray-500 truncate" title={log.apiSessionId}>
              ID: {log.apiSessionId.substring(0,8)}...
            </span>
          )}
        </div>
        {!isToolTrace && <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{t.model}: {modelName}</span>}
      </button>
      {isExpanded && (
        <div id={`log-payload-${log.id}`} className="p-3 bg-black/30">
           {log.apiSessionId && !isToolTrace && (
            <p className="text-xs text-cyan-500 mb-1.5">
              <span className="font-semibold">{t.fullApiSessionId}</span> <span className="font-mono break-all">{log.apiSessionId}</span>
            </p>
          )}
          <pre className={`text-xs whitespace-pre-wrap break-all bg-black/20 p-2 rounded-md max-h-96 overflow-auto ${isMemoryManager ? 'text-cyan-100 border border-cyan-900/30' : (isToolTrace ? 'text-amber-100 border border-amber-900/30' : 'text-gray-300')}`}>
            <code>{JSON.stringify(log.payload, null, 2).replace(/\\n/g, '\n')}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

const LogEntry = memo(LogEntryComponent);

const DebugTerminalPanel: React.FC = memo(() => {
  const { currentChatSession } = useActiveChatStore();
  const { clearApiLogs } = useInteractionStore();
  const { isDebugTerminalOpen, closeDebugTerminal } = useSettingsUI();
  const { t } = useTranslation();
  const [areButtonsDisabled, setAreButtonsDisabled] = useState(true);

  useEffect(() => {
    if (isDebugTerminalOpen) {
      setAreButtonsDisabled(true);
      const timerId = setTimeout(() => {
        setAreButtonsDisabled(false);
      }, 500);
      return () => clearTimeout(timerId);
    }
  }, [isDebugTerminalOpen]);

  if (!isDebugTerminalOpen || !currentChatSession) return null;

  const logs = currentChatSession.apiRequestLogs || [];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-md" onClick={closeDebugTerminal}>
      <div className="aurora-panel p-0 rounded-lg shadow-2xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col text-gray-200" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-[var(--aurora-border)] sticky top-0 bg-[rgba(13,15,24,0.8)] z-10">
          <div className="flex items-center">
            <BugAntIcon className="w-5 h-5 mr-2 text-orange-400" />
            <h2 className="text-xl font-semibold text-gray-100">{t.apiRequestLog}</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => clearApiLogs()}
              title={t.clearLogs}
              disabled={areButtonsDisabled || logs.length === 0}
              className="p-1.5 text-gray-400 bg-white/5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-shadow hover:text-red-400 hover:shadow-[0_0_10px_1px_rgba(239,68,68,0.7)]"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
            <button 
                onClick={closeDebugTerminal} 
                disabled={areButtonsDisabled}
                className="p-1 text-gray-400 hover:text-gray-100 rounded-full transition-shadow hover:shadow-[0_0_10px_1px_rgba(255,255,255,0.2)] disabled:opacity-60"
                aria-label={t.close}
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </header>
        <div className="px-4 pt-2 pb-1">
            <p className="text-xs text-gray-400">{t.showingLogsFor} <span className="font-medium text-gray-300">{currentChatSession.title}</span></p>
        </div>

        <div className={`flex-1 min-h-0 overflow-y-auto border-t border-[var(--aurora-border)] ${areButtonsDisabled ? 'pointer-events-none opacity-60' : ''}`}>
          {logs.length === 0 ? (
            <p className="p-6 text-center text-gray-500 italic">{t.noLogsYet}</p>
          ) : (
            <div className="divide-y divide-[var(--aurora-border)]">
              {logs.slice().reverse().map(log => ( 
                <LogEntry key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default DebugTerminalPanel;