
import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useActiveChatStore } from '../../store/useActiveChatStore.ts';
import { useDataStore } from '../../store/useDataStore.ts';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';
import { WrenchScrewdriverIcon, CogIcon, BrainIcon } from '../common/Icons.tsx';
import { GeminiSettings } from '../../types.ts';

const ChatToolsMenu: React.FC = memo(() => {
    const { currentChatSession, updateCurrentChatSession } = useActiveChatStore();
    const { updateSettings } = useDataStore();
    const { openActiveMemoryModal, openShadowSetupModal, openStrategySetupModal, openReasoningSetupModal, openMemorySourceModal } = useSettingsUI();
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Toggle setting helper
    const toggleSetting = useCallback(async (key: keyof GeminiSettings) => {
        if (!currentChatSession) return;
        
        const currentVal = currentChatSession.settings[key];
        const newVal = !currentVal;
        
        const newSettings = { ...currentChatSession.settings, [key]: newVal };
        
        // Optimistic update for UI responsiveness
        await updateCurrentChatSession(s => s ? ({ ...s, settings: newSettings }) : null);
        
        // Persist to DB
        await updateSettings(currentChatSession.id, newSettings);
    }, [currentChatSession, updateCurrentChatSession, updateSettings]);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current && 
                !menuRef.current.contains(event.target as Node) && 
                buttonRef.current && 
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const isAgentActive = currentChatSession?.settings.enableReasoningWorkflow ?? false;
    const isMemoryActive = currentChatSession?.settings.enableLongTermMemory ?? false;
    const isShadowActive = currentChatSession?.settings.enableShadowMode ?? false;
    const isActiveMemoryEnabled = currentChatSession?.settings.isMemoryBoxEnabled ?? false; 
    const isStrategyActive = currentChatSession?.settings.isStrategyToolEnabled ?? false; // Strategy Check

    // Positioning logic for portal
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({ opacity: 0 });

    useEffect(() => {
        if (isOpen && buttonRef.current && menuRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            // Position above the button
            const bottom = window.innerHeight - buttonRect.top + 8; // 8px spacing
            
            let style: React.CSSProperties = {
                position: 'fixed',
                bottom: bottom,
                opacity: 1,
                zIndex: 50,
            };

            // Heuristic: If button is on the right half of the screen, anchor menu to the right.
            if (buttonRect.left > window.innerWidth / 2) {
                style.right = window.innerWidth - buttonRect.right;
                style.left = 'auto';
            } else {
                style.left = buttonRect.left;
                style.right = 'auto';
            }
            
            setMenuStyle(style);
        }
    }, [isOpen]);

    if (!currentChatSession) return null;

    return (
        <>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--aurora-accent-primary)] disabled:opacity-50 ${isOpen ? 'text-[var(--aurora-accent-primary)] bg-[var(--aurora-accent-primary)]/10' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                title="Tools"
                disabled={!currentChatSession}
            >
                <WrenchScrewdriverIcon className="w-5 h-5" />
            </button>

            {isOpen && createPortal(
                <div 
                    ref={menuRef}
                    className="aurora-panel rounded-lg shadow-xl p-2 min-w-[150px] flex flex-col gap-1 border border-white/10 bg-[rgba(20,20,20,0.95)] backdrop-blur-md"
                    style={menuStyle}
                >
                    {/* Strategy Protocol */}
                    <div className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors w-full group ${isStrategyActive ? 'bg-amber-500/20 text-amber-200' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>
                        <button onClick={() => toggleSetting('isStrategyToolEnabled')} className="flex-grow text-left flex items-center">
                            <span>Protocol</span>
                        </button>
                        <div className="flex items-center">
                            <button 
                                onClick={(e) => { e.stopPropagation(); openStrategySetupModal(); setIsOpen(false); }} 
                                className={`p-1 ml-2 rounded hover:bg-white/10 ${isStrategyActive ? 'text-amber-200' : 'text-gray-500'}`}
                                title="Configure Strategic Protocol"
                            >
                                <CogIcon className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => toggleSetting('isStrategyToolEnabled')} className="ml-2">
                                <div className={`w-2 h-2 rounded-full ${isStrategyActive ? 'bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.8)]' : 'bg-gray-600'}`}></div>
                            </button>
                        </div>
                    </div>

                    {/* Active Memory Box / User Profile */}
                    <div className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors w-full group ${isActiveMemoryEnabled ? 'bg-cyan-500/20 text-cyan-200' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>
                        <button onClick={() => toggleSetting('isMemoryBoxEnabled')} className="flex-grow text-left flex items-center">
                            <span>User Profile</span>
                        </button>
                        <div className="flex items-center">
                            <button 
                                onClick={(e) => { e.stopPropagation(); openActiveMemoryModal(); setIsOpen(false); }} 
                                className={`p-1 ml-2 rounded hover:bg-white/10 ${isActiveMemoryEnabled ? 'text-cyan-200' : 'text-gray-500'}`}
                                title="Configure User Profile"
                            >
                                <CogIcon className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => toggleSetting('isMemoryBoxEnabled')} className="ml-2">
                                <div className={`w-2 h-2 rounded-full ${isActiveMemoryEnabled ? 'bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)]' : 'bg-gray-600'}`}></div>
                            </button>
                        </div>
                    </div>

                    {/* Agent (Reasoning) */}
                    <div className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors w-full group ${isAgentActive ? 'bg-fuchsia-500/20 text-fuchsia-200' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>
                        <button onClick={() => toggleSetting('enableReasoningWorkflow')} className="flex-grow text-left flex items-center">
                            <span>Agent</span>
                        </button>
                        <div className="flex items-center">
                            <button 
                                onClick={(e) => { e.stopPropagation(); openReasoningSetupModal(); setIsOpen(false); }} 
                                className={`p-1 ml-2 rounded hover:bg-white/10 ${isAgentActive ? 'text-fuchsia-200' : 'text-gray-500'}`}
                                title="Configure Agent Reasoning"
                            >
                                <CogIcon className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => toggleSetting('enableReasoningWorkflow')} className="ml-2">
                                <div className={`w-2 h-2 rounded-full ${isAgentActive ? 'bg-fuchsia-400 shadow-[0_0_5px_rgba(232,121,249,0.8)]' : 'bg-gray-600'}`}></div>
                            </button>
                        </div>
                    </div>
                    
                    {/* Mem (RAG) */}
                    <div className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors w-full group ${isMemoryActive ? 'bg-indigo-500/20 text-indigo-200' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>
                        <button onClick={() => toggleSetting('enableLongTermMemory')} className="flex-grow text-left flex items-center">
                            <span>Mem (RAG)</span>
                        </button>
                        <div className="flex items-center">
                            <button 
                                onClick={(e) => { e.stopPropagation(); openMemorySourceModal(); setIsOpen(false); }} 
                                className={`p-1 ml-2 rounded hover:bg-white/10 ${isMemoryActive ? 'text-indigo-200' : 'text-gray-500'}`}
                                title="Configure Long Term Memory"
                            >
                                <CogIcon className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => toggleSetting('enableLongTermMemory')} className="ml-2">
                                <div className={`w-2 h-2 rounded-full ${isMemoryActive ? 'bg-indigo-400 shadow-[0_0_5px_rgba(129,140,248,0.8)]' : 'bg-gray-600'}`}></div>
                            </button>
                        </div>
                    </div>

                    {/* Shadow Mode */}
                    <div className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors w-full group ${isShadowActive ? 'bg-emerald-500/20 text-emerald-200' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>
                        <button onClick={() => toggleSetting('enableShadowMode')} className="flex-grow text-left flex items-center">
                            <span>Shadow</span>
                        </button>
                        <div className="flex items-center">
                            <button
                                onClick={(e) => { e.stopPropagation(); openShadowSetupModal(); setIsOpen(false); }}
                                className={`p-1 ml-2 rounded hover:bg-white/10 ${isShadowActive ? 'text-emerald-200' : 'text-gray-500'}`}
                                title="Configure Shadow Mode"
                            >
                                <CogIcon className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => toggleSetting('enableShadowMode')} className="ml-2">
                                <div className={`w-2 h-2 rounded-full ${isShadowActive ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)]' : 'bg-gray-600'}`}></div>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
});

export default ChatToolsMenu;
