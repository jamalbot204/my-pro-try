import React, { useState, useEffect, memo, useCallback } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore.ts';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';
import { useActiveChatStore } from '../../store/useActiveChatStore.ts';
import { AICharacter } from '../../types.ts';
import { CloseIcon, PencilIcon, TrashIcon, InfoIcon, UsersIcon } from '../common/Icons.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';

const CharacterManagementModal: React.FC = memo(() => {
  const { currentChatSession } = useActiveChatStore();
  const { addCharacter, editCharacter, deleteCharacter } = useCharacterStore();
  const { isCharacterManagementModalOpen, closeCharacterManagementModal, openCharacterContextualInfoModal } = useSettingsUI();
  const { t } = useTranslation();

  const [editingCharacter, setEditingCharacter] = useState<AICharacter | null>(null);
  const [newCharName, setNewCharName] = useState('');
  const [newCharInstruction, setNewCharInstruction] = useState('');
  const [areButtonsDisabled, setAreButtonsDisabled] = useState(true);

  const characters = currentChatSession?.aiCharacters || [];

  useEffect(() => {
    if (isCharacterManagementModalOpen) {
      setAreButtonsDisabled(true);
      const timerId = setTimeout(() => {
          setAreButtonsDisabled(false);
      }, 500);

      setEditingCharacter(null);
      setNewCharName('');
      setNewCharInstruction('');
      return () => clearTimeout(timerId);
    }
  }, [isCharacterManagementModalOpen]);

  const handleSave = useCallback(() => {
    if (editingCharacter) {
      editCharacter(editingCharacter.id, newCharName, newCharInstruction);
    } else {
      addCharacter(newCharName, newCharInstruction);
    }
    setNewCharName('');
    setNewCharInstruction('');
    setEditingCharacter(null);
  }, [editingCharacter, newCharName, newCharInstruction, editCharacter, addCharacter]);
  
  const startEdit = useCallback((char: AICharacter) => {
    setEditingCharacter(char);
    setNewCharName(char.name);
    setNewCharInstruction(char.systemInstruction);
  }, []);

  if (!isCharacterManagementModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-md" onClick={closeCharacterManagementModal}>
      <div className="aurora-panel p-6 rounded-lg shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col text-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-xl font-semibold flex items-center">
            <UsersIcon className="w-6 h-6 mr-3 text-fuchsia-400" />
            {t.manageCharacters}
          </h2>
          <button onClick={closeCharacterManagementModal} disabled={areButtonsDisabled} className="p-1 text-gray-400 rounded-full transition-all hover:text-gray-100 hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.5)] disabled:opacity-60" aria-label={t.close}><CloseIcon /></button>
        </div>

        <fieldset disabled={areButtonsDisabled} className="mb-6 space-y-3 overflow-y-auto pr-2 flex-grow min-h-0 custom-scrollbar">
            {characters.length === 0 && (
                <div className="p-8 text-center border-2 border-dashed border-gray-700 rounded-lg">
                    <p className="text-gray-400 italic">{t.noCharacters}</p>
                </div>
            )}
            {characters.map(char => (
                <div key={char.id} className="relative p-3 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-fuchsia-500 bg-gradient-to-r from-fuchsia-500/5 to-transparent flex justify-between items-center group transition-all hover:bg-white/5">
                    <div className="min-w-0 pr-2">
                        <p className="font-semibold text-fuchsia-200">{char.name}</p>
                        <p className="text-xs text-gray-400 truncate" title={char.systemInstruction}>{char.systemInstruction}</p>
                    </div>
                    <div className="flex space-x-1 flex-shrink-0">
                        <button onClick={() => openCharacterContextualInfoModal(char)} className="p-1.5 text-gray-400 hover:text-sky-300 bg-black/20 rounded hover:bg-sky-500/20 transition-all" title={t.contextualInfoFor}><InfoIcon className="w-4 h-4"/></button>
                        <button onClick={() => startEdit(char)} className="p-1.5 text-gray-400 hover:text-blue-300 bg-black/20 rounded hover:bg-blue-500/20 transition-all" title={t.edit}><PencilIcon className="w-4 h-4"/></button>
                        <button onClick={() => deleteCharacter(char.id)} className="p-1.5 text-gray-400 hover:text-red-300 bg-black/20 rounded hover:bg-red-500/20 transition-all" title={t.delete}><TrashIcon className="w-4 h-4"/></button>
                    </div>
                </div>
            ))}
        </fieldset>
        
        <fieldset disabled={areButtonsDisabled} className="border-t border-[var(--aurora-border)] pt-4 flex-shrink-0">
          <h3 className="text-md font-semibold text-gray-300 mb-3 flex items-center">
             <PencilIcon className="w-4 h-4 mr-2 text-fuchsia-400" />
             {editingCharacter ? t.editCharacter : t.addNewCharacter}
          </h3>
          
          <div className="space-y-3">
            <div>
                <input 
                    type="text" 
                    placeholder={t.characterName}
                    value={newCharName}
                    onChange={(e) => setNewCharName(e.target.value)}
                    className="w-full p-2.5 aurora-input border-fuchsia-500/30 focus:border-fuchsia-500"
                    aria-label={t.characterName}
                />
            </div>
            <div>
                <textarea 
                    placeholder={t.characterInstruction}
                    value={newCharInstruction}
                    onChange={(e) => setNewCharInstruction(e.target.value)}
                    rows={3}
                    className="w-full p-2.5 aurora-textarea hide-scrollbar resize-none border-fuchsia-500/30 focus:border-fuchsia-500"
                    aria-label={t.characterInstruction}
                />
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-4">
            {editingCharacter && <button onClick={() => { setEditingCharacter(null); setNewCharName(''); setNewCharInstruction('');}} className="px-4 py-2 text-sm text-gray-300 bg-white/5 rounded-md transition-shadow hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]">{t.cancelEdit}</button>}
            <button 
                onClick={handleSave} 
                disabled={!newCharName.trim() || !newCharInstruction.trim()}
                className="px-4 py-2 text-sm bg-[var(--aurora-accent-primary)] text-white rounded-md disabled:opacity-50 transition-shadow hover:shadow-[0_0_12px_2px_rgba(90,98,245,0.6)]"
            >
                {editingCharacter ? t.saveChanges : t.addCharacter}
            </button>
          </div>
        </fieldset>

        <div className="mt-6 flex justify-end flex-shrink-0 border-t border-[var(--aurora-border)] pt-4">
          <button onClick={closeCharacterManagementModal} disabled={areButtonsDisabled} className="px-4 py-2 text-sm bg-white/5 rounded-md transition-shadow hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)] disabled:opacity-60">{t.close}</button>
        </div>
      </div>
    </div>
  );
});

export default CharacterManagementModal;