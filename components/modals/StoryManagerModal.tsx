
import React, { useState, useEffect, useCallback, memo } from 'react';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';
import { useArchiverStore } from '../../store/useArchiverStore.ts';
import { useActiveChatStore } from '../../store/useActiveChatStore.ts';
import { useConfirmationUI } from '../../store/ui/useConfirmationUI.ts'; // ADDED
import { ArchivedChapter } from '../../types.ts';
import { ArchiveBoxIcon, TrashIcon, PencilIcon, GripVerticalIcon, PlusIcon } from '../common/Icons.tsx';
import BaseModal from '../common/BaseModal.tsx';
import useAutoResizeTextarea from '../../hooks/useAutoResizeTextarea.ts';

const ChapterItem: React.FC<{
    chapter: ArchivedChapter;
    index: number;
    onEdit: (index: number) => void;
    onDelete: (index: number) => void;
    onMove: (index: number, direction: 'up' | 'down') => void;
    isFirst: boolean;
    isLast: boolean;
}> = memo(({ chapter, index, onEdit, onDelete, onMove, isFirst, isLast }) => {
    return (
        <div className="relative p-3 mb-3 rounded-md bg-black/20 border border-white/10 flex flex-col gap-2 group transition-all hover:bg-white/5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="text-gray-500 cursor-grab active:cursor-grabbing">
                        <GripVerticalIcon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                            Chapter {chapter.chapterNumber ?? (index + 1)}
                        </span>
                        <span className="text-sm font-semibold text-gray-200">{chapter.title}</span>
                        <span className="text-[10px] text-gray-500">{chapter.time_range}</span>
                    </div>
                </div>
                <div className="flex items-center space-x-1">
                    <button onClick={() => onMove(index, 'up')} disabled={isFirst} className="p-1 text-gray-500 hover:text-white disabled:opacity-30">▲</button>
                    <button onClick={() => onMove(index, 'down')} disabled={isLast} className="p-1 text-gray-500 hover:text-white disabled:opacity-30">▼</button>
                    <button onClick={() => onEdit(index)} className="p-1.5 text-gray-400 hover:text-indigo-300 bg-white/5 rounded ml-2" title="Edit"><PencilIcon className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onDelete(index)} className="p-1.5 text-gray-400 hover:text-red-400 bg-white/5 rounded ml-1" title="Delete"><TrashIcon className="w-3.5 h-3.5" /></button>
                </div>
            </div>
            <div className="text-xs text-gray-400 line-clamp-2 pl-7">
                {chapter.narrative}
            </div>
        </div>
    );
});

const ChapterEditor: React.FC<{
    chapter: ArchivedChapter;
    onSave: (c: ArchivedChapter) => void;
    onCancel: () => void;
}> = memo(({ chapter, onSave, onCancel }) => {
    const [title, setTitle] = useState(chapter.title);
    const [timeRange, setTimeRange] = useState(chapter.time_range);
    const [narrative, setNarrative] = useState(chapter.narrative);
    const [quotes, setQuotes] = useState(chapter.key_quotes.join('\n'));
    
    const narrativeRef = useAutoResizeTextarea<HTMLTextAreaElement>(narrative);

    const handleSave = () => {
        onSave({
            ...chapter,
            title,
            time_range: timeRange,
            narrative,
            key_quotes: quotes.split('\n').filter(q => q.trim())
        });
    };

    return (
        <div className="space-y-4 p-1">
            <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Title</label>
                <input 
                    type="text" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    className="w-full p-2 aurora-input text-sm"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Time Range</label>
                <input 
                    type="text" 
                    value={timeRange} 
                    onChange={e => setTimeRange(e.target.value)} 
                    className="w-full p-2 aurora-input text-sm"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Narrative Summary</label>
                <textarea 
                    ref={narrativeRef}
                    value={narrative} 
                    onChange={e => setNarrative(e.target.value)} 
                    className="w-full p-2 aurora-textarea text-sm min-h-[100px]"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Key Quotes (One per line)</label>
                <textarea 
                    value={quotes} 
                    onChange={e => setQuotes(e.target.value)} 
                    className="w-full p-2 aurora-textarea text-sm h-24"
                />
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <button onClick={onCancel} className="px-3 py-1.5 text-xs text-gray-300 bg-white/5 rounded">Cancel</button>
                <button onClick={handleSave} className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded">Save</button>
            </div>
        </div>
    );
});

const StoryManagerModal: React.FC = memo(() => {
    const { isStoryManagerModalOpen, closeStoryManagerModal } = useSettingsUI();
    const { reorderChapters } = useArchiverStore();
    const { requestDeleteChapterConfirmation } = useConfirmationUI(); // ADDED
    
    const { currentChatSession } = useActiveChatStore();
    const [localChapters, setLocalChapters] = useState<ArchivedChapter[]>([]);
    
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    // Sync from active session to local state
    useEffect(() => {
        if (isStoryManagerModalOpen && currentChatSession) {
            setLocalChapters(currentChatSession.settings.archivedChapters || []);
        }
    }, [isStoryManagerModalOpen, currentChatSession]);

    // Helpers to persist changes back to global stores
    const persistChanges = useCallback(async (newChapters: ArchivedChapter[]) => {
        setLocalChapters(newChapters);
        await reorderChapters(newChapters);
    }, [reorderChapters]);

    const handleMove = useCallback((index: number, direction: 'up' | 'down') => {
        const newChapters = [...localChapters];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < newChapters.length) {
            [newChapters[index], newChapters[targetIndex]] = [newChapters[targetIndex], newChapters[index]];
            persistChanges(newChapters);
        }
    }, [localChapters, persistChanges]);

    const handleDelete = useCallback((index: number) => {
        // Use global confirmation UI instead of window.confirm
        requestDeleteChapterConfirmation(index);
    }, [requestDeleteChapterConfirmation]);

    const handleSaveEdit = useCallback(async (updatedChapter: ArchivedChapter) => {
        if (editingIndex === null) return;
        const newChapters = [...localChapters];
        newChapters[editingIndex] = updatedChapter;
        await persistChanges(newChapters);
        setEditingIndex(null);
    }, [localChapters, editingIndex, persistChanges]);

    const handleAddManual = useCallback(async () => {
        const newChapter: ArchivedChapter = {
            chapterNumber: localChapters.length + 1,
            title: "New Chapter",
            time_range: "Unknown",
            narrative: "",
            key_quotes: []
        };
        const newChapters = [...localChapters, newChapter];
        await persistChanges(newChapters);
        setEditingIndex(newChapters.length - 1);
    }, [localChapters, persistChanges]);

    const footerButtons = (
        <button onClick={closeStoryManagerModal} className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 rounded hover:bg-white/10">Close</button>
    );

    return (
        <BaseModal
            isOpen={isStoryManagerModalOpen}
            onClose={closeStoryManagerModal}
            title="Story Manager (Archived Chapters)"
            headerIcon={<ArchiveBoxIcon className="w-5 h-5 text-indigo-400" />}
            footer={footerButtons}
            maxWidth="sm:max-w-2xl"
        >
            <div className="space-y-4">
                <div className="bg-indigo-900/20 p-3 rounded border border-indigo-500/30 text-indigo-200 text-sm mb-4">
                    <p>Manage the story context injected into the AI. Chapters listed here are sent with every message.</p>
                </div>

                <div className="flex justify-end mb-2">
                    <button onClick={handleAddManual} className="flex items-center px-2 py-1 text-xs font-bold text-indigo-300 bg-indigo-500/10 rounded hover:bg-indigo-500/20">
                        <PlusIcon className="w-3.5 h-3.5 mr-1" /> Add Manual Chapter
                    </button>
                </div>

                {editingIndex !== null ? (
                    <ChapterEditor 
                        chapter={localChapters[editingIndex]} 
                        onSave={handleSaveEdit} 
                        onCancel={() => setEditingIndex(null)} 
                    />
                ) : (
                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {localChapters.length === 0 && (
                            <p className="text-center text-gray-500 py-10 italic">No chapters archived yet.</p>
                        )}
                        {localChapters.map((chapter, idx) => (
                            <ChapterItem
                                key={idx}
                                chapter={chapter}
                                index={idx}
                                onEdit={setEditingIndex}
                                onDelete={handleDelete}
                                onMove={handleMove}
                                isFirst={idx === 0}
                                isLast={idx === localChapters.length - 1}
                            />
                        ))}
                    </div>
                )}
            </div>
        </BaseModal>
    );
});

export default StoryManagerModal;
