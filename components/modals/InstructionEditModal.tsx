import React, { useState, useEffect, memo, useCallback } from 'react';
import { UserIcon, PencilIcon } from '../common/Icons.tsx';
import useAutoResizeTextarea from '../../hooks/useAutoResizeTextarea.ts';
import { useTranslation } from '../../hooks/useTranslation.ts';
import BaseModal from '../common/BaseModal.tsx';

interface InstructionEditModalProps {
  isOpen: boolean;
  title: string;
  currentInstruction: string;
  onApply: (newInstruction: string) => void;
  onClose: () => void;
}

const InstructionEditModal: React.FC<InstructionEditModalProps> = memo(({
  isOpen,
  title,
  currentInstruction,
  onApply,
  onClose,
}) => {
  const { t } = useTranslation();
  const [editText, setEditText] = useState('');
  const textareaRef = useAutoResizeTextarea<HTMLTextAreaElement>(editText, 400);

  useEffect(() => {
    if (isOpen) {
      setEditText(currentInstruction);
    }
  }, [isOpen, currentInstruction]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
        setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, textareaRef]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditText(e.target.value);
  }, []);

  const handleApplyClick = useCallback(() => {
    onApply(editText);
  }, [onApply, editText]);
  
  const footerButtons = (
    <>
        <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 rounded-md hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)]"
        >
            {t.cancel}
        </button>
        <button
            onClick={handleApplyClick}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--aurora-accent-primary)] rounded-md hover:shadow-[0_0_12px_2px_rgba(90,98,245,0.6)]"
        >
            {t.apply}
        </button>
    </>
  );

  return (
    <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        headerIcon={<UserIcon className="w-5 h-5 text-purple-400" />}
        footer={footerButtons}
        maxWidth="sm:max-w-2xl"
    >
        <div className="relative p-1 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-500/5 to-transparent flex-grow flex flex-col min-h-0">
            <textarea
                ref={textareaRef}
                value={editText}
                onChange={handleTextChange}
                className="w-full h-full p-4 bg-transparent resize-none hide-scrollbar text-sm sm:text-base leading-relaxed focus:outline-none placeholder-gray-500"
                placeholder={t.enterMessageContent}
                style={{ minHeight: '300px' }} 
                aria-label="Instruction content editor"
            />
            <div className="absolute bottom-2 right-2 pointer-events-none opacity-50">
                <PencilIcon className="w-4 h-4 text-purple-400" />
            </div>
        </div>
    </BaseModal>
  );
});

export default InstructionEditModal;