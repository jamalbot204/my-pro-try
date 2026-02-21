
import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';
import { useActiveChatStore } from '../../store/useActiveChatStore.ts';
import { useSettingsPersistence } from '../../hooks/useSettingsPersistence.ts';
import { BrainIcon, CheckIcon, TrashIcon, ArrowPathIcon, EyeIcon, SparklesIcon, PencilIcon, ClockIcon, LocateIcon, ArrowUturnLeftIcon, SaveDiskIcon, PlusIcon, XCircleIcon } from '../common/Icons.tsx';
import BaseModal from '../common/BaseModal.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { useMemoryStore } from '../../store/useMemoryStore.ts';
import { MODEL_DEFINITIONS } from '../../constants.ts';
import { useToastStore } from '../../store/useToastStore.ts';
import { ChatMessage, ChatMessageRole, MemorySnapshot } from '../../types.ts';
import { useDataStore } from '../../store/useDataStore.ts';
import * as dbService from '../../services/dbService.ts';

interface ActiveMemoryModalProps {
    onJumpToMessage?: (messageId: string) => void;
}

const ActiveMemoryModal: React.FC<ActiveMemoryModalProps> = memo(({ onJumpToMessage }) => {
    const { isActiveMemoryModalOpen, closeActiveMemoryModal } = useSettingsUI();
    const { currentChatSession, updateCurrentChatSession } = useActiveChatStore();
    const { updateMessages } = useDataStore();
    const { saveSessionSettings } = useSettingsPersistence();
    const { isUpdatingMemory, lastUpdateTimestamp, manualUpdateContent, performBackgroundUpdate } = useMemoryStore();
    const { t } = useTranslation();
    const showToast = useToastStore(state => state.showToast); 

    const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

    // Current State Refs
    const [isEnabled, setIsEnabled] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false); 
    const [triggerLogic, setTriggerLogic] = useState('');
    const [memoryContent, setMemoryContent] = useState('');
    const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    
    // New State for Manual Instruction
    const [manualInstruction, setManualInstruction] = useState('');
    const [isExecutingManual, setIsExecutingManual] = useState(false);

    // Initial Load
    useEffect(() => {
        if (isActiveMemoryModalOpen && currentChatSession) {
            const s = currentChatSession.settings;
            setIsEnabled(s.isMemoryBoxEnabled ?? false);
            setIsReadOnly(s.isMemoryReadOnly ?? false);
            setTriggerLogic(s.memoryToolDescription ?? "Call this tool to update the user profile whenever new permanent information is revealed.");
            setMemoryContent(s.memoryBoxContent ?? "{}");
            setSelectedModel(s.activeMemoryModel || 'gemini-2.5-flash');
            setHasUnsavedChanges(false);
            setManualInstruction(''); // Reset manual instruction
            setActiveTab('current');
        }
    }, [isActiveMemoryModalOpen, currentChatSession]);

    // Sync with external updates (e.g. background worker) only if not editing locally
    useEffect(() => {
        if (isActiveMemoryModalOpen && currentChatSession && !hasUnsavedChanges) {
             setMemoryContent(currentChatSession.settings.memoryBoxContent ?? "{}");
        }
    }, [currentChatSession?.settings.memoryBoxContent, hasUnsavedChanges, isActiveMemoryModalOpen]);

    // Helper for auto-saving configuration settings immediately (SILENTLY)
    const autoSaveSettings = useCallback(async (updates: any) => {
        if (!currentChatSession) return;
        
        await saveSessionSettings({
            ...currentChatSession.settings,
            ...updates
        }, null); // Pass null to suppress "Settings Saved" toast
    }, [currentChatSession, saveSessionSettings]);

    // Handler for saving ONLY Content (JSON)
    // This CREATES a history snapshot and INJECTS a chat message anchor.
    const handleSaveContent = useCallback(async () => {
        if (!currentChatSession) return;
        
        // 1. Update Session with Config first (to ensure snapshot includes latest settings)
        const tempSettings = {
            ...currentChatSession.settings,
            isMemoryBoxEnabled: isEnabled,
            isMemoryReadOnly: isReadOnly,
            memoryToolDescription: triggerLogic,
            activeMemoryModel: selectedModel
        };
        // Update store optimistically
        await updateCurrentChatSession(s => s ? ({ ...s, settings: tempSettings }) : null);

        // 2. Inject Anchor Message
        const anchorMessage: ChatMessage = {
            id: `mem-update-${Date.now()}`,
            role: ChatMessageRole.MODEL,
            content: "User Profile updated manually.",
            timestamp: new Date(),
            hasMemoryUpdate: true,
            isSystemReminder: true
        };

        const updatedMessages = [...currentChatSession.messages, anchorMessage];
        
        // Update messages in store
        await updateCurrentChatSession(s => s ? ({ ...s, messages: updatedMessages }) : null);

        // 3. Perform Memory Update (Content + Anchor + Snapshot + DB Persistence)
        await manualUpdateContent(memoryContent, 'direct_edit', "Manual Snapshot", anchorMessage.id);
        
        // Persist messages explicitly
        await updateMessages(currentChatSession.id, updatedMessages);

        setHasUnsavedChanges(false);
        showToast("Profile Snapshot updated and anchor created.", "success");
    }, [currentChatSession, isEnabled, isReadOnly, triggerLogic, memoryContent, selectedModel, manualUpdateContent, updateCurrentChatSession, updateMessages, showToast]);

    const handleClear = useCallback(() => {
        if(window.confirm("Are you sure you want to clear the profile? It will reset to default skeleton.")) {
            setMemoryContent(JSON.stringify({ identity: {}, preferences: {}, beliefs: [], active_projects: [] }, null, 2));
            setHasUnsavedChanges(true);
        }
    }, []);

    const handleExecuteManualInstruction = useCallback(async () => {
        if (!manualInstruction.trim() || !currentChatSession) return;
        
        setIsExecutingManual(true);
        try {
            const adaptedContext = currentChatSession.messages.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.content }]
            }));

            // Generate ID for the upcoming anchor message to link the snapshot
            const anchorId = `mem-manual-inst-${Date.now()}`;

            // Perform update, linking to the future anchor ID
            const resultMessage = await performBackgroundUpdate(manualInstruction, adaptedContext, anchorId);
            
            showToast(resultMessage, resultMessage.includes("success") ? "success" : "error");
            
            if (resultMessage.includes("success")) {
                 const anchorMessage: ChatMessage = {
                    id: anchorId,
                    role: ChatMessageRole.MODEL,
                    content: `User Profile updated via instruction: "${manualInstruction}"`,
                    timestamp: new Date(),
                    hasMemoryUpdate: true,
                    isSystemReminder: true
                };
                
                // Fetch fresh session state to ensure we append to latest messages
                const freshSession = useActiveChatStore.getState().currentChatSession;
                if (freshSession) {
                    const updatedMessages = [...freshSession.messages, anchorMessage];
                    await updateCurrentChatSession(s => s ? ({ ...s, messages: updatedMessages, lastUpdatedAt: new Date() }) : null);
                    await updateMessages(freshSession.id, updatedMessages);
                }
            }

            setManualInstruction(''); // Clear input on success
        } catch (error: any) {
            showToast(`Manual update failed: ${error.message}`, "error");
        } finally {
            setIsExecutingManual(false);
        }
    }, [manualInstruction, currentChatSession, performBackgroundUpdate, showToast, updateCurrentChatSession, updateMessages]);

    const handleRestoreSnapshot = useCallback(async (snapshot: MemorySnapshot) => {
        if (!currentChatSession) return;
        
        // Restore content locally first
        setMemoryContent(snapshot.content);
        
        // Restore settings AND Anchor ID
        await saveSessionSettings({
            ...currentChatSession.settings,
            memoryBoxContent: snapshot.content,
            activeMemoryAnchorId: snapshot.relatedMessageId // Restore anchor pointer
        }, "Profile restored from history.");

        showToast("Profile state restored to selected snapshot.", "success");
        
        // Close modal and jump to the restored context message
        closeActiveMemoryModal();
        if (snapshot.relatedMessageId && onJumpToMessage) {
            setTimeout(() => {
                onJumpToMessage(snapshot.relatedMessageId!);
            }, 100);
        }
    }, [currentChatSession, saveSessionSettings, showToast, closeActiveMemoryModal, onJumpToMessage]);

    const footerButtons = (
        <button onClick={closeActiveMemoryModal} className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 rounded hover:bg-white/10">{t.close}</button>
    );

    const formatJson = () => {
        try {
            const parsed = JSON.parse(memoryContent);
            setMemoryContent(JSON.stringify(parsed, null, 2));
            setHasUnsavedChanges(true);
        } catch (e) {
            alert("Invalid JSON content");
        }
    };

    const snapshots = useMemo(() => currentChatSession?.memoryHistory || [], [currentChatSession?.memoryHistory]);

    return (
        <BaseModal
            isOpen={isActiveMemoryModalOpen}
            onClose={closeActiveMemoryModal}
            title={
                <div className="flex items-center">
                    <BrainIcon className="w-5 h-5 mr-2 text-cyan-400" />
                    <span>User Profile Manager</span>
                </div>
            }
            footer={footerButtons}
            maxWidth="sm:max-w-3xl"
        >
            {/* Tabs */}
            <div className="flex border-b border-white/10 mb-4">
                <button 
                    className={`flex-1 py-2 text-sm font-medium text-center transition-colors ${activeTab === 'current' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}
                    onClick={() => setActiveTab('current')}
                >
                    Current State
                </button>
                <button 
                    className={`flex-1 py-2 text-sm font-medium text-center transition-colors ${activeTab === 'history' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}
                    onClick={() => setActiveTab('history')}
                >
                    History Log ({snapshots.length})
                </button>
            </div>

            {activeTab === 'current' && (
                <div className="space-y-5 animate-fade-in-right">
                    {/* Header Switches */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5">
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-200">Enable User Profile (Auto-Update)</span>
                                <span className="text-xs text-gray-400">Allows AI to Read AND Write to the profile (JSON).</span>
                            </div>
                            <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={(e) => { 
                                    const val = e.target.checked; 
                                    setIsEnabled(val); 
                                    autoSaveSettings({ isMemoryBoxEnabled: val });
                                }}
                                className="h-5 w-5 text-cyan-500 bg-black/30 border-white/20 rounded focus:ring-cyan-500 cursor-pointer"
                            />
                        </div>

                        <div className={`flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5 transition-opacity ${isEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="flex flex-col">
                                <div className="flex items-center">
                                    <EyeIcon className="w-3.5 h-3.5 mr-2 text-cyan-300" />
                                    <span className="text-sm font-bold text-gray-200">Read Only Mode</span>
                                </div>
                                <span className="text-xs text-gray-400">Allows AI to Read profile, but prevents modifying it.</span>
                            </div>
                            <input
                                type="checkbox"
                                checked={isReadOnly}
                                onChange={(e) => { 
                                    const val = e.target.checked; 
                                    setIsReadOnly(val); 
                                    autoSaveSettings({ isMemoryReadOnly: val });
                                }}
                                disabled={isEnabled}
                                className="h-5 w-5 text-cyan-500 bg-black/30 border-white/20 rounded focus:ring-cyan-500 cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Manual Instruction Trigger */}
                    <div className={`relative p-3 rounded-lg border border-cyan-500/20 bg-cyan-900/10 ${!isEnabled && !isReadOnly ? 'opacity-50 pointer-events-none' : ''}`}>
                        <label className="block text-xs font-bold text-cyan-300 mb-1 uppercase tracking-wider flex items-center">
                            <PencilIcon className="w-3 h-3 mr-1.5" />
                            Profile Updater (Manual Trigger)
                        </label>
                        <div className="flex gap-2">
                            <textarea
                                value={manualInstruction}
                                onChange={(e) => setManualInstruction(e.target.value)}
                                placeholder="e.g., Update Profile: Add 'Coding' to active_projects list."
                                className="flex-grow p-2 text-sm bg-black/40 border border-white/10 rounded focus:border-cyan-500/50 resize-none h-16"
                            />
                            <button
                                onClick={handleExecuteManualInstruction}
                                disabled={isExecutingManual || !manualInstruction.trim()}
                                className="px-3 py-1 text-xs font-bold text-white bg-cyan-600/80 rounded hover:bg-cyan-500 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[80px]"
                            >
                                {isExecutingManual ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : "Execute"}
                            </button>
                        </div>
                    </div>

                    {/* Model Selection */}
                    <div className={isEnabled ? '' : 'opacity-50 pointer-events-none'}>
                         <label className="block text-xs font-bold text-cyan-300 mb-1 uppercase tracking-wider flex items-center">
                            <SparklesIcon className="w-3 h-3 mr-1" />
                            Background Profile Manager Model
                         </label>
                         <div className="relative">
                            <select
                                value={selectedModel}
                                onChange={(e) => { 
                                    const val = e.target.value; 
                                    setSelectedModel(val);
                                    autoSaveSettings({ activeMemoryModel: val });
                                }}
                                className="w-full p-2.5 aurora-select text-sm border-cyan-500/30 focus:border-cyan-500 rounded-md"
                                disabled={!isEnabled}
                            >
                                {MODEL_DEFINITIONS.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                                 {!MODEL_DEFINITIONS.find(m => m.id === selectedModel) && (
                                     <option value={selectedModel}>{selectedModel}</option>
                                 )}
                            </select>
                         </div>
                    </div>

                    {/* The Box */}
                    <div className="flex flex-col h-[300px]">
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">User Profile (JSON)</label>
                            <div className="flex items-center space-x-2">
                                {isUpdatingMemory && <span className="text-xs text-cyan-400 animate-pulse flex items-center"><ArrowPathIcon className="w-3 h-3 mr-1 animate-spin"/> Updating...</span>}
                                {!isUpdatingMemory && lastUpdateTimestamp && <span className="text-[10px] text-gray-500">Updated: {lastUpdateTimestamp.toLocaleTimeString()}</span>}
                                <button onClick={formatJson} className="text-[10px] text-gray-400 hover:text-white bg-white/5 px-2 py-1 rounded">Format JSON</button>
                                <button onClick={handleClear} className="text-[10px] text-red-400 hover:text-red-300 bg-red-500/10 px-2 py-1 rounded" title="Reset Profile"><TrashIcon className="w-3 h-3"/></button>
                            </div>
                        </div>
                        <textarea
                            value={memoryContent}
                            onChange={(e) => { setMemoryContent(e.target.value); setHasUnsavedChanges(true); }}
                            className="flex-grow w-full p-3 bg-[#0d1117] text-green-400 font-mono text-xs border border-white/10 rounded-md focus:border-cyan-500 resize-none leading-relaxed"
                            spellCheck={false}
                        />
                        {/* UPDATE SNAPSHOT BUTTON */}
                        <div className="mt-2 flex justify-end">
                             <button 
                                onClick={handleSaveContent}
                                className="flex items-center px-3 py-1.5 text-xs font-bold text-cyan-100 bg-cyan-900/40 border border-cyan-500/30 rounded hover:bg-cyan-900/60 hover:text-white hover:border-cyan-400 transition-all"
                                title="Saves current content as a new History Snapshot and marks it in the chat."
                             >
                                <SaveDiskIcon className="w-3.5 h-3.5 mr-1.5" />
                                Update Snapshot (Content + Anchor)
                             </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="space-y-3 h-[600px] overflow-y-auto pr-1 custom-scrollbar animate-fade-in-right">
                    {snapshots.length === 0 && (
                        <p className="text-center text-gray-500 py-10 italic">No history available yet.</p>
                    )}
                    {snapshots.map((snap) => (
                        <SnapshotCard 
                            key={snap.id} 
                            snapshot={snap} 
                            onRestore={handleRestoreSnapshot} 
                            onJump={onJumpToMessage}
                            currentAnchorId={currentChatSession?.settings.activeMemoryAnchorId}
                        />
                    ))}
                </div>
            )}
        </BaseModal>
    );
});

// Inner component for Snapshot Item
const SnapshotCard: React.FC<{ 
    snapshot: MemorySnapshot; 
    onRestore: (s: MemorySnapshot) => void; 
    onJump?: (msgId: string) => void; 
    currentAnchorId?: string;
}> = memo(({ snapshot, onRestore, onJump, currentAnchorId }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    let Icon = SparklesIcon;
    let iconClass = "text-purple-400";
    let title = "AI Update";

    if (snapshot.source === 'manual_trigger') {
        Icon = BrainIcon; // or generic tool icon
        iconClass = "text-cyan-400";
        title = "Profile Manager Trigger";
    } else if (snapshot.source === 'direct_edit') {
        Icon = PencilIcon;
        iconClass = "text-gray-400";
        title = "Direct Edit";
    } else if (snapshot.source === 'restore') {
        Icon = ArrowUturnLeftIcon;
        iconClass = "text-green-400";
        title = "Restored Version";
    }

    const isActive = snapshot.relatedMessageId === currentAnchorId;

    return (
        <div className={`border rounded-lg p-3 transition-colors ${isActive ? 'bg-cyan-900/20 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.1)]' : 'bg-black/20 border-white/5 hover:bg-black/30'}`}>
            <div className="flex justify-between items-start">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-full bg-white/5 ${iconClass} ${isActive ? 'animate-pulse' : ''}`}>
                        <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${isActive ? 'text-cyan-300' : 'text-gray-300'}`}>{title} {isActive && "(Active)"}</span>
                            <span className="text-[10px] text-gray-500 flex items-center">
                                <ClockIcon className="w-3 h-3 mr-1" />
                                {new Date(snapshot.timestamp).toLocaleString()}
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 truncate" title={snapshot.triggerText}>
                            {snapshot.triggerText || "No description"}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1.5 text-gray-400 hover:text-white bg-white/5 rounded hover:bg-white/10" 
                        title="View Content"
                    >
                        <EyeIcon className="w-4 h-4" />
                    </button>
                    {snapshot.relatedMessageId && onJump && (
                        <button 
                            onClick={() => onJump(snapshot.relatedMessageId!)}
                            className="p-1.5 text-gray-400 hover:text-blue-300 bg-white/5 rounded hover:bg-white/10" 
                            title="Jump to Context"
                        >
                            <LocateIcon className="w-4 h-4" />
                        </button>
                    )}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onRestore(snapshot);
                        }}
                        disabled={isActive}
                        className={`p-1.5 rounded hover:bg-white/10 ${isActive ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-green-300 bg-white/5'}`}
                        title={isActive ? "Currently Active" : "Restore this version"}
                    >
                        <ArrowUturnLeftIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="mt-3 pt-2 border-t border-white/5">
                    <pre className="text-[10px] font-mono text-green-400/80 bg-black/40 p-2 rounded overflow-x-auto">
                        {snapshot.content}
                    </pre>
                </div>
            )}
        </div>
    );
});

export default ActiveMemoryModal;
