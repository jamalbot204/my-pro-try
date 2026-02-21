import React, { memo, useState, useEffect } from 'react';
import { CloseIcon, KeyIcon } from '../common/Icons.tsx';
import ApiKeyManager from '../settings/ApiKeyManager.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = memo(({ isOpen, onClose }) => {
  const [areButtonsDisabled, setAreButtonsDisabled] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      setAreButtonsDisabled(true);
      const timerId = setTimeout(() => {
        setAreButtonsDisabled(false);
      }, 500);
      return () => clearTimeout(timerId);
    }
  }, [isOpen]);
  
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-md" 
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-key-modal-title"
    >
      <div 
        className="aurora-panel p-6 rounded-lg shadow-2xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col text-gray-200" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 id="api-key-modal-title" className="text-xl font-semibold text-gray-100 flex items-center">
            <KeyIcon className="w-5 h-5 mr-3 text-yellow-400" />
            {t.apiKeyTitle}
          </h2>
          <button
            onClick={onClose}
            disabled={areButtonsDisabled}
            className="text-gray-400 p-1 rounded-full transition-shadow hover:text-gray-100 hover:shadow-[0_0_10px_1px_rgba(255,255,255,0.2)] disabled:opacity-60"
            aria-label={t.close}
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-grow min-h-0 overflow-auto pr-2 -mr-2">
          <fieldset disabled={areButtonsDisabled}>
            <p className="text-sm text-gray-400 mb-4">
                {t.apiKeyDesc}
            </p>
            <ApiKeyManager />
          </fieldset>
        </div>

        <div className="mt-8 flex justify-end flex-shrink-0">
          <button 
            onClick={onClose} 
            type="button" 
            disabled={areButtonsDisabled}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 rounded-md transition-shadow hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)] disabled:opacity-60"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
});

export default ApiKeyModal;