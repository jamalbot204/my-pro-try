
import React, { useEffect, memo, useCallback } from 'react';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';
import { useActiveChatStore } from '../../store/useActiveChatStore.ts';
import { useArchiverStore } from '../../store/useArchiverStore.ts'; 
import { ArchiveBoxIcon, ArrowDownTrayIcon, PlayIcon, StopIcon, PauseIcon, ArrowRightStartOnRectangleIcon, BookOpenIcon, ArrowPathIcon, PlusIcon } from '../common/Icons.tsx';
import BaseModal from '../common/BaseModal.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { triggerDownload, sanitizeFilename } from '../../services/utils.ts';
import { MODEL_DEFINITIONS } from '../../constants.ts';
import { useDataStore } from '../../store/useDataStore.ts';
import { useToastStore } from '../../store/useToastStore.ts';
import { useSettingsPersistence } from '../../hooks/useSettingsPersistence.ts';

const ArchiverModal: React.FC = memo(() => {
    const { isArchiverModalOpen, closeArchiverModal, openStoryManagerModal } = useSettingsUI();
    const { currentChatSession } = useActiveChatStore();
    const { showToast } = useToastStore();
    const { t } = useTranslation();
    const { saveSessionSettings } = useSettingsPersistence();

    // Connect to Global Archiver Store
    const { 
        isProcessing, 
        isPaused,
        reviewMode,
        chunks,
        nextChunkIndex, 
        progress, 
        currentStatus, 
        chapters, 
        userName, 
        charName, 
        selectedModel,
        setNames,
        setModel,
        prepareArchiving,
        executeArchiving,
        pauseArchiving,
        cancelArchiving,
        resetArchiver,
        toggleChunkSelection,
        setAllChunksSelection,
        saveGeneratedChaptersToStory,
        retryChapterGeneration
    } = useArchiverStore();

    // Initial Setup - Load from Settings first, then fallback
    useEffect(() => {
        if (isArchiverModalOpen && currentChatSession && !isProcessing && chapters.length === 0 && !reviewMode) {
            let uName = "User";
            let cName = "AI";
            
            if (currentChatSession.settings.archiverConfig) {
                uName = currentChatSession.settings.archiverConfig.userName;
                cName = currentChatSession.settings.archiverConfig.characterName;
            } else {
                if (currentChatSession.settings.contextUserName) {
                    uName = currentChatSession.settings.contextUserName;
                }
                if (currentChatSession.isCharacterModeActive && currentChatSession.aiCharacters && currentChatSession.aiCharacters.length > 0) {
                    cName = currentChatSession.aiCharacters[0].name;
                }
            }
            
            setNames(uName, cName);
        }
    }, [isArchiverModalOpen, currentChatSession, isProcessing, chapters.length, reviewMode, setNames]);

    const handleSaveConfig = useCallback(async () => {
        if (!currentChatSession) return;
        
        await saveSessionSettings({
            ...currentChatSession.settings,
            archiverConfig: {
                userName: userName,
                characterName: charName
            }
        }, null); 
    }, [currentChatSession, userName, charName, saveSessionSettings]);

    const handleDownload = useCallback(() => {
        if (chapters.length === 0 || !currentChatSession) return;

        const archiveData = {
            meta: {
                chat_title: currentChatSession.title,
                archived_at: new Date().toISOString(),
                total_chapters: chapters.length,
                generated_by: "JJ Chat Archiver",
                model_used: selectedModel
            },
            chapters: chapters
        };

        const jsonStr = JSON.stringify(archiveData, null, 2);
        const filename = sanitizeFilename(`${currentChatSession.title}_NovelArchive`);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        triggerDownload(blob, `${filename}.json`);
    }, [chapters, currentChatSession, selectedModel]);

    const handleSaveToStory = useCallback(async () => {
        if (chapters.length === 0 || !currentChatSession) return;
        await saveGeneratedChaptersToStory();
        // Option: close modal or switch to Story Manager?
    }, [chapters, currentChatSession, saveGeneratedChaptersToStory]);

    const handleClose = useCallback(() => {
        handleSaveConfig();
        closeArchiverModal();
    }, [closeArchiverModal, handleSaveConfig]);

    const handleStop = useCallback(() => {
        cancelArchiving();
    }, [cancelArchiving]);

    // Phase 1: Review
    const handleReview = useCallback(() => {
        handleSaveConfig();
        prepareArchiving(false); // Calc chunks and go to review
    }, [handleSaveConfig, prepareArchiving]);

    // Phase 2: Execute
    const handleExecute = useCallback(() => {
        executeArchiving();
    }, [executeArchiving]);

    const handleResume = useCallback(() => {
        handleSaveConfig();
        prepareArchiving(true); // Resume
    }, [handleSaveConfig, prepareArchiving]);

    const handleOpenStoryManager = useCallback(() => {
        closeArchiverModal();
        openStoryManagerModal();
    }, [closeArchiverModal, openStoryManagerModal]);

    const footerButtons = (
        <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto sm:justify-end">
            <button 
                onClick={handleClose} 
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 rounded hover:bg-white/10 w-full sm:w-auto justify-center flex"
            >
                {t.close}
            </button>
            
            {/* Initial: Show "Preview Chunks" instead of Start */}
            {!isProcessing && !reviewMode && nextChunkIndex === 0 && chapters.length === 0 && (
                <button 
                    onClick={handleReview}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 flex items-center shadow-lg shadow-indigo-500/20 w-full sm:w-auto justify-center"
                >
                    <ArrowPathIcon className="w-4 h-4 mr-2" /> Preview Chunks
                </button>
            )}

            {/* Resume Button */}
            {!isProcessing && nextChunkIndex > 0 && (
                <button 
                    onClick={handleResume}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-500 flex items-center shadow-lg shadow-green-500/20 animate-pulse w-full sm:w-auto justify-center"
                >
                    <PlayIcon className="w-4 h-4 mr-2" /> Resume
                </button>
            )}

            {/* Review Mode Actions */}
            {reviewMode && (
                <>
                    <button 
                        onClick={() => cancelArchiving()} 
                        className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 rounded hover:bg-white/10 w-full sm:w-auto justify-center flex"
                    >
                        Back
                    </button>
                    <button 
                        onClick={handleExecute}
                        className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded hover:bg-indigo-500 flex items-center shadow-lg shadow-indigo-500/20 w-full sm:w-auto justify-center"
                    >
                        <PlayIcon className="w-4 h-4 mr-2" /> Start Processing
                    </button>
                </>
            )}

            {/* Pause/Stop Logic */}
            {isProcessing && !isPaused && (
                <button 
                    onClick={pauseArchiving}
                    className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded hover:bg-amber-500 flex items-center shadow-lg shadow-amber-500/20 w-full sm:w-auto justify-center"
                >
                    <PauseIcon className="w-4 h-4 mr-2" /> Pause
                </button>
            )}

            {(isProcessing || isPaused) && (
                <button 
                    onClick={handleStop} 
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-500 flex items-center shadow-lg shadow-red-500/20 w-full sm:w-auto justify-center"
                >
                    <StopIcon className="w-4 h-4 mr-2" /> Reset
                </button>
            )}

            {/* Results Actions */}
            {chapters.length > 0 && !isProcessing && !reviewMode && (
                <>
                    <button 
                        onClick={handleSaveToStory} 
                        className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded hover:bg-cyan-500 flex items-center shadow-lg shadow-cyan-500/20 w-full sm:w-auto justify-center"
                    >
                        <BookOpenIcon className="w-4 h-4 mr-2" /> Save to Story
                    </button>
                    <button 
                        onClick={handleDownload} 
                        className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded hover:bg-emerald-500 flex items-center shadow-lg shadow-emerald-500/20 w-full sm:w-auto justify-center"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4 mr-2" /> Download JSON
                    </button>
                </>
            )}
        </div>
    );

    return (
        <BaseModal
            isOpen={isArchiverModalOpen}
            onClose={handleClose}
            title="Chat Archiver (Novel Mode)"
            headerIcon={<ArchiveBoxIcon className="w-5 h-5 text-indigo-400" />}
            footer={footerButtons}
            maxWidth="sm:max-w-2xl"
        >
            <div className="space-y-4">
                {/* Info Header */}
                {!reviewMode && (
                    <div className="bg-indigo-900/20 p-3 rounded border border-indigo-500/30 text-indigo-200 text-sm flex justify-between items-start">
                        <p>Transforms chat history into a structured "Novel". Review and select chunks before processing.</p>
                        <div className="flex gap-2">
                            {chapters.length > 0 && !isProcessing && !isPaused && (
                                <button onClick={resetArchiver} className="text-xs text-indigo-300 underline whitespace-nowrap">Clear All</button>
                            )}
                            <button onClick={handleOpenStoryManager} className="text-xs text-cyan-300 underline font-bold whitespace-nowrap">Manage Chapters</button>
                        </div>
                    </div>
                )}

                {/* Configuration (Hidden in Review/Processing) */}
                {!isProcessing && !reviewMode && chapters.length === 0 && (
                    <div className="grid grid-cols-2 gap-4 animate-fade-in">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">User Name (for Story)</label>
                            <input 
                                type="text" 
                                value={userName} 
                                onChange={(e) => setNames(e.target.value, charName)}
                                onBlur={handleSaveConfig}
                                className="w-full p-2 aurora-input text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">AI Character Name</label>
                            <input 
                                type="text" 
                                value={charName} 
                                onChange={(e) => setNames(userName, e.target.value)}
                                onBlur={handleSaveConfig}
                                className="w-full p-2 aurora-input text-sm"
                            />
                        </div>
                        <div className="col-span-2">
                             <label className="block text-xs font-bold text-gray-400 mb-1">
                                 Archiver Model
                             </label>
                             <select 
                                value={selectedModel}
                                onChange={(e) => setModel(e.target.value)}
                                className="w-full p-2 aurora-select text-sm border-indigo-500/30 focus:border-indigo-500 rounded"
                             >
                                {MODEL_DEFINITIONS.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                             </select>
                        </div>
                    </div>
                )}

                {/* Review List Mode */}
                {reviewMode && !isProcessing && (
                    <div className="animate-fade-in-right">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold text-gray-300">Select Chapters to Archive</h3>
                            <div className="space-x-2">
                                <button onClick={() => setAllChunksSelection(true)} className="text-[10px] bg-indigo-900/30 text-indigo-300 px-2 py-1 rounded hover:bg-indigo-900/50">Select All</button>
                                <button onClick={() => setAllChunksSelection(false)} className="text-[10px] bg-white/5 text-gray-400 px-2 py-1 rounded hover:bg-white/10">None</button>
                            </div>
                        </div>
                        <div className="max-h-80 overflow-y-auto custom-scrollbar border border-white/10 rounded bg-black/20 p-2 space-y-2">
                            {chunks.map((chunk, idx) => (
                                <div 
                                    key={idx} 
                                    className={`flex items-start p-2 rounded cursor-pointer border transition-colors ${chunk.selected ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-transparent border-white/5 opacity-60'}`}
                                    onClick={() => toggleChunkSelection(idx)}
                                >
                                    <div className="flex items-center h-full mr-3 pt-1">
                                        <input 
                                            type="checkbox" 
                                            checked={chunk.selected} 
                                            readOnly 
                                            className="h-4 w-4 rounded border-gray-500 text-indigo-500 focus:ring-indigo-500 bg-black/40 cursor-pointer pointer-events-none"
                                        />
                                    </div>
                                    <div className="flex-grow">
                                        <div className="flex justify-between">
                                            <span className={`text-sm font-bold ${chunk.selected ? 'text-indigo-300' : 'text-gray-500'}`}>
                                                Chapter {chunk.displayId}
                                            </span>
                                            <span className="text-[10px] text-gray-500">{chunk.msgCount} msgs</span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1 italic line-clamp-1">{chunk.previewText}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            Note: Chapter numbers in the final archive will match the numbers shown here (e.g. skipping Ch.2 preserves Ch.3's ID).
                        </p>
                    </div>
                )}

                {/* Progress UI */}
                {(isProcessing || isPaused) && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-400 font-mono">
                            <span>{currentStatus}</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-300 ease-out ${isPaused ? 'bg-amber-500' : 'bg-indigo-500'} ${isProcessing ? 'animate-pulse' : ''}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* PAUSED CONFIGURATION INJECTION */}
                {isPaused && (
                    <div className="bg-amber-900/20 p-3 rounded border border-amber-500/30 animate-fade-in">
                        <label className="block text-xs font-bold text-amber-300 mb-2 uppercase tracking-wider">
                            Change Model for Remaining Chapters
                        </label>
                        <select
                            value={selectedModel}
                            onChange={(e) => setModel(e.target.value)}
                            className="w-full p-2 aurora-select text-sm border-amber-500/30 focus:border-amber-500 rounded bg-black/40 text-gray-200"
                        >
                            {MODEL_DEFINITIONS.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-amber-400/60 mt-1">
                            The new model will be applied when you click Resume.
                        </p>
                    </div>
                )}

                {/* Results Preview */}
                {chapters.length > 0 && !reviewMode && (
                    <div className="mt-4 max-h-64 overflow-y-auto custom-scrollbar space-y-3 bg-black/20 p-2 rounded border border-white/5">
                        {chapters.map((chapter, idx) => {
                            // Find corresponding chunk status
                            const matchingChunk = chunks.find(c => c.displayId === chapter.chapterNumber);
                            const chunkStatus = matchingChunk?.status;
                            
                            return (
                                <div key={idx} className={`p-3 rounded border animate-fade-in ${chapter.isError ? 'bg-red-900/10 border-red-500/30' : 'bg-white/5 border-white/5'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className={`text-sm font-bold ${chapter.isError ? 'text-red-300' : 'text-indigo-300'}`}>
                                            Chapter {chapter.chapterNumber ?? (idx + 1)}: {chapter.title}
                                        </h4>
                                        <span className="text-[10px] text-gray-500">{chapter.time_range}</span>
                                    </div>
                                    <p className="text-xs text-gray-300 mb-2 leading-relaxed">{chapter.narrative}</p>
                                    
                                    {chapter.isError && matchingChunk && (
                                        <div className="flex justify-end mt-2">
                                            <button 
                                                onClick={() => retryChapterGeneration(matchingChunk.index)}
                                                disabled={chunkStatus === 'processing'}
                                                className="flex items-center px-3 py-1.5 text-xs font-bold text-white bg-red-600 rounded hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <ArrowPathIcon className={`w-3.5 h-3.5 mr-1.5 ${chunkStatus === 'processing' ? 'animate-spin' : ''}`} />
                                                {chunkStatus === 'processing' ? "Retrying..." : "Retry Generation"}
                                            </button>
                                        </div>
                                    )}

                                    {chapter.key_quotes && chapter.key_quotes.length > 0 && !chapter.isError && (
                                        <div className="bg-black/20 p-2 rounded">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Key Quotes</p>
                                            <ul className="list-disc list-inside text-[10px] text-gray-400 italic">
                                                {chapter.key_quotes.map((q, i) => <li key={i}>{q}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </BaseModal>
    );
});

export default ArchiverModal;
