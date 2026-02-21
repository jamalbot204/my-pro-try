import React, { useState, memo, useCallback, useEffect } from 'react';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';
import { useChatListStore } from '../../store/useChatListStore.ts';
import { useActiveChatStore } from '../../store/useActiveChatStore.ts';
import { useToastStore } from '../../store/useToastStore.ts';
import { TelegramIcon, CloseIcon, CheckIcon, DocumentIcon, UserIcon, SparklesIcon } from '../common/Icons.tsx';
import BaseModal from '../common/BaseModal.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { getTelegramParticipants, convertTelegramToSession, TelegramExport } from '../../services/telegramService.ts';

const TelegramImportModal: React.FC = memo(() => {
    const { isTelegramImportModalOpen, closeTelegramImportModal } = useSettingsUI();
    const { addChatSession } = useChatListStore();
    const { selectChat } = useActiveChatStore();
    const showToast = useToastStore(state => state.showToast);
    const { t } = useTranslation();

    const [file, setFile] = useState<File | null>(null);
    const [importData, setImportData] = useState<TelegramExport | null>(null);
    const [participants, setParticipants] = useState<{ id: string; name: string; count: number }[]>([]);
    
    const [userId, setUserId] = useState<string>('');
    const [modelId, setModelId] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!isTelegramImportModalOpen) {
            setFile(null);
            setImportData(null);
            setParticipants([]);
            setUserId('');
            setModelId('');
            setIsProcessing(false);
        }
    }, [isTelegramImportModalOpen]);

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (!selectedFile.name.endsWith('.json')) {
            showToast("Please upload a valid JSON file exported from Telegram.", "error");
            return;
        }

        setFile(selectedFile);
        
        try {
            const text = await selectedFile.text();
            const data = JSON.parse(text) as TelegramExport;
            
            if (!data.messages || !Array.isArray(data.messages)) {
                throw new Error("Invalid Telegram export format.");
            }

            const parts = getTelegramParticipants(data);
            setImportData(data);
            setParticipants(parts);

            // Auto-select if only 2 participants
            if (parts.length >= 2) {
                setUserId(parts[0].id);
                setModelId(parts[1].id);
            }
        } catch (err: any) {
            showToast(`Failed to parse file: ${err.message}`, "error");
            setFile(null);
        }
    }, [showToast]);

    const handleImport = useCallback(async () => {
        if (!importData || !userId || !modelId) return;

        setIsProcessing(true);
        try {
            const session = convertTelegramToSession(importData, userId, modelId);
            await addChatSession(session);
            await selectChat(session.id);
            showToast("Telegram chat imported successfully!", "success");
            closeTelegramImportModal();
        } catch (err: any) {
            showToast(`Import failed: ${err.message}`, "error");
        } finally {
            setIsProcessing(false);
        }
    }, [importData, userId, modelId, addChatSession, selectChat, showToast, closeTelegramImportModal]);

    const footerButtons = (
        <>
            <button onClick={closeTelegramImportModal} className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 rounded hover:bg-white/10">{t.cancel}</button>
            <button 
                onClick={handleImport} 
                disabled={!userId || !modelId || isProcessing}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600/80 rounded hover:shadow-lg hover:shadow-blue-500/30 flex items-center disabled:opacity-50"
            >
                {isProcessing ? <span className="animate-pulse">{t.loading}</span> : <><CheckIcon className="w-4 h-4 mr-1.5" /> {t.import}</>}
            </button>
        </>
    );

    return (
        <BaseModal
            isOpen={isTelegramImportModalOpen}
            onClose={closeTelegramImportModal}
            title="Import from Telegram"
            headerIcon={<TelegramIcon className="w-5 h-5 text-blue-400" />}
            footer={footerButtons}
            maxWidth="sm:max-w-lg"
        >
            <div className="space-y-6">
                {!importData ? (
                    <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-gray-700 rounded-xl bg-black/10 hover:border-blue-500/50 transition-colors group">
                        <DocumentIcon className="w-12 h-12 text-gray-600 mb-4 group-hover:text-blue-400 transition-colors" />
                        <p className="text-sm text-gray-400 text-center mb-6">
                            Upload the <code className="text-blue-300 bg-blue-900/20 px-1 rounded">result.json</code> file exported from Telegram Desktop.
                        </p>
                        <label className="cursor-pointer px-6 py-2.5 bg-blue-600/80 text-white rounded-lg font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20">
                            Select JSON File
                            <input type="file" accept=".json" className="hidden" onChange={handleFileChange} />
                        </label>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-3 rounded-lg bg-blue-900/10 border border-blue-500/20">
                            <p className="text-xs text-blue-300 font-bold uppercase tracking-wider mb-1">Detected Chat</p>
                            <p className="text-sm text-white font-medium">{importData.name} ({importData.messages.length} messages)</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center">
                                    <UserIcon className="w-3.5 h-3.5 mr-2 text-blue-400" />
                                    Who are YOU in this chat?
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {participants.map(p => (
                                        <button 
                                            key={p.id}
                                            onClick={() => setUserId(p.id)}
                                            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${userId === p.id ? 'bg-blue-600/20 border-blue-500 text-blue-100 shadow-md' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                                        >
                                            <span className="text-sm font-medium">{p.name}</span>
                                            <span className="text-[10px] opacity-60">{p.count} msgs</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center">
                                    <SparklesIcon className="w-3.5 h-3.5 mr-2 text-purple-400" />
                                    Who is the AI (Model)?
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {participants.map(p => (
                                        <button 
                                            key={p.id}
                                            onClick={() => setModelId(p.id)}
                                            disabled={p.id === userId}
                                            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${modelId === p.id ? 'bg-purple-600/20 border-purple-500 text-purple-100 shadow-md' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'} ${p.id === userId ? 'opacity-30 cursor-not-allowed' : ''}`}
                                        >
                                            <span className="text-sm font-medium">{p.name}</span>
                                            <span className="text-[10px] opacity-60">{p.count} msgs</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <p className="text-[10px] text-gray-500 italic mt-4">
                            * Only text messages from selected participants will be imported. Attachments and media are not supported in this version.
                        </p>
                    </div>
                )}
            </div>
        </BaseModal>
    );
});

export default TelegramImportModal;