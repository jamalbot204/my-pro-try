
import React, { memo, useRef, useCallback, useState } from 'react';
import { useActiveChatStore } from '../../../store/useActiveChatStore.ts';
import { useCharacterStore } from '../../../store/useCharacterStore.ts';
import { useAutoSendStore } from '../../../store/useAutoSendStore.ts';
import { AICharacter } from '../../../types.ts';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { useShallow } from 'zustand/react/shallow';

interface CharacterBarProps {
    isReorderingActive: boolean;
    onCharacterClick: (charId: string) => void;
    isInfoInputModeActive: boolean;
    disabled: boolean;
    isFileProcessing: boolean;
}

const CharacterBar: React.FC<CharacterBarProps> = memo(({ isReorderingActive, onCharacterClick, isInfoInputModeActive, disabled, isFileProcessing }) => {
    const { t } = useTranslation();
    const { reorderCharacters } = useCharacterStore();
    const { isAutoSendingActive } = useAutoSendStore();
    
    // Optimized selector: only get characters and session ID
    const { characters, sessionId } = useActiveChatStore(useShallow(state => ({
        characters: state.currentChatSession?.aiCharacters || [],
        sessionId: state.currentChatSession?.id
    })));

    const draggedCharRef = useRef<AICharacter | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Drag and Drop Logic
    const handleDragStart = useCallback((e: React.DragEvent<HTMLButtonElement>, char: AICharacter) => {
        if (!isReorderingActive) return;
        draggedCharRef.current = char;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', char.id);
        e.currentTarget.classList.add('opacity-50', 'ring-2', 'ring-blue-500');
    }, [isReorderingActive]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement | HTMLButtonElement>) => {
        e.preventDefault();
        if (!isReorderingActive || !draggedCharRef.current) return;
        e.dataTransfer.dropEffect = 'move';
    }, [isReorderingActive]);

    const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement | HTMLButtonElement>) => {
        e.preventDefault();
        if (!isReorderingActive || !draggedCharRef.current || !sessionId) return;
        const targetCharId = (e.target as HTMLElement).closest('button[data-char-id]')?.getAttribute('data-char-id');
        if (!targetCharId) return;
        
        const draggedChar = draggedCharRef.current;
        const currentChars = [...characters];
        const draggedIndex = currentChars.findIndex(c => c.id === draggedChar.id);
        const targetIndex = currentChars.findIndex(c => c.id === targetCharId);
        
        if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;
        
        const [removed] = currentChars.splice(draggedIndex, 1);
        currentChars.splice(targetIndex, 0, removed);
        
        // Optimistically update store via reorderCharacters which updates both local state and DB
        await reorderCharacters(currentChars);
        draggedCharRef.current = null;
    }, [isReorderingActive, sessionId, characters, reorderCharacters]);

    const handleDragEnd = useCallback((e: React.DragEvent<HTMLButtonElement>) => { 
        if (!isReorderingActive) return; 
        e.currentTarget.classList.remove('opacity-50', 'ring-2', 'ring-blue-500'); 
    }, [isReorderingActive]);

    if (characters.length === 0) return null;

    const isGlobalDisabled = disabled || isFileProcessing || isAutoSendingActive;

    return (
        <div 
            ref={containerRef} 
            className="p-3 border-b border-white/10 bg-black/10" 
            onDragOver={handleDragOver} 
            onDrop={handleDrop}
        >
            <p className="text-[10px] uppercase font-bold text-gray-500 mb-2 tracking-wider">
                {isReorderingActive ? t.dragToReorder : (isInfoInputModeActive ? t.selectCharToSpeak : t.selectCharToSpeak)}
            </p>
            <div className="flex flex-wrap gap-2">
                {characters.map((char) => (
                    <button 
                        key={char.id} 
                        data-char-id={char.id} 
                        onClick={() => !isReorderingActive && onCharacterClick(char.id)} 
                        disabled={isGlobalDisabled || (isReorderingActive && !!draggedCharRef.current && draggedCharRef.current.id === char.id)} 
                        draggable={isReorderingActive} 
                        onDragStart={(e) => handleDragStart(e, char)} 
                        onDragEnd={handleDragEnd} 
                        className={`px-3 py-1.5 text-xs font-medium bg-[var(--aurora-accent-secondary)] text-white rounded-lg disabled:opacity-50 transition-all duration-200 ease-out hover:scale-105 hover:shadow-[0_0_10px_2px_rgba(156,51,245,0.4)] ${isReorderingActive ? 'cursor-grab hover:ring-2 hover:ring-purple-400' : 'disabled:cursor-not-allowed'} ${draggedCharRef.current?.id === char.id ? 'opacity-50 ring-2 ring-blue-500' : ''}`}
                    >
                        {char.name}
                    </button>
                ))}
            </div>
        </div>
    );
});

export default CharacterBar;
