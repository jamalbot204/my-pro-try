import React, { useState, useCallback, memo } from 'react';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';
import { useDataStore } from '../../store/useDataStore.ts';
import { useTranslation } from '../../hooks/useTranslation.ts';
import BaseModal from '../common/BaseModal.tsx';
import { PlusIcon, CheckIcon, TrashIcon, PencilIcon } from '../common/Icons.tsx';
import { CustomMemoryStrategy } from '../../types.ts';

const CustomStrategyModal: React.FC = memo(() => {
    const { isCustomStrategyModalOpen, closeCustomStrategyModal } = useSettingsUI();
    const { addCustomStrategy, deleteCustomStrategy, updateCustomStrategy, customMemoryStrategies } = useDataStore();
    const { t } = useTranslation();

    const [label, setLabel] = useState('');
    const [description, setDescription] = useState('');
    const [systemMandate, setSystemMandate] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleSave = useCallback(async () => {
        if (!label.trim() || !systemMandate.trim()) return;

        if (editingId) {
             await updateCustomStrategy({
                id: editingId,
                label,
                description: description || "Custom strategy defined by user.",
                systemMandate
            });
        } else {
            const newStrategy: CustomMemoryStrategy = {
                id: `custom_${Date.now()}`,
                label,
                description: description || "Custom strategy defined by user.",
                systemMandate
            };
            await addCustomStrategy(newStrategy);
        }
        
        setLabel('');
        setDescription('');
        setSystemMandate('');
        setEditingId(null);
        closeCustomStrategyModal();
    }, [label, description, systemMandate, addCustomStrategy, updateCustomStrategy, editingId, closeCustomStrategyModal]);

    const handleEdit = useCallback((s: CustomMemoryStrategy) => {
        setLabel(s.label);
        setDescription(s.description);
        setSystemMandate(s.systemMandate);
        setEditingId(s.id);
    }, []);

    const handleCancelEdit = useCallback(() => {
        setLabel('');
        setDescription('');
        setSystemMandate('');
        setEditingId(null);
    }, []);

    const handleDelete = useCallback(async (id: string) => {
        if (window.confirm("Delete this strategy?")) {
            await deleteCustomStrategy(id);
            if (editingId === id) {
                handleCancelEdit();
            }
        }
    }, [deleteCustomStrategy, editingId, handleCancelEdit]);

    const footerButtons = (
        <>
            {editingId ? (
                <button onClick={handleCancelEdit} className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 rounded hover:bg-white/10">Cancel Edit</button>
            ) : (
                <button onClick={closeCustomStrategyModal} className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 rounded hover:bg-white/10">{t.cancel}</button>
            )}
            <button 
                onClick={handleSave} 
                disabled={!label.trim() || !systemMandate.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-[var(--aurora-accent-primary)] rounded hover:shadow-lg hover:shadow-blue-500/30 flex items-center disabled:opacity-50"
            >
                <CheckIcon className="w-4 h-4 mr-1.5" /> {editingId ? "Update" : t.save}
            </button>
        </>
    );

    return (
        <BaseModal
            isOpen={isCustomStrategyModalOpen}
            onClose={closeCustomStrategyModal}
            title={editingId ? "Edit Strategy" : "Custom Memory Strategies"}
            headerIcon={editingId ? <PencilIcon className="w-5 h-5 text-blue-400" /> : <PlusIcon className="w-5 h-5 text-green-400" />}
            footer={footerButtons}
            maxWidth="sm:max-w-xl"
        >
            <div className="space-y-4">
                {/* Existing List */}
                {customMemoryStrategies.length > 0 && !editingId && (
                    <div className="bg-black/20 p-3 rounded border border-white/10 mb-4 max-h-40 overflow-y-auto custom-scrollbar">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Your Strategies</label>
                        <ul className="space-y-2">
                            {customMemoryStrategies.map(s => (
                                <li key={s.id} className="flex justify-between items-center bg-white/5 p-2 rounded text-sm">
                                    <span className="text-gray-200">{s.label}</span>
                                    <div className="flex items-center space-x-1">
                                        <button onClick={() => handleEdit(s)} className="text-blue-400 hover:text-blue-300 p-1" title="Edit"><PencilIcon className="w-3.5 h-3.5"/></button>
                                        <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300 p-1" title="Delete"><TrashIcon className="w-3.5 h-3.5"/></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Form */}
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Strategy Name (Label)</label>
                        <input 
                            type="text" 
                            value={label} 
                            onChange={e => setLabel(e.target.value)} 
                            placeholder="e.g. Code Assistant"
                            className="w-full p-2 aurora-input text-sm focus:border-green-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Description (Optional)</label>
                        <input 
                            type="text" 
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                            placeholder="Short description for the dropdown..."
                            className="w-full p-2 aurora-input text-sm focus:border-green-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">System Mandate (Instruction)</label>
                        <p className="text-[10px] text-gray-500 mb-2">This instruction is injected into the prompt to tell the model HOW to use the memory search tool.</p>
                        <textarea 
                            value={systemMandate} 
                            onChange={e => setSystemMandate(e.target.value)} 
                            placeholder="e.g. You MUST use 'search_ideal_companion_responses' to find similar code snippets..."
                            className="w-full p-2 aurora-textarea text-sm h-32 resize-none focus:border-green-500 font-mono"
                        />
                    </div>
                </div>
            </div>
        </BaseModal>
    );
});

export default CustomStrategyModal;