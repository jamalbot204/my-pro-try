import React, { useState, useEffect, memo, useCallback } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore.ts';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';
import { CloseIcon, InfoIcon } from '../common/Icons.tsx';
import useAutoResizeTextarea from '../../hooks/useAutoResizeTextarea.ts';
import { useTranslation } from '../../hooks/useTranslation.ts';

const CharacterContextualInfoModal: React.FC = memo(() => {
  const { saveContextualInfo } = useCharacterStore();
  const { isContextualInfoModalOpen, editingCharacterForContextualInfo, closeCharacterContextualInfoModal } = useSettingsUI();
  const { t } = useTranslation();
  
  const [infoText, setInfoText] = useState('');
  const [areButtonsDisabled, setAreButtonsDisabled] = useState(true);
  const textareaRef = useAutoResizeTextarea<HTMLTextAreaElement>(infoText, 250);

  useEffect(() => {
    if (isContextualInfoModalOpen) {
        setAreButtonsDisabled(true);
        const timerId = setTimeout(() => {
            setAreButtonsDisabled(false);
        }, 500);

        if (editingCharacterForContextualInfo) {
            setInfoText(editingCharacterForContextualInfo.contextualInfo || '');
        }
        return () => clearTimeout(timerId);
    }
  }, [isContextualInfoModalOpen, editingCharacterForContextualInfo]);

  useEffect(() => {
    if (isContextualInfoModalOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isContextualInfoModalOpen, textareaRef]);

  const handleSave = useCallback(() => {
    if (!editingCharacterForContextualInfo) return;
    saveContextualInfo(editingCharacterForContextualInfo.id, infoText);
    closeCharacterContextualInfoModal();
  }, [editingCharacterForContextualInfo, saveContextualInfo, infoText, closeCharacterContextualInfoModal]);
  
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInfoText(e.target.value);
  }, []);

  if (!isContextualInfoModalOpen || !editingCharacterForContextualInfo) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contextual-info-modal-title"
        onClick={closeCharacterContextualInfoModal}
    >
      <div className="aurora-panel p-6 rounded-lg shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col text-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 id="contextual-info-modal-title" className="text-xl font-semibold flex items-center">
            <InfoIcon className="w-5 h-5 mr-3 text-pink-400" />
            {t.contextualInfoFor} <span className="text-pink-300 ml-2">{editingCharacterForContextualInfo.name}</span>
          </h2>
          <button onClick={closeCharacterContextualInfoModal} disabled={areButtonsDisabled} className="p-1 text-gray-400 rounded-full transition-all hover:text-gray-100 hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.5)] disabled:opacity-60" aria-label={t.close}><CloseIcon /></button>
        </div>
        
        {/* Editor Card - Pink */}
        <div className="relative p-4 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-pink-500 bg-gradient-to-r from-pink-500/5 to-transparent flex-grow flex flex-col min-h-0 mb-4">
            <p className="text-xs text-gray-400 mb-3">
                {t.contextualInfoDesc}
            </p>
            <textarea
                ref={textareaRef}
                placeholder={t.contextualPromptPlaceholder}
                value={infoText}
                onChange={handleTextChange}
                rows={8}
                className="w-full p-2.5 aurora-textarea bg-black/20 border-pink-500/20 focus:border-pink-500 hide-scrollbar resize-y flex-grow"
                style={{ minHeight: '150px' }}
                aria-label={`Contextual information for ${editingCharacterForContextualInfo.name}`}
            />
        </div>

        <div className="flex justify-end space-x-3 flex-shrink-0">
          <button onClick={closeCharacterContextualInfoModal} disabled={areButtonsDisabled} className="px-4 py-2 text-sm text-gray-300 bg-white/5 rounded-md transition-shadow hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)] disabled:opacity-60">{t.cancel}</button>
          <button onClick={handleSave} disabled={areButtonsDisabled} className="px-4 py-2 text-sm bg-[var(--aurora-accent-primary)] text-white rounded-md transition-shadow hover:shadow-[0_0_12px_2px_rgba(90,98,245,0.6)] disabled:opacity-60">
            {t.saveInfo}
          </button>
        </div>
      </div>
    </div>
  );
});

export default CharacterContextualInfoModal;