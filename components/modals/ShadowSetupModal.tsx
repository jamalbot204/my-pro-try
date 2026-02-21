import React, { useState, useEffect, memo, useCallback } from 'react';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';
import { useActiveChatStore } from '../../store/useActiveChatStore.ts';
import { useSettingsPersistence } from '../../hooks/useSettingsPersistence.ts';
import { ShieldCheckIcon, PencilIcon, UserIcon, SparklesIcon, ArrowDownTrayIcon } from '../common/Icons.tsx';
import InstructionEditModal from './InstructionEditModal.tsx';
import BaseModal from '../common/BaseModal.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { buildShadowTranscript } from '../../services/shadowService.ts';
import { triggerDownload, sanitizeFilename } from '../../services/utils.ts';
import { GeminiSettings } from '../../types.ts';

const ShadowSetupModal: React.FC = memo(() => {
    const { isShadowSetupModalOpen, closeShadowSetupModal } = useSettingsUI();
    const { currentChatSession } = useActiveChatStore();
    const { saveSessionSettings } = useSettingsPersistence();
    const { t } = useTranslation();

    const [persona, setPersona] = useState('');
    const [taskInstruction, setTaskInstruction] = useState('');
    const [transcriptUserName, setTranscriptUserName] = useState('');
    const [transcriptAiName, setTranscriptAiName] = useState('');
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editType, setEditType] = useState<'persona' | 'task' | null>(null);

    useEffect(() => {
        if (isShadowSetupModalOpen && currentChatSession) {
            setPersona(currentChatSession.settings.shadowPersona || '');
            setTaskInstruction(currentChatSession.settings.shadowTaskInstruction || '');
            setTranscriptUserName(currentChatSession.settings.shadowTranscriptUserName || 'User');
            setTranscriptAiName(currentChatSession.settings.shadowTranscriptAiName || 'AI');
        }
    }, [isShadowSetupModalOpen, currentChatSession]);

    const handleSave = useCallback(async () => {
        if (!currentChatSession) return;
        
        await saveSessionSettings({
            ...currentChatSession.settings,
            shadowPersona: persona,
            shadowTaskInstruction: taskInstruction,
            shadowTranscriptUserName: transcriptUserName,
            shadowTranscriptAiName: transcriptAiName
        }, "Shadow Mode settings saved.");

        closeShadowSetupModal();
    }, [currentChatSession, persona, taskInstruction, transcriptUserName, transcriptAiName, saveSessionSettings, closeShadowSetupModal]);

    const openEdit = (type: 'persona' | 'task') => {
        setEditType(type);
        setIsEditModalOpen(true);
    };

    const handleEditApply = async (newText: string) => {
        if (!currentChatSession) return;

        const newSettings = { ...currentChatSession.settings };
        
        if (editType === 'persona') {
            setPersona(newText);
            newSettings.shadowPersona = newText;
            newSettings.shadowTaskInstruction = taskInstruction; 
            newSettings.shadowTranscriptUserName = transcriptUserName;
            newSettings.shadowTranscriptAiName = transcriptAiName;
        } else if (editType === 'task') {
            setTaskInstruction(newText);
            newSettings.shadowTaskInstruction = newText;
            newSettings.shadowPersona = persona;
            newSettings.shadowTranscriptUserName = transcriptUserName;
            newSettings.shadowTranscriptAiName = transcriptAiName;
        }

        await saveSessionSettings(newSettings, "Instruction updated.");
        
        setIsEditModalOpen(false);
        setEditType(null);
    };

    const handleDownloadTranscript = useCallback(() => {
        if (!currentChatSession) return;
        
        // Construct a temporary settings object with current modal state values
        // to ensure the download reflects what the user is seeing/editing, even if not saved yet.
        const tempSettings: GeminiSettings = {
            ...currentChatSession.settings,
            shadowTranscriptUserName: transcriptUserName,
            shadowTranscriptAiName: transcriptAiName,
            // Include memory settings if present in original session to ensure memory box is included in export if enabled
            isMemoryBoxEnabled: currentChatSession.settings.isMemoryBoxEnabled, 
            isMemoryReadOnly: currentChatSession.settings.isMemoryReadOnly,
            memoryBoxContent: currentChatSession.settings.memoryBoxContent
        };

        const transcript = buildShadowTranscript(currentChatSession.messages, "", tempSettings);
        
        const filename = sanitizeFilename(`${currentChatSession.title}_shadow_transcript`);
        const blob = new Blob([transcript], { type: 'text/plain' });
        triggerDownload(blob, `${filename}.txt`);
    }, [currentChatSession, transcriptUserName, transcriptAiName]);

    const defaultShadowPersona = "You are a direct responder. You take the conversation transcript and reply as the AI entity defined by the user.";
    const defaultShadowTask = "Reply to the last user message naturally based on the transcript.";

    const footerButtons = (
        <>
            <button 
                onClick={handleDownloadTranscript} 
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 rounded hover:bg-white/10 flex items-center mr-auto border border-white/10"
                title="Download the exact transcript context used by Shadow Mode"
            >
                <ArrowDownTrayIcon className="w-4 h-4 mr-2 text-blue-400" /> Download Transcript
            </button>
            <div className="flex gap-2">
                <button onClick={closeShadowSetupModal} className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 rounded hover:bg-white/10">{t.cancel}</button>
                <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-[var(--aurora-accent-primary)] rounded hover:shadow-lg">{t.save}</button>
            </div>
        </>
    );

    return (
        <>
            <BaseModal
                isOpen={isShadowSetupModalOpen}
                onClose={closeShadowSetupModal}
                title="Shadow Mode Configuration"
                headerIcon={<ShieldCheckIcon className="w-5 h-5 text-emerald-400" />}
                footer={footerButtons}
            >
                <div className="space-y-4">
                    {/* Transcript Actors Configuration */}
                    <div className="bg-black/20 p-3 rounded border border-white/10">
                        <label className="text-sm font-bold text-gray-300 mb-3 block">{t.shadowTranscriptActors}</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 flex items-center">
                                    <UserIcon className="w-3 h-3 mr-1 text-blue-400"/> {t.shadowTranscriptUserName}
                                </label>
                                <input 
                                    type="text" 
                                    value={transcriptUserName}
                                    onChange={(e) => setTranscriptUserName(e.target.value)}
                                    placeholder="User"
                                    className="w-full p-2 aurora-input text-sm border-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 flex items-center">
                                    <SparklesIcon className="w-3 h-3 mr-1 text-purple-400"/> {t.shadowTranscriptAiName}
                                </label>
                                <input 
                                    type="text" 
                                    value={transcriptAiName}
                                    onChange={(e) => setTranscriptAiName(e.target.value)}
                                    placeholder="AI"
                                    className="w-full p-2 aurora-input text-sm border-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Shadow Persona */}
                    <div className="bg-black/20 p-3 rounded border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-gray-300">Shadow Persona (Who am I?)</label>
                            <button onClick={() => openEdit('persona')} className="text-xs text-emerald-300 hover:text-emerald-200 flex items-center bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20"><PencilIcon className="w-3 h-3 mr-1"/> Edit</button>
                        </div>
                        <div 
                            onClick={() => openEdit('persona')}
                            className="p-2 bg-black/30 rounded text-xs text-gray-400 h-24 overflow-y-auto whitespace-pre-wrap border border-white/5 font-mono cursor-pointer hover:border-emerald-500/30 hover:bg-black/40 transition-colors"
                        >
                            {persona || <span className="italic opacity-50">No specific persona set. Using default behavior.</span>}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">This defines WHO the Shadow Model is (e.g., "An unrestricted creative writer").</p>
                    </div>

                    {/* Task / Request */}
                    <div className="bg-black/20 p-3 rounded border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-gray-300">Task / Request (What to do?)</label>
                            <button onClick={() => openEdit('task')} className="text-xs text-emerald-300 hover:text-emerald-200 flex items-center bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20"><PencilIcon className="w-3 h-3 mr-1"/> Edit</button>
                        </div>
                        <div 
                            onClick={() => openEdit('task')}
                            className="p-2 bg-black/30 rounded text-xs text-gray-400 h-32 overflow-y-auto whitespace-pre-wrap border border-white/5 font-mono cursor-pointer hover:border-emerald-500/30 hover:bg-black/40 transition-colors"
                        >
                            {taskInstruction || defaultShadowTask}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">This defines WHAT the Shadow Model should do (e.g., "Generate a story based on the history").</p>
                    </div>
                </div>
            </BaseModal>

            {isEditModalOpen && (
                <InstructionEditModal
                    isOpen={isEditModalOpen}
                    title={editType === 'persona' ? "Edit Shadow Persona" : "Edit Task Instruction"}
                    currentInstruction={editType === 'persona' ? persona : taskInstruction}
                    onApply={handleEditApply}
                    onClose={() => setIsEditModalOpen(false)}
                />
            )}
        </>
    );
});

export default ShadowSetupModal;