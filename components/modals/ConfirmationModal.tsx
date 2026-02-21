import React, { memo, useState, useEffect } from 'react';
import { CloseIcon, ShieldCheckIcon, InfoIcon } from '../common/Icons.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = memo(({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isDestructive = false,
}) => {
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

  const accentColor = isDestructive ? 'red' : 'blue';
  const BorderClass = isDestructive ? 'border-l-red-500' : 'border-l-blue-500';
  const BgGradient = isDestructive ? 'from-red-500/5' : 'from-blue-500/5';
  const IconComponent = isDestructive ? ShieldCheckIcon : InfoIcon;
  const IconColor = isDestructive ? 'text-red-400' : 'text-blue-400';

  const confirmButtonBaseClass = "px-4 py-2.5 text-sm font-medium rounded-md transition-shadow flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-60";
  const confirmButtonClass = isDestructive
    ? `${confirmButtonBaseClass} text-white bg-red-600/80 focus:ring-red-500 hover:shadow-[0_0_12px_2px_rgba(239,68,68,0.6)]`
    : `${confirmButtonBaseClass} text-white bg-[var(--aurora-accent-primary)] focus:ring-blue-500 hover:shadow-[0_0_12px_2px_rgba(90,98,245,0.6)]`;
  const cancelButtonClass = `${confirmButtonBaseClass} text-gray-300 bg-white/5 focus:ring-gray-500 hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]`;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      onClick={onCancel}
    >
      <div className="aurora-panel p-6 rounded-lg shadow-2xl w-full sm:max-w-md max-h-[90vh] flex flex-col text-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 id="confirmation-modal-title" className="text-xl font-semibold text-gray-100 flex items-center">
             <IconComponent className={`w-6 h-6 mr-3 ${IconColor}`} />
             {title}
          </h2>
          <button
            onClick={onCancel}
            disabled={areButtonsDisabled}
            className="text-gray-400 p-1 rounded-full transition-shadow hover:text-gray-100 hover:shadow-[0_0_10px_1px_rgba(255,255,255,0.2)] disabled:opacity-60"
            aria-label={t.close}
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className={`relative p-4 mb-6 rounded-r-xl rounded-l-md border border-white/10 border-l-4 ${BorderClass} bg-gradient-to-r ${BgGradient} to-transparent`}>
            <div className="text-sm text-gray-200 whitespace-pre-line leading-relaxed">
            {message}
            </div>
        </div>

        <div className="mt-auto flex justify-end space-x-3">
          <button
            onClick={onCancel}
            type="button"
            disabled={areButtonsDisabled}
            className={cancelButtonClass}
          >
            {cancelText || t.cancel}
          </button>
          <button
            onClick={onConfirm}
            type="button"
            disabled={areButtonsDisabled}
            className={confirmButtonClass}
          >
            {confirmText || t.confirm}
          </button>
        </div>
      </div>
    </div>
  );
});

export default ConfirmationModal;