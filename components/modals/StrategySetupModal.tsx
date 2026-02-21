import React, { useState, useEffect, useCallback, memo } from 'react';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';
import { useActiveChatStore } from '../../store/useActiveChatStore.ts';
import { useSettingsPersistence } from '../../hooks/useSettingsPersistence.ts';
import { ShieldCheckIcon, CheckIcon, ClipboardDocumentListIcon, UserIcon } from '../common/Icons.tsx';
import BaseModal from '../common/BaseModal.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';

const StrategySetupModal: React.FC = memo(() => {
    const { isStrategySetupModalOpen, closeStrategySetupModal } = useSettingsUI();
    const { currentChatSession } = useActiveChatStore();
    const { saveSessionSettings } = useSettingsPersistence();
    const { t } = useTranslation();

    const [isEnabled, setIsEnabled] = useState(false);
    const [strategyContent, setStrategyContent] = useState('');
    const [ghostResponse, setGhostResponse] = useState('');

    useEffect(() => {
        if (isStrategySetupModalOpen && currentChatSession) {
            setIsEnabled(currentChatSession.settings.isStrategyToolEnabled ?? false);
            setStrategyContent(currentChatSession.settings.strategyContent ?? "Execute protocol: [Your detailed instructions here]");
            setGhostResponse(currentChatSession.settings.strategyGhostResponse ?? "");
        }
    }, [isStrategySetupModalOpen, currentChatSession]);

    const handleSave = useCallback(async () => {
        if (!currentChatSession) return;
        
        await saveSessionSettings({
            ...currentChatSession.settings,
            isStrategyToolEnabled: isEnabled,
            strategyContent: strategyContent,
            strategyGhostResponse: ghostResponse
        }, "Strategic Protocol settings saved.");

        closeStrategySetupModal();
    }, [currentChatSession, isEnabled, strategyContent, ghostResponse, saveSessionSettings, closeStrategySetupModal]);

    const footerButtons = (
        <>
            <button onClick={closeStrategySetupModal} className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 rounded hover:bg-white/10">{t.cancel}</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-[var(--aurora-accent-primary)] rounded hover:shadow-lg hover:shadow-blue-500/30 flex items-center">
                <CheckIcon className="w-4 h-4 mr-1.5" /> {t.save}
            </button>
        </>
    );

    return (
        <BaseModal
            isOpen={isStrategySetupModalOpen}
            onClose={closeStrategySetupModal}
            title="Strategic Protocol (On-Demand Injection)"
            headerIcon={<ClipboardDocumentListIcon className="w-5 h-5 text-amber-400" />}
            footer={footerButtons}
            maxWidth="sm:max-w-2xl"
        >
            <div className="space-y-5">
                {/* Enable Switch */}
                <div className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-200">Enable Forced Protocol</span>
                        <span className="text-xs text-gray-400">Forces the model to execute a special tool to retrieve your instructions before responding.</span>
                    </div>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => setIsEnabled(e.target.checked)}
                            className="h-5 w-5 text-amber-500 bg-black/30 border-white/20 rounded focus:ring-amber-500 cursor-pointer"
                        />
                    </div>
                </div>

                {/* Content Editor */}
                <div className={isEnabled ? '' : 'opacity-50 pointer-events-none'}>
                    <label className="block text-xs font-bold text-amber-300 mb-1 uppercase tracking-wider flex items-center">
                        <ShieldCheckIcon className="w-3 h-3 mr-1.5" />
                        Protocol Instructions (Hidden)
                    </label>
                    <p className="text-[10px] text-gray-500 mb-2">
                        These instructions are hidden inside a tool. The model MUST call the tool to read them. This bypasses context drift and ensures adherence.
                    </p>
                    <textarea
                        value={strategyContent}
                        onChange={(e) => setStrategyContent(e.target.value)}
                        className="w-full p-3 aurora-textarea text-sm border-amber-500/30 focus:border-amber-500 rounded-md h-64 resize-y leading-relaxed font-mono"
                        placeholder="Enter your strict operating protocol here..."
                    />
                </div>

                {/* Ghost Response Editor */}
                <div className={isEnabled ? '' : 'opacity-50 pointer-events-none'}>
                    <label className="block text-xs font-bold text-amber-300 mb-1 uppercase tracking-wider flex items-center">
                        <UserIcon className="w-3 h-3 mr-1.5" />
                        Ghost Response (AI Confirmation)
                    </label>
                    <p className="text-[10px] text-gray-500 mb-2">
                        Customize how the AI "acknowledges" the protocol in the hidden history. Leave empty for default.
                    </p>
                    <textarea
                        value={ghostResponse}
                        onChange={(e) => setGhostResponse(e.target.value)}
                        className="w-full p-3 aurora-textarea text-sm border-amber-500/30 focus:border-amber-500 rounded-md h-20 resize-y leading-relaxed font-mono"
                        placeholder="Default: OK I UNDERSTAND AND I WILL FOLLOW THEM STEP BY STEP"
                    />
                </div>
            </div>
        </BaseModal>
    );
});

export default StrategySetupModal;