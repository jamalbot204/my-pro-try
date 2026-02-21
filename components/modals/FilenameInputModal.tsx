import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { CheckIcon, CloseIcon as CancelIcon, ArrowDownTrayIcon, PencilIcon } from '../common/Icons.tsx';

interface FilenameInputModalProps {
  isOpen: boolean;
  title: string;
  defaultFilename: string;
  promptMessage: string;
  onSubmit: (filename: string) => void;
  onClose: () => void;
}

const FilenameInputModal: React.FC<FilenameInputModalProps> = memo(({
  isOpen,
  title,
  defaultFilename,
  promptMessage,
  onSubmit,
  onClose,
}) => {
  const [currentFilename, setCurrentFilename] = useState(defaultFilename);
  const [areButtonsDisabled, setAreButtonsDisabled] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAreButtonsDisabled(true);
      const timerId = setTimeout(() => {
        setAreButtonsDisabled(false);
      }, 500);

      setCurrentFilename(defaultFilename);
      setTimeout(() => inputRef.current?.focus(), 100);

      return () => clearTimeout(timerId);
    }
  }, [isOpen, defaultFilename]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(currentFilename.trim() || defaultFilename);
  }, [onSubmit, currentFilename, defaultFilename]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentFilename(e.target.value);
  }, []);

  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="filename-input-modal-title"
        onClick={onClose}
    >
      <div 
        className="aurora-panel p-6 rounded-lg shadow-2xl w-full sm:max-w-md max-h-[90vh] flex flex-col text-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="filename-input-modal-title" className="text-lg font-semibold text-gray-100 flex items-center">
            <ArrowDownTrayIcon className="w-5 h-5 mr-3 text-sky-400" />
            {title}
          </h2>
          <button
            onClick={onClose}
            disabled={areButtonsDisabled}
            className="text-gray-400 p-1 rounded-full transition-shadow hover:text-gray-100 hover:shadow-[0_0_10px_1px_rgba(255,255,255,0.2)] disabled:opacity-60"
            aria-label="Close filename input"
          >
            <CancelIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
            {/* Input Card - Sky Blue */}
            <div className="relative p-4 mb-6 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-sky-500 bg-gradient-to-r from-sky-500/5 to-transparent">
                <label htmlFor="filename-input" className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                    <PencilIcon className="w-3.5 h-3.5 mr-2 text-sky-400" />
                    {promptMessage}
                </label>
                <input
                    ref={inputRef}
                    id="filename-input"
                    type="text"
                    value={currentFilename}
                    onChange={handleInputChange}
                    className="w-full p-2.5 aurora-input border-sky-500/30 focus:border-sky-500"
                    aria-label={title}
                    placeholder="Enter filename"
                />
            </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={areButtonsDisabled}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 rounded-md transition-shadow hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)] flex items-center disabled:opacity-60"
            >
              <CancelIcon className="w-4 h-4 mr-1.5" /> Cancel
            </button>
            <button
              type="submit"
              disabled={areButtonsDisabled || !currentFilename.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--aurora-accent-primary)] rounded-md transition-shadow hover:shadow-[0_0_12px_2px_rgba(90,98,245,0.6)] flex items-center disabled:opacity-50"
            >
                <CheckIcon className="w-4 h-4 mr-1.5" /> Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default FilenameInputModal;