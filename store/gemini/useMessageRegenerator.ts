
import { create } from 'zustand';
import { geminiRefs } from './sharedRefs.ts';
import { useGeminiStatusStore } from './useGeminiStatusStore.ts';
import { useApiKeyStore } from '../useApiKeyStore.ts';
import { useActiveChatStore } from '../useActiveChatStore.ts';
import { useDataStore } from '../useDataStore.ts';
import { useChatListStore } from '../useChatListStore.ts';
import { useAudioStore } from '../useAudioStore.ts';
import { 
    ChatMessage, GeminiSettings, UserMessageInput, 
    FullResponseData, ChatMessageRole 
} from '../../types.ts';
import { getFullChatResponse } from '../../services/llm/chat.ts';
import { findPrecedingUserMessageIndex, getHistoryUpToMessage } from '../../services/utils.ts';
import { extractThoughtsByTag } from '../../services/llm/utils.ts';
import * as dbService from '../../services/dbService.ts';

interface MessageRegeneratorActions {
    handleRegenerateAIMessage: (aiMessageIdToRegenerate: string) => Promise<void>;
    handleRegenerateResponseForUserMessage: (userMessageId: string) => Promise<void>;
}

export const useMessageRegenerator = create<MessageRegeneratorActions>((set, get) => ({
    handleRegenerateAIMessage: async (aiMessageIdToRegenerate: string) => {
        const { activeApiKey, rotateActiveKey } = useApiKeyStore.getState();
        const { currentChatSession, updateCurrentChatSession } = useActiveChatStore.getState();
        const { setMessageGenerationTimes, updateMessages } = useDataStore.getState();
        const { setIsLoading, logApiRequest } = useGeminiStatusStore.getState();
        const { handleStopAndCancelAllForCurrentAudio } = useAudioStore.getState();
        const isLoading = useGeminiStatusStore.getState().isLoading;

        if (!currentChatSession || isLoading) return;
        if (!activeApiKey?.value) {
            await updateCurrentChatSession(session => {
                if (!session) return null;
                const errorMessage: ChatMessage = { id: `err-${Date.now()}`, role: ChatMessageRole.ERROR, content: "No API key set. Please go to Settings > API Key to set your key.", timestamp: new Date() };
                return { ...session, messages: [...session.messages, errorMessage] };
            });
            const sessionAfterError = useActiveChatStore.getState().currentChatSession;
            if(sessionAfterError) await updateMessages(sessionAfterError.id, sessionAfterError.messages);
            return;
        }

        const messageIndex = currentChatSession.messages.findIndex(m => m.id === aiMessageIdToRegenerate);
        if (messageIndex === -1) return;
        
        const originalAiMessage = currentChatSession.messages[messageIndex];
        if (originalAiMessage.role !== ChatMessageRole.MODEL && originalAiMessage.role !== ChatMessageRole.ERROR) return;

        // Audio Cleanup Logic
        if (originalAiMessage.cachedAudioSegmentCount && originalAiMessage.cachedAudioSegmentCount > 0) {
            handleStopAndCancelAllForCurrentAudio();
            const deletePromises: Promise<void>[] = [];
            for (let i = 0; i < originalAiMessage.cachedAudioSegmentCount; i++) {
                deletePromises.push(dbService.deleteAudioBuffer(`${originalAiMessage.id}_part_${i}`));
            }
            Promise.all(deletePromises).catch(err => console.error("Failed to cleanup audio during regenerate:", err));
        }

        const precedingUserMessageIndex = findPrecedingUserMessageIndex(currentChatSession.messages, messageIndex);
        if (precedingUserMessageIndex === -1) return;

        const userMessage = currentChatSession.messages[precedingUserMessageIndex];
        const historyForGeminiSDK = getHistoryUpToMessage(currentChatSession.messages, precedingUserMessageIndex);
        
        await rotateActiveKey();
        geminiRefs.requestCancelledByUser = false;
        geminiRefs.onFullResponseCalledForPendingMessage = false;
        geminiRefs.originalMessageSnapshot = null;
        
        setIsLoading(true);
        geminiRefs.abortController = new AbortController();
        geminiRefs.pendingMessageId = aiMessageIdToRegenerate;

        const placeholderAiMessage: ChatMessage = { 
            ...originalAiMessage,
            content: '', 
            timestamp: new Date(), 
            isStreaming: true, 
            role: ChatMessageRole.MODEL,
            cachedAudioBuffers: null, 
            cachedAudioSegmentCount: undefined, 
            groundingMetadata: undefined 
        };

        await updateCurrentChatSession(session => {
            if (!session) return null;
            const newMessages = session.messages.map(msg => 
                msg.id === aiMessageIdToRegenerate ? placeholderAiMessage : msg
            );
            return { ...session, messages: newMessages };
        });
        
        const sessionAfterPlaceholder = useActiveChatStore.getState().currentChatSession;
        if (sessionAfterPlaceholder) await updateMessages(sessionAfterPlaceholder.id, sessionAfterPlaceholder.messages);

        const finalUserMessageInputForAPI: UserMessageInput = { text: userMessage.content, attachments: userMessage.attachments || [] };
        const baseSettingsForAPICall = { ...currentChatSession.settings };
        let settingsOverrideForAPICall: Partial<GeminiSettings & { _characterIdForAPICall?: string }> = {};
        if (currentChatSession.isCharacterModeActive && originalAiMessage.characterName) {
            const character = (currentChatSession.aiCharacters || []).find(c => c.name === originalAiMessage.characterName);
            if (character) {
                settingsOverrideForAPICall.systemInstruction = character.systemInstruction;
                settingsOverrideForAPICall.userPersonaInstruction = undefined;
                settingsOverrideForAPICall._characterIdForAPICall = character.id;
            }
        }
        
        // --- SEED LOGIC (Same as MessageSender) ---
        const reqSeed = settingsOverrideForAPICall.seed ?? baseSettingsForAPICall.seed;
        const finalSeed = reqSeed !== undefined ? reqSeed : Math.floor(Math.random() * 2147483647);
        settingsOverrideForAPICall.seed = finalSeed;
        // -----------------------------------------

        const activeChatIdForThisRegenCall = currentChatSession.id;

        // --- PREPARE STREAMING REGEX (PERFORMANCE OPTIMIZATION) ---
        const customTagName = baseSettingsForAPICall.customThoughtTagName;
        const enableCustomParsing = baseSettingsForAPICall.enableCustomThoughtParsing;
        
        let blockRegex: RegExp | null = null;
        let openTagRegex: RegExp | null = null;
        
        if (enableCustomParsing && customTagName) {
             blockRegex = new RegExp(`<\\s*${customTagName}(?:s)?\\b[^>]*>([\\s\\S]*?)<\\s*\\/\\s*${customTagName}(?:s)?\\s*>`, 'gi');
             openTagRegex = new RegExp(`<\\s*${customTagName}(?:s)?\\b[^>]*>`, 'i');
        }

        // --- STREAMING CALLBACK ---
        const handleStreamUpdate = (fullRawText: string) => {
            if (geminiRefs.requestCancelledByUser && geminiRefs.pendingMessageId === aiMessageIdToRegenerate) return;
            
            let visibleText = fullRawText;
            
            if (blockRegex && openTagRegex) {
                 let processed = fullRawText.replace(blockRegex, '');
                 const match = processed.match(openTagRegex);
                 if (match && match.index !== undefined) {
                     processed = processed.substring(0, match.index);
                 }
                 visibleText = processed;
            }

            // TARGETED ZUSTAND UPDATE (MEMORY ONLY)
            useActiveChatStore.getState().updateCurrentChatSession(s => {
                if (!s || s.id !== activeChatIdForThisRegenCall) return null;
                const newMessages = s.messages.map(msg => 
                    msg.id === aiMessageIdToRegenerate 
                        ? { ...msg, content: visibleText, isStreaming: true } 
                        : msg
                );
                return { ...s, messages: newMessages };
            });
        };

        await getFullChatResponse({
            apiKey: activeApiKey?.value || '',
            sessionId: activeChatIdForThisRegenCall,
            userMessageInput: finalUserMessageInputForAPI,
            model: currentChatSession.model,
            baseSettings: baseSettingsForAPICall,
            currentChatMessages: historyForGeminiSDK,
            onStreamUpdate: handleStreamUpdate, // Enable Streaming
            onFullResponse: async (responseData: FullResponseData) => {
                if (geminiRefs.requestCancelledByUser && geminiRefs.pendingMessageId === aiMessageIdToRegenerate) return;
                geminiRefs.onFullResponseCalledForPendingMessage = true;
                if (geminiRefs.generationStartTime) await setMessageGenerationTimes(prev => ({...prev, [aiMessageIdToRegenerate]: (Date.now() - (geminiRefs.generationStartTime || 0)) / 1000}));
                
                let fullSession = useActiveChatStore.getState().currentChatSession;
                if (!fullSession || fullSession.id !== activeChatIdForThisRegenCall) {
                    fullSession = await dbService.getChatSession(activeChatIdForThisRegenCall);
                }

                if (!fullSession) return;

                // --- CUSTOM THOUGHT PARSING LOGIC ---
                let mergedThoughts = responseData.thoughts || "";
                let finalResponseText = responseData.text;

                if (fullSession.settings.enableCustomThoughtParsing && fullSession.settings.customThoughtTagName) {
                    const { cleanText, extractedThoughts } = extractThoughtsByTag(finalResponseText, fullSession.settings.customThoughtTagName);
                    finalResponseText = cleanText;
                    if (extractedThoughts) {
                        if (mergedThoughts) {
                            mergedThoughts += "\n\n---\n\n" + extractedThoughts;
                        } else {
                            mergedThoughts = extractedThoughts;
                        }
                    }
                }
                // ------------------------------------

                const newAiMessage: ChatMessage = { 
                    ...placeholderAiMessage, 
                    content: finalResponseText, 
                    thoughts: mergedThoughts,
                    groundingMetadata: responseData.groundingMetadata, 
                    isStreaming: false, 
                    timestamp: new Date(), 
                    seedUsed: responseData.seedUsed // STORE SEED
                };
                
                const updatedMessages = fullSession.messages.map(msg => msg.id === aiMessageIdToRegenerate ? newAiMessage : msg);
                const updatedSession = { ...fullSession, messages: updatedMessages, lastUpdatedAt: new Date() };
                
                if (useActiveChatStore.getState().currentChatId === activeChatIdForThisRegenCall) {
                    useActiveChatStore.getState().updateCurrentChatSession(s => s ? ({ ...s, messages: updatedMessages, lastUpdatedAt: new Date() }) : null);
                }

                useChatListStore.getState().updateChatSessionInList(updatedSession);
                await updateMessages(updatedSession.id, updatedSession.messages);

                const { triggerAutoPlayForNewMessage } = useAudioStore.getState();
                await triggerAutoPlayForNewMessage(newAiMessage);
            },
            onError: async (errorMsg, isAbortError) => {
                if (geminiRefs.requestCancelledByUser && geminiRefs.pendingMessageId === aiMessageIdToRegenerate) { setIsLoading(false); return; }
                geminiRefs.onFullResponseCalledForPendingMessage = false;
                const finalErrorMessage = isAbortError ? `Response aborted.` : `Response failed: ${errorMsg}`;

                let fullSession = useActiveChatStore.getState().currentChatSession;
                if (!fullSession || fullSession.id !== activeChatIdForThisRegenCall) {
                    fullSession = await dbService.getChatSession(activeChatIdForThisRegenCall);
                }
                if (!fullSession) return;
                
                const updatedMessages = fullSession.messages.map(msg => msg.id === aiMessageIdToRegenerate ? { ...msg, isStreaming: false, role: ChatMessageRole.ERROR, content: finalErrorMessage } : msg);
                const updatedSession = { ...fullSession, messages: updatedMessages, lastUpdatedAt: new Date() };

                if (useActiveChatStore.getState().currentChatId === activeChatIdForThisRegenCall) {
                    useActiveChatStore.getState().updateCurrentChatSession(s => s ? ({ ...s, messages: updatedMessages, lastUpdatedAt: new Date() }) : null);
                }

                useChatListStore.getState().updateChatSessionInList(updatedSession);
                await updateMessages(updatedSession.id, updatedSession.messages);

                if (!geminiRefs.requestCancelledByUser && geminiRefs.pendingMessageId === aiMessageIdToRegenerate) { setIsLoading(false); }
            },
            onComplete: async () => {
                const userDidCancel = geminiRefs.requestCancelledByUser;
                const currentPendingMsgIdForComplete = geminiRefs.pendingMessageId;
                if (userDidCancel && currentPendingMsgIdForComplete === aiMessageIdToRegenerate) {}
                else if (currentPendingMsgIdForComplete === aiMessageIdToRegenerate) {
                    setIsLoading(false);
                    if (!geminiRefs.onFullResponseCalledForPendingMessage) {
                        let fullSession = useActiveChatStore.getState().currentChatSession;
                        if (!fullSession || fullSession.id !== activeChatIdForThisRegenCall) {
                            fullSession = await dbService.getChatSession(activeChatIdForThisRegenCall);
                        }

                        if (fullSession) {
                            const messageInState = fullSession.messages.find(m => m.id === aiMessageIdToRegenerate);
                            if (messageInState && messageInState.isStreaming && messageInState.role !== ChatMessageRole.ERROR) {
                                const updatedMessages = fullSession.messages.map(msg => msg.id === aiMessageIdToRegenerate ? { ...msg, isStreaming: false, role: ChatMessageRole.ERROR, content: "Response processing failed or stream ended unexpectedly.", timestamp: new Date() } : msg );
                                const updatedSession = { ...fullSession, messages: updatedMessages, lastUpdatedAt: new Date() };
                                
                                if (useActiveChatStore.getState().currentChatId === activeChatIdForThisRegenCall) {
                                    useActiveChatStore.getState().updateCurrentChatSession(s => s ? ({ ...s, messages: updatedMessages, lastUpdatedAt: new Date() }) : null);
                                }

                                useChatListStore.getState().updateChatSessionInList(updatedSession);
                                await updateMessages(updatedSession.id, updatedSession.messages);
                            } else {
                                const updatedSession = { ...fullSession, lastUpdatedAt: new Date() };
                                useChatListStore.getState().updateChatSessionInList(updatedSession);
                            }
                        }
                    } else {
                        useChatListStore.getState().updateChatSessionInList({ id: activeChatIdForThisRegenCall, lastUpdatedAt: new Date() } as any);
                    }
                    geminiRefs.pendingMessageId = null;
                }
                if (geminiRefs.abortController && currentPendingMsgIdForComplete === aiMessageIdToRegenerate) geminiRefs.abortController = null;
                if (currentPendingMsgIdForComplete === aiMessageIdToRegenerate) geminiRefs.requestCancelledByUser = false;
                geminiRefs.onFullResponseCalledForPendingMessage = false;
            },
            logApiRequestCallback: logApiRequest,
            signal: geminiRefs.abortController.signal,
            settingsOverride: settingsOverrideForAPICall,
            allAiCharactersInSession: currentChatSession.aiCharacters,
            generatingMessageId: aiMessageIdToRegenerate
        });
    },

    handleRegenerateResponseForUserMessage: async (userMessageId: string) => {
        const { currentChatSession, updateCurrentChatSession } = useActiveChatStore.getState();
        const { updateMessages } = useDataStore.getState();
        const isLoading = useGeminiStatusStore.getState().isLoading;
        if (!currentChatSession || isLoading) return;

        const userMessageIndex = currentChatSession.messages.findIndex(m => m.id === userMessageId);
        if (userMessageIndex === -1) return;

        if (userMessageIndex + 1 < currentChatSession.messages.length) {
            const aiMessageToRegenerate = currentChatSession.messages[userMessageIndex + 1];
            if (aiMessageToRegenerate.role === ChatMessageRole.MODEL || aiMessageToRegenerate.role === ChatMessageRole.ERROR) {
                await get().handleRegenerateAIMessage(aiMessageToRegenerate.id);
            }
            return;
        }

        const aiMessageId = `msg-${Date.now()}-model-${Math.random().toString(36).substring(2,7)}`;
        const placeholderAiMessage: ChatMessage = { 
            id: aiMessageId, 
            role: ChatMessageRole.MODEL, 
            content: '', 
            timestamp: new Date(), 
            isStreaming: true 
        };
        
        await updateCurrentChatSession(session => {
            if (!session) return null;
            return { ...session, messages: [...session.messages, placeholderAiMessage] };
        });
        
        const sessionAfterUpdate = useActiveChatStore.getState().currentChatSession;
        if (sessionAfterUpdate) {
            await updateMessages(sessionAfterUpdate.id, sessionAfterUpdate.messages);
        }

        await get().handleRegenerateAIMessage(aiMessageId);
    },
}));
