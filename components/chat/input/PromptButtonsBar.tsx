
import React, { memo } from 'react';
import { usePromptButtonStore } from '../../../store/usePromptButtonStore.ts';
import { useSettingsUI } from '../../../store/ui/useSettingsUI.ts';
import { CogIcon, SendIcon, PlusIcon, PencilIcon } from '../../common/Icons.tsx';
import { useShallow } from 'zustand/react/shallow';

interface PromptButtonsBarProps {
    onInsert: (text: string) => void;
    onSend: (text: string) => void;
}

const PromptButtonsBar: React.FC<PromptButtonsBarProps> = memo(({ onInsert, onSend }) => {
    const { promptButtons } = usePromptButtonStore(useShallow(state => ({
        promptButtons: state.promptButtons
    })));
    const { openPromptButtonManager } = useSettingsUI();

    return (
        <div className="flex items-center px-3 py-2 bg-black/20 border-b border-white/5 gap-2 overflow-x-auto hide-scrollbar rounded-t-[var(--aurora-input-radius)]">
            {promptButtons.length === 0 && (
                <button 
                    onClick={openPromptButtonManager}
                    className="text-[10px] text-gray-500 hover:text-gray-300 flex items-center px-2 py-1 rounded hover:bg-white/5 transition-colors whitespace-nowrap"
                >
                    <PlusIcon className="w-3 h-3 mr-1" />
                    Add Quick Action
                </button>
            )}
            
            {promptButtons.map(btn => (
                <button
                    key={btn.id}
                    onClick={() => btn.action === 'send' ? onSend(btn.content) : onInsert(btn.content)}
                    className={`
                        flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap shadow-sm border
                        ${btn.action === 'send' 
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40' 
                            : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/40'
                        }
                    `}
                    title={btn.content}
                >
                    {btn.action === 'send' ? <SendIcon className="w-3 h-3 mr-1.5 opacity-70" /> : <PencilIcon className="w-3 h-3 mr-1.5 opacity-70" />}
                    {btn.label}
                </button>
            ))}

            <div className="flex-grow"></div>

            <button 
                onClick={openPromptButtonManager}
                className="p-1.5 text-gray-500 hover:text-white rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
                title="Manage Prompt Buttons"
            >
                <CogIcon className="w-3.5 h-3.5" />
            </button>
        </div>
    );
});

export default PromptButtonsBar;
