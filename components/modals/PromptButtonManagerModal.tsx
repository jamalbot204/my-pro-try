
import React, { useState, useCallback, memo, useRef } from 'react';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';
import { usePromptButtonStore } from '../../store/usePromptButtonStore.ts';
import { useConfirmationUI } from '../../store/ui/useConfirmationUI.ts'; // ADDED
import { PromptButton } from '../../types.ts';
import { WrenchScrewdriverIcon, PlusIcon, TrashIcon, PencilIcon, GripVerticalIcon, CheckIcon, CloseIcon } from '../common/Icons.tsx';
import BaseModal from '../common/BaseModal.tsx';

const PromptButtonManagerModal: React.FC = memo(() => {
    const { isPromptButtonManagerOpen, closePromptButtonManager } = useSettingsUI();
    const { promptButtons, addPromptButton, updatePromptButton, reorderPromptButtons } = usePromptButtonStore();
    const { requestDeletePromptButtonConfirmation } = useConfirmationUI(); // ADDED

    const [label, setLabel] = useState('');
    const [content, setContent] = useState('');
    const [action, setAction] = useState<'insert' | 'send'>('insert');
    const [editingId, setEditingId] = useState<string | null>(null);

    // Drag State
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleSave = useCallback(async () => {
        if (!label.trim() || !content.trim()) return;

        if (editingId) {
            await updatePromptButton(editingId, { label, content, action });
        } else {
            await addPromptButton(label, content, action);
        }
        
        // Reset form
        setLabel('');
        setContent('');
        setAction('insert');
        setEditingId(null);
    }, [label, content, action, editingId, addPromptButton, updatePromptButton]);

    const handleEdit = useCallback((btn: PromptButton) => {
        setLabel(btn.label);
        setContent(btn.content);
        setAction(btn.action);
        setEditingId(btn.id);
    }, []);

    const handleCancelEdit = useCallback(() => {
        setLabel('');
        setContent('');
        setAction('insert');
        setEditingId(null);
    }, []);

    const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        
        // Request confirmation via global modal system instead of direct delete
        requestDeletePromptButtonConfirmation(id);
        
        // We don't clear edit state here immediately. 
        // If the item is deleted by ModalManager, it will disappear from the list.
        // We could clear it if editingId === id, but waiting for deletion is safer UX.
    }, [requestDeletePromptButtonConfirmation]);

    // Drag Handlers
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        dragItem.current = position;
        e.dataTransfer.effectAllowed = 'move';
        // Set the drag image to the parent row so it looks like we are dragging the whole item
        if (e.currentTarget.parentElement) {
            e.dataTransfer.setDragImage(e.currentTarget.parentElement, 20, 20);
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        dragOverItem.current = position;
        if (dragItem.current !== null && dragItem.current !== position) {
            const newOrder = [...promptButtons];
            const draggedItem = newOrder[dragItem.current];
            newOrder.splice(dragItem.current, 1);
            newOrder.splice(position, 0, draggedItem);
            dragItem.current = position;
            reorderPromptButtons(newOrder); // Optimistic Update
        }
    };

    const handleDragEnd = () => {
        dragItem.current = null;
        dragOverItem.current = null;
    };

    const footerButtons = (
        <button onClick={closePromptButtonManager} className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 rounded hover:bg-white/10">Close</button>
    );

    return (
        <BaseModal
            isOpen={isPromptButtonManagerOpen}
            onClose={closePromptButtonManager}
            title="Quick Action Buttons"
            headerIcon={<WrenchScrewdriverIcon className="w-5 h-5 text-indigo-400" />}
            footer={footerButtons}
            maxWidth="sm:max-w-xl"
        >
            <div className="space-y-4">
                {/* List */}
                <div className="bg-black/20 p-2 rounded border border-white/10 max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                    {promptButtons.length === 0 && <p className="text-center text-gray-500 py-4 italic text-xs">No buttons created yet.</p>}
                    {promptButtons.map((btn, idx) => (
                        <div 
                            key={btn.id}
                            onDragEnter={(e) => handleDragEnter(e, idx)}
                            onDragOver={(e) => e.preventDefault()}
                            className="flex items-center p-2 bg-white/5 rounded hover:bg-white/10 group"
                        >
                            <div 
                                className="text-gray-600 mr-2 cursor-grab active:cursor-grabbing p-1"
                                draggable
                                onDragStart={(e) => handleDragStart(e, idx)}
                                onDragEnd={handleDragEnd}
                            >
                                <GripVerticalIcon className="w-4 h-4" />
                            </div>
                            
                            <div className="flex-grow min-w-0 mr-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-200">{btn.label}</span>
                                    <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${btn.action === 'send' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-900/20' : 'text-indigo-400 border-indigo-500/30 bg-indigo-900/20'}`}>
                                        {btn.action}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 truncate">{btn.content}</p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => handleEdit(btn)} 
                                    className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded"
                                >
                                    <PencilIcon className="w-3.5 h-3.5"/>
                                </button>
                                <button 
                                    onClick={(e) => handleDelete(e, btn.id)} 
                                    className="p-1.5 text-red-400 hover:bg-red-500/20 rounded"
                                >
                                    <TrashIcon className="w-3.5 h-3.5"/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Editor */}
                <div className="bg-black/30 p-4 rounded border border-white/10 relative">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                        {editingId ? <PencilIcon className="w-3 h-3 mr-1.5 text-blue-400"/> : <PlusIcon className="w-3 h-3 mr-1.5 text-green-400"/>}
                        {editingId ? "Edit Button" : "Create New Button"}
                    </h4>
                    
                    <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="col-span-2">
                            <label className="block text-[10px] text-gray-500 mb-1">Label</label>
                            <input 
                                type="text" 
                                value={label} 
                                onChange={e => setLabel(e.target.value)} 
                                placeholder="e.g. Fix Grammar"
                                className="w-full p-2 aurora-input text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-gray-500 mb-1">Type</label>
                            <select 
                                value={action} 
                                onChange={e => setAction(e.target.value as any)}
                                className="w-full p-2 aurora-select text-sm"
                            >
                                <option value="insert">Insert Text</option>
                                <option value="send">Send Immediately</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="mb-3">
                        <label className="block text-[10px] text-gray-500 mb-1">Content / Prompt</label>
                        <textarea 
                            value={content} 
                            onChange={e => setContent(e.target.value)} 
                            placeholder="e.g. Please fix the grammar in the following text:"
                            className="w-full p-2 aurora-textarea text-sm h-20 resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        {editingId && <button onClick={handleCancelEdit} className="px-3 py-1.5 text-xs text-gray-400 bg-white/5 rounded hover:bg-white/10">Cancel</button>}
                        <button 
                            onClick={handleSave} 
                            disabled={!label.trim() || !content.trim()}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-500 flex items-center disabled:opacity-50"
                        >
                            <CheckIcon className="w-3.5 h-3.5 mr-1.5" />
                            {editingId ? "Update" : "Create"}
                        </button>
                    </div>
                </div>
            </div>
        </BaseModal>
    );
});

export default PromptButtonManagerModal;
