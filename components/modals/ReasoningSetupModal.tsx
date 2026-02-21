import React, { useState, useEffect, useCallback, memo } from 'react';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';
import { useActiveChatStore } from '../../store/useActiveChatStore.ts';
import { useSettingsPersistence } from '../../hooks/useSettingsPersistence.ts';
import { ReasoningStep } from '../../types.ts';
import { BrainIcon, PlusIcon, TrashIcon, GripVerticalIcon, CheckIcon, UserIcon, PencilIcon } from '../common/Icons.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { DEFAULT_AGENT_SYSTEM_INSTRUCTION } from '../../constants.ts';
import InstructionEditModal from './InstructionEditModal.tsx';
import BaseModal from '../common/BaseModal.tsx';

const StepItem: React.FC<{
    step: ReasoningStep;
    index: number;
    onUpdate: (id: string, field: keyof ReasoningStep, value: string) => void;
    onDelete: (id: string) => void;
    onMove: (index: number, direction: 'up' | 'down') => void;
    isFirst: boolean;
    isLast: boolean;
    onEditInstruction: (id: string) => void;
}> = memo(({ step, index, onUpdate, onDelete, onMove, isFirst, isLast, onEditInstruction }) => {
    return (
        <div className="relative p-3 mb-3 rounded-md bg-black/20 border border-white/10 flex flex-col gap-2 group transition-all hover:bg-white/5">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <div className="mr-2 p-1 text-gray-500 cursor-grab active:cursor-grabbing">
                        <GripVerticalIcon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Step {index + 1}</span>
                </div>
                <div className="flex items-center space-x-1">
                    <button onClick={() => onMove(index, 'up')} disabled={isFirst} className="p-1 text-gray-500 hover:text-white disabled:opacity-30">▲</button>
                    <button onClick={() => onMove(index, 'down')} disabled={isLast} className="p-1 text-gray-500 hover:text-white disabled:opacity-30">▼</button>
                    <button onClick={() => onDelete(step.id)} className="p-1 text-gray-500 hover:text-red-400 ml-2" title="Delete Step"><TrashIcon className="w-4 h-4" /></button>
                </div>
            </div>
            <input 
                type="text"
                value={step.title}
                onChange={(e) => onUpdate(step.id, 'title', e.target.value)}
                placeholder="Step Title (e.g. Analysis)"
                className="w-full p-2 text-sm bg-black/30 border border-white/10 rounded focus:border-purple-500 focus:outline-none text-purple-200 font-medium"
            />
            <div className="relative">
                <div 
                    className="w-full p-2 text-sm bg-black/30 border border-white/10 rounded text-gray-300 h-20 overflow-y-auto cursor-pointer hover:border-purple-500/50 transition-colors"
                    onClick={() => onEditInstruction(step.id)}
                >
                    {step.instruction || <span className="italic text-gray-500">No instruction...</span>}
                </div>
                <button onClick={() => onEditInstruction(step.id)} className="absolute top-1 right-1 p-1 text-gray-400 hover:text-purple-300 bg-black/40 rounded" title="Edit full instruction"><PencilIcon className="w-3 h-3" /></button>
            </div>
        </div>
    );
});

const ReasoningSetupModal: React.FC = memo(() => {
    const { isReasoningSetupModalOpen, closeReasoningSetupModal } = useSettingsUI();
    const { currentChatSession } = useActiveChatStore();
    const { saveSessionSettings } = useSettingsPersistence();
    const { t } = useTranslation();

    const [steps, setSteps] = useState<ReasoningStep[]>([]);
    const [agentInstruction, setAgentInstruction] = useState('');
    
    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editTargetId, setEditTargetId] = useState<string | 'agent_instruction' | null>(null);

    useEffect(() => {
        if (isReasoningSetupModalOpen && currentChatSession) {
            setSteps(currentChatSession.settings.reasoningSteps || []);
            setAgentInstruction(currentChatSession.settings.agentSystemInstruction || DEFAULT_AGENT_SYSTEM_INSTRUCTION);
        }
    }, [isReasoningSetupModalOpen, currentChatSession]);

    const handleAddStep = useCallback(() => {
        setSteps(prev => [...prev, { id: `step-${Date.now()}`, title: `Step ${prev.length + 1}`, instruction: '' }]);
    }, []);

    const handleUpdateStep = useCallback((id: string, field: keyof ReasoningStep, value: string) => {
        setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    }, []);

    const handleDeleteStep = useCallback((id: string) => {
        setSteps(prev => prev.filter(s => s.id !== id));
    }, []);

    const handleMoveStep = useCallback((index: number, direction: 'up' | 'down') => {
        const newSteps = [...steps];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < newSteps.length) {
            [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
            setSteps(newSteps);
        }
    }, [steps]);

    const handleSave = useCallback(async () => {
        if (!currentChatSession) return;
        const validSteps = steps.filter(s => s.instruction.trim() !== '');
        
        await saveSessionSettings({
            ...currentChatSession.settings,
            reasoningSteps: validSteps,
            agentSystemInstruction: agentInstruction
        }, "Reasoning workflow saved.");
        
        closeReasoningSetupModal();
    }, [currentChatSession, steps, agentInstruction, saveSessionSettings, closeReasoningSetupModal]);

    const handleResetDefault = useCallback(() => {
        setSteps([
            { id: 'def-1', title: 'Analysis', instruction: 'Analyze the user request and identify key entities and intents.' },
            { id: 'def-2', title: 'Retrieval', instruction: 'Use available tools to find relevant information based on the analysis.' },
            { id: 'def-3', title: 'Synthesis', instruction: 'Synthesize the gathered information into a coherent answer.' }
        ]);
    }, []);

    const openEditModal = (targetId: string | 'agent_instruction') => {
        setEditTargetId(targetId);
        setIsEditModalOpen(true);
    };

    const getEditContent = () => {
        if (editTargetId === 'agent_instruction') return agentInstruction;
        const step = steps.find(s => s.id === editTargetId);
        return step ? step.instruction : '';
    };

    const handleEditApply = async (newText: string) => {
        if (!currentChatSession) return;

        let newSettings = { ...currentChatSession.settings };
        let updatedSteps = [...steps]; 

        if (editTargetId === 'agent_instruction') {
            setAgentInstruction(newText);
            newSettings.agentSystemInstruction = newText;
            newSettings.reasoningSteps = updatedSteps; 
        } else if (editTargetId) {
            updatedSteps = updatedSteps.map(s => s.id === editTargetId ? { ...s, instruction: newText } : s);
            setSteps(updatedSteps);
            newSettings.reasoningSteps = updatedSteps;
            newSettings.agentSystemInstruction = agentInstruction;
        }

        // Persist immediately on sub-modal close
        await saveSessionSettings(newSettings, "Instruction updated.");
        
        setIsEditModalOpen(false);
        setEditTargetId(null);
    };

    const footerButtons = (
        <>
            <button onClick={closeReasoningSetupModal} className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 rounded hover:bg-white/10">
                {t.cancel}
            </button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-[var(--aurora-accent-primary)] rounded hover:shadow-lg hover:shadow-blue-500/30 flex items-center">
                <CheckIcon className="w-4 h-4 mr-1.5" /> {t.save}
            </button>
        </>
    );

    return (
        <>
            <BaseModal
                isOpen={isReasoningSetupModalOpen}
                onClose={closeReasoningSetupModal}
                title="Agent Reasoning Workflow"
                headerIcon={<BrainIcon className="w-5 h-5 text-fuchsia-400" />}
                footer={footerButtons}
            >
                <div className="text-sm text-gray-400 mb-4 bg-fuchsia-900/10 p-3 rounded border border-fuchsia-500/20">
                    <p>Define a sequence of thinking steps. The model will execute these sequentially before providing the final answer. This creates a powerful "Chain of Thought" agent.</p>
                </div>

                <div className="space-y-4">
                    {/* System Instruction */}
                    <div className="bg-black/20 p-3 rounded border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center">
                                <UserIcon className="w-4 h-4 mr-2 text-fuchsia-400" />
                                <label className="text-sm font-bold text-gray-300">Agent System Instructions</label>
                            </div>
                            <button onClick={() => openEditModal('agent_instruction')} className="text-xs text-fuchsia-300 hover:text-fuchsia-200 flex items-center bg-fuchsia-500/10 px-2 py-1 rounded border border-fuchsia-500/20"><PencilIcon className="w-3 h-3 mr-1"/> Edit</button>
                        </div>
                        <div 
                            className="w-full p-2.5 text-sm bg-black/30 border border-white/5 rounded text-gray-400 h-24 overflow-y-auto whitespace-pre-wrap cursor-pointer hover:border-fuchsia-500/30 transition-colors"
                            onClick={() => openEditModal('agent_instruction')}
                        >
                            {agentInstruction}
                        </div>
                    </div>

                    {/* Steps List */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-bold text-gray-300">Execution Steps</h3>
                            <button onClick={handleAddStep} className="flex items-center px-2 py-1 text-xs font-medium text-fuchsia-300 bg-fuchsia-500/10 rounded hover:bg-fuchsia-500/20 transition-colors"><PlusIcon className="w-3.5 h-3.5 mr-1" /> Add Step</button>
                        </div>
                        
                        {steps.length === 0 && (
                            <div className="text-center py-8 border-2 border-dashed border-gray-700 rounded-lg">
                                <p className="text-gray-500">No steps defined.</p>
                                <button onClick={handleResetDefault} className="text-xs text-blue-400 hover:underline mt-2">Load Default Template</button>
                            </div>
                        )}
                        {steps.map((step, idx) => (
                            <StepItem 
                                key={step.id} 
                                step={step} 
                                index={idx} 
                                onUpdate={handleUpdateStep} 
                                onDelete={handleDeleteStep}
                                onMove={handleMoveStep}
                                isFirst={idx === 0}
                                isLast={idx === steps.length - 1}
                                onEditInstruction={openEditModal} 
                            />
                        ))}
                    </div>
                </div>
            </BaseModal>

            {isEditModalOpen && (
                <InstructionEditModal
                    isOpen={isEditModalOpen}
                    title={editTargetId === 'agent_instruction' ? "Edit Agent Persona" : "Edit Step Instruction"}
                    currentInstruction={getEditContent()}
                    onApply={handleEditApply}
                    onClose={() => setIsEditModalOpen(false)}
                />
            )}
        </>
    );
});

export default ReasoningSetupModal;