
import { create } from 'zustand';
import { geminiRefs } from './sharedRefs.ts';
import { useGeminiStatusStore } from './useGeminiStatusStore.ts';
import { useApiKeyStore } from '../useApiKeyStore.ts';
import { useActiveChatStore } from '../useActiveChatStore.ts';
import { useDataStore } from '../useDataStore.ts';
import { useChatListStore } from '../useChatListStore.ts';
import { useAudioStore } from '../useAudioStore.ts';
import { useProgressStore } from '../useProgressStore.ts';
import { 
    Attachment, ChatMessage, GeminiSettings, UserMessageInput, 
    FullResponseData, ChatMessageRole 
} from '../../types.ts';
import { getFullChatResponse } from '../../services/llm/chat.ts';
import { generateMimicUserResponse, executeAgenticStep } from '../../services/llm/agents.ts';
import { mapMessagesToFlippedRoleGeminiHistory } from '../../services/llm/history.ts';
import { generateShadowResponse } from '../../services/shadowService.ts'; 
import { extractThoughtsByTag, classifyGeminiError, formatGeminiError } from '../../services/llm/utils.ts';
import * as dbService from '../../services/dbService.ts';
import * as memoryService from '../../services/memoryService.ts';
import { useMemoryStore } from '../useMemoryStore.ts';
import { keepAliveService } from '../../services/keepAliveService.ts';
import { useArchiverStore } from '../../store/useArchiverStore.ts'; // ADDED

interface MessageSenderActions {
    handleSendMessage: (
        promptContent: string,
        attachments?: Attachment[],
        historyContextOverride?: ChatMessage[],
        characterIdForAPICall?: string,
        isTemporaryContext?: boolean,
        settingsOverride?: Partial<GeminiSettings>
    ) => Promise<void>;
    handleContinueFlow: () => Promise<void>;
}

export const useMessageSender = create<MessageSenderActions>((set, get) => ({
    handleSendMessage: async (
        promptContent: string, attachments?: Attachment[], historyContextOverride?: ChatMessage[],
        characterIdForAPICall?: string, isTemporaryContext?: boolean,
        settingsOverrideFromEdit?: Partial<GeminiSettings>
      ) => {
        const { activeApiKey, rotateActiveKey } = useApiKeyStore.getState();
        const { currentChatSession, updateCurrentChatSession } = useActiveChatStore.getState();
        const { setMessageGenerationTimes, updateMessages, updateTitle } = useDataStore.getState();
        const { setIsLoading, logApiRequest, setLastMessageHadAttachments } = useGeminiStatusStore.getState();
        const { startProgress, updateProgress, finishProgress, removeProgress } = useProgressStore.getState();
        const isLoading = useGeminiStatusStore.getState().isLoading;

        if (!currentChatSession || isLoading) return;
        if (!activeApiKey?.value) {
            await updateCurrentChatSession(session => {
                if (!session) return null;
                const errorMessage: ChatMessage = {
                    id: `err-${Date.now()}`,
                    role: ChatMessageRole.ERROR,
                    content: "No API key set. Please go to Settings > API Key to set your key.",
                    timestamp: new Date(),
                };
                return { ...session, messages: [...session.messages, errorMessage] };
            });
            const sessionAfterError = useActiveChatStore.getState().currentChatSession;
            if(sessionAfterError) await updateMessages(sessionAfterError.id, sessionAfterError.messages);
            return;
        }

        await rotateActiveKey();
        const apiKeyForThisCall = useApiKeyStore.getState().activeApiKey!.value;
    
        geminiRefs.requestCancelledByUser = false;
        geminiRefs.onFullResponseCalledForPendingMessage = false;
        if (!isTemporaryContext) {
            geminiRefs.originalMessageSnapshot = null;
        }
        setLastMessageHadAttachments(!!(attachments && attachments.length > 0 && !isTemporaryContext));
    
        let sessionToUpdate = { ...currentChatSession };
        let baseSettingsForAPICall = { ...currentChatSession.settings };
        let settingsOverrideForAPICall: Partial<GeminiSettings & { _characterIdForAPICall?: string }> = { ...settingsOverrideFromEdit };
        let characterNameForResponse: string | undefined = undefined;
        let userMessageIdForPotentialTitleUpdate: string | null = null;
    
        // --- SEED GENERATION LOGIC ---
        const reqSeed = settingsOverrideForAPICall.seed ?? baseSettingsForAPICall.seed;
        const finalSeed = reqSeed !== undefined ? reqSeed : Math.floor(Math.random() * 2147483647); 
        settingsOverrideForAPICall.seed = finalSeed;
        // -----------------------------

        if (currentChatSession.isCharacterModeActive && characterIdForAPICall) {
            const character = (currentChatSession.aiCharacters || []).find(c => c.id === characterIdForAPICall);
            if (character) {
                settingsOverrideForAPICall.systemInstruction = character.systemInstruction;
                settingsOverrideForAPICall.userPersonaInstruction = undefined;
                settingsOverrideForAPICall._characterIdForAPICall = character.id;
                characterNameForResponse = character.name;
            } else { return; }
        }
    
        let finalUserMessageInputForAPI: UserMessageInput;
        if (currentChatSession.isCharacterModeActive && characterIdForAPICall && !promptContent.trim() && (!attachments || attachments.length === 0) && !historyContextOverride) {
            const characterTriggered = (currentChatSession.aiCharacters || []).find(c => c.id === characterIdForAPICall);
            finalUserMessageInputForAPI = (characterTriggered?.contextualInfo?.trim()) ? { text: characterTriggered.contextualInfo, attachments: [] } : { text: "", attachments: [] };
        } else {
            finalUserMessageInputForAPI = { text: promptContent, attachments: attachments || [] };
        }
    
        if (!characterIdForAPICall && !historyContextOverride && !finalUserMessageInputForAPI.text.trim() && (!finalUserMessageInputForAPI.attachments || finalUserMessageInputForAPI.attachments.length === 0) && !currentChatSession.githubRepoContext) return;
    
        // START KEEP ALIVE
        keepAliveService.start();

        let historyForGeminiSDK: ChatMessage[] = historyContextOverride ? [...historyContextOverride] : [...sessionToUpdate.messages];
        let messagesForUIUpdate: ChatMessage[] = [...historyForGeminiSDK];

        // --- TEMPORAL INJECTION LOGIC ---
        const isTimeBridgeEnabled = sessionToUpdate.settings.enableTimeBridge ?? true;
        if (!isTemporaryContext && isTimeBridgeEnabled) {
            const thresholdMinutes = sessionToUpdate.settings.timeBridgeThreshold ?? 15;
            const thresholdMs = thresholdMinutes * 60 * 1000;
            const now = new Date();
            
            const lastMessage = historyForGeminiSDK.slice().reverse().find(m => 
                (m.role === ChatMessageRole.USER || m.role === ChatMessageRole.MODEL) && 
                !m.isTimeMarker && 
                !m.isSystemReminder
            );
            const lastTimeMarker = historyForGeminiSDK.slice().reverse().find(m => m.isTimeMarker);
            
            if (lastMessage) {
                const timeSinceLastActivity = now.getTime() - new Date(lastMessage.timestamp).getTime();
                let timeSinceLastMarker = 0;
                if (lastTimeMarker) {
                    timeSinceLastMarker = now.getTime() - new Date(lastTimeMarker.timestamp).getTime();
                } else if (historyForGeminiSDK.length > 0) {
                    timeSinceLastMarker = now.getTime() - new Date(historyForGeminiSDK[0].timestamp).getTime();
                }

                if (timeSinceLastActivity > thresholdMs || timeSinceLastMarker > thresholdMs) {
                    const diffMinutes = Math.floor(Math.max(timeSinceLastActivity, timeSinceLastMarker) / 60000);
                    const diffHours = Math.floor(diffMinutes / 60);
                    
                    let timePassedString = diffHours > 0 ? `${diffHours} hour(s)` : `${diffMinutes} minutes`;
                    const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    const timeStr = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

                    const injectionContent = `[System Note: Context Update]
Current Real-time: ${timeStr}
Date: ${dateStr}
Time passed since last interaction: ${timePassedString}.
(Proceed with the user's next message below)`;

                    const timeMarkerMessage: ChatMessage = {
                        id: `time-marker-${Date.now()}`,
                        role: ChatMessageRole.USER,
                        content: injectionContent,
                        timestamp: now,
                        isTimeMarker: true,
                        isSystemReminder: false
                    };
                    messagesForUIUpdate.push(timeMarkerMessage);
                }
            }
        }
        // ---------------------------------------------
    
        let currentTurnUserMessageForUI: ChatMessage | null = null;
        if (!isTemporaryContext) {
            currentTurnUserMessageForUI = { id: `msg-${Date.now()}-user-turn-${Math.random().toString(36).substring(2,7)}`, role: ChatMessageRole.USER, content: finalUserMessageInputForAPI.text, attachments: finalUserMessageInputForAPI.attachments?.map(att => ({...att})), timestamp: new Date() };
            userMessageIdForPotentialTitleUpdate = currentTurnUserMessageForUI.id;
        }
    
        setIsLoading(true);
        geminiRefs.abortController = new AbortController();
    
        const modelMessageId = geminiRefs.pendingMessageId || `msg-${Date.now()}-model-${Math.random().toString(36).substring(2,7)}`;
        geminiRefs.pendingMessageId = modelMessageId;
        const placeholderAiMessage: ChatMessage = { id: modelMessageId, role: ChatMessageRole.MODEL, content: '', timestamp: new Date(), isStreaming: true, characterName: characterNameForResponse };
    
        if (!isTemporaryContext && currentChatSession.settings.systemReminderFrequency && currentChatSession.settings.systemReminderFrequency > 0) {
            const freq = currentChatSession.settings.systemReminderFrequency;
            let userMsgCountSinceLastReminder = 0;
            for (let i = messagesForUIUpdate.length - 1; i >= 0; i--) {
                const msg = messagesForUIUpdate[i];
                if (msg.isSystemReminder) break;
                if (msg.role === ChatMessageRole.USER && !msg.isTimeMarker) userMsgCountSinceLastReminder++;
            }
            if ((userMsgCountSinceLastReminder + 1) >= freq) {
                const customReminder = settingsOverrideForAPICall.customReminderMessage || baseSettingsForAPICall.customReminderMessage;
                let reminderContent = "";
                if (customReminder && customReminder.trim() !== "") {
                    reminderContent = `<system_instructions_reminder>\n${customReminder}\n\n*** IMPORTANT INSTRUCTION TO MODEL ***\nThe text above represents the active system guidelines/reminders.\n1. Do NOT reply to this reminder.\n2. Do NOT acknowledge receipt.\n3. Strictly apply these guidelines to the NEXT message provided by the user immediately following this one.\n</system_instructions_reminder>`;
                } else {
                    const activeInstruction = settingsOverrideForAPICall.systemInstruction || baseSettingsForAPICall.systemInstruction || "You are a helpful AI assistant.";
                    reminderContent = `<system_instructions_reminder>\n${activeInstruction}\n\n*** IMPORTANT INSTRUCTION TO MODEL ***\nThe text above represents the active system guidelines.\n1. Do NOT reply to this reminder.\n2. Do NOT acknowledge receipt.\n3. Strictly apply these guidelines to the NEXT message provided by the user immediately following this one.\n</system_instructions_reminder>`;
                }
                const reminderMessage: ChatMessage = {
                    id: `sys-remind-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    role: ChatMessageRole.USER,
                    content: reminderContent,
                    timestamp: new Date(),
                    isSystemReminder: true
                };
                messagesForUIUpdate.push(reminderMessage);
            }
        }

        if (currentTurnUserMessageForUI) messagesForUIUpdate.push(currentTurnUserMessageForUI);
        
        const existingMessageIndex = messagesForUIUpdate.findIndex(m => m.id === modelMessageId);
        if (existingMessageIndex > -1) {
            messagesForUIUpdate[existingMessageIndex] = placeholderAiMessage;
        } else {
            messagesForUIUpdate.push(placeholderAiMessage);
        }
    
        let newTitleForSession = sessionToUpdate.title;
        const titleShouldChange = userMessageIdForPotentialTitleUpdate && sessionToUpdate.title === "New Chat" && historyForGeminiSDK.filter(m => m.role === ChatMessageRole.USER).length === 0;
        if (titleShouldChange) {
            newTitleForSession = (finalUserMessageInputForAPI.text || "Chat with attachments").substring(0, 35) + ((finalUserMessageInputForAPI.text.length > 35 || (!finalUserMessageInputForAPI.text && finalUserMessageInputForAPI.attachments && finalUserMessageInputForAPI.attachments.length > 0)) ? "..." : "");
        }
    
        await updateCurrentChatSession(s => s ? ({ ...s, messages: messagesForUIUpdate, lastUpdatedAt: new Date(), title: newTitleForSession }) : null);
        const sessionAfterUIMessageUpdate = useActiveChatStore.getState().currentChatSession;
        if (sessionAfterUIMessageUpdate) {
            await updateMessages(sessionAfterUIMessageUpdate.id, sessionAfterUIMessageUpdate.messages);
            if (titleShouldChange) await updateTitle(sessionAfterUIMessageUpdate.id, newTitleForSession);
        }
    
        const activeChatIdForThisCall = currentChatSession.id;
        let historyForAPICall = messagesForUIUpdate.slice(0, messagesForUIUpdate.length - 1); 
        if (currentTurnUserMessageForUI) historyForAPICall = historyForAPICall.slice(0, historyForAPICall.length - 1);

        const indexingContext = {
            sessionId: activeChatIdForThisCall,
            sessionTitle: newTitleForSession || "Untitled Chat",
            systemInstructionSnapshot: settingsOverrideForAPICall.systemInstruction || baseSettingsForAPICall.systemInstruction
        };

        const isReasoningEnabled = baseSettingsForAPICall.enableReasoningWorkflow;
        const reasoningSteps = baseSettingsForAPICall.reasoningSteps || [];
        let accumulatedThoughts: string[] = [];
        let stepProgressId = `reasoning-${Date.now()}`;

        if (isReasoningEnabled && reasoningSteps.length > 0) {
            startProgress(stepProgressId, 'Agent Reasoning', 'Initializing workflow...');
            try {
                for (let i = 0; i < reasoningSteps.length; i++) {
                    if (geminiRefs.requestCancelledByUser) throw new Error("Cancelled by user");
                    const step = reasoningSteps[i];
                    updateProgress(stepProgressId, ((i / reasoningSteps.length) * 100), `Step ${i+1}: ${step.title || 'Processing'}...`);
                    const agentModelId = baseSettingsForAPICall.agentModel || currentChatSession.model;
                    const stepResult = await executeAgenticStep(apiKeyForThisCall, agentModelId, historyForAPICall, step.instruction, finalUserMessageInputForAPI.text, accumulatedThoughts.join('\n\n'), baseSettingsForAPICall, logApiRequest);
                    accumulatedThoughts.push(`### Step ${i+1}: ${step.title}\n${stepResult}`);
                }
                finishProgress(stepProgressId, 'Reasoning complete. Generating response...', true);
            } catch (error: any) {
                finishProgress(stepProgressId, `Reasoning failed: ${error.message}`, false);
                accumulatedThoughts.push(`[SYSTEM ERROR DURING REASONING: ${error.message}]`);
            }
        }
        
        let thoughtContextString: string | undefined = undefined;
        if (accumulatedThoughts.length > 0) thoughtContextString = accumulatedThoughts.join('\n\n');
        let finalInputForModelGeneration = finalUserMessageInputForAPI; 

        // --- PREPARE STREAMING REGEX (PERFORMANCE OPTIMIZATION) ---
        const customTagName = baseSettingsForAPICall.customThoughtTagName;
        const enableCustomParsing = baseSettingsForAPICall.enableCustomThoughtParsing;
        
        // Prepare regex once to avoid recreation on every stream chunk
        let blockRegex: RegExp | null = null;
        let openTagRegex: RegExp | null = null;
        
        if (enableCustomParsing && customTagName) {
             blockRegex = new RegExp(`<\\s*${customTagName}(?:s)?\\b[^>]*>([\\s\\S]*?)<\\s*\\/\\s*${customTagName}(?:s)?\\s*>`, 'gi');
             openTagRegex = new RegExp(`<\\s*${customTagName}(?:s)?\\b[^>]*>`, 'i');
        }

        // --- STREAMING CALLBACK ---
        const handleStreamUpdate = (fullRawText: string) => {
            if (geminiRefs.requestCancelledByUser && geminiRefs.pendingMessageId === modelMessageId) return;
            
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
                if (!s || s.id !== activeChatIdForThisCall) return null;
                const newMessages = s.messages.map(msg => 
                    msg.id === modelMessageId 
                        ? { ...msg, content: visibleText, isStreaming: true } 
                        : msg
                );
                return { ...s, messages: newMessages };
            });
        };

        const handleFinalResponseSuccess = async (responseData: FullResponseData) => {
            if (geminiRefs.requestCancelledByUser && geminiRefs.pendingMessageId === modelMessageId) return;
            geminiRefs.onFullResponseCalledForPendingMessage = true;
            if (geminiRefs.generationStartTime) await setMessageGenerationTimes(prev => ({...prev, [modelMessageId]: (Date.now() - (geminiRefs.generationStartTime || 0)) / 1000}));
            
            let fullSession = useActiveChatStore.getState().currentChatSession;
            if (!fullSession || fullSession.id !== activeChatIdForThisCall) fullSession = await dbService.getChatSession(activeChatIdForThisCall);
            if (!fullSession) return;

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

            if (accumulatedThoughts.length > 0) {
                const agentThoughtsStr = accumulatedThoughts.join('\n\n');
                mergedThoughts = mergedThoughts ? `${agentThoughtsStr}\n\n---\n\n${mergedThoughts}` : agentThoughtsStr;
            }

            const isFavoritedViaMarker = finalResponseText.includes('[[FAV]]');

            const newAiMessage: ChatMessage = { 
                ...placeholderAiMessage, 
                content: finalResponseText, 
                thoughts: mergedThoughts, 
                groundingMetadata: responseData.groundingMetadata, 
                isStreaming: false, 
                timestamp: new Date(), 
                characterName: characterNameForResponse,
                hasMemoryUpdate: responseData.hasMemoryUpdate,
                toolInvocations: responseData.toolInvocations, 
                isFavorited: isFavoritedViaMarker,
                seedUsed: responseData.seedUsed 
            };

            const updatedMessages = fullSession.messages.map(msg => msg.id === modelMessageId ? newAiMessage : msg);
            
            const currentStoreSession = useActiveChatStore.getState().currentChatSession;
            const safeMemoryContent = (currentStoreSession?.id === activeChatIdForThisCall) 
                ? currentStoreSession.settings.memoryBoxContent 
                : fullSession.settings.memoryBoxContent;

            const updatedSettings = { 
                ...fullSession.settings,
                memoryBoxContent: safeMemoryContent 
            };
            if (responseData.hasMemoryUpdate) {
                updatedSettings.activeMemoryAnchorId = newAiMessage.id;
            }

            const updatedSession = { ...fullSession, messages: updatedMessages, settings: updatedSettings, lastUpdatedAt: new Date() };

            if (useActiveChatStore.getState().currentChatId === activeChatIdForThisCall) {
                useActiveChatStore.getState().updateCurrentChatSession(s => s ? ({ ...s, messages: updatedMessages, settings: updatedSettings, lastUpdatedAt: new Date() }) : null);
            }
            useChatListStore.getState().updateChatSessionInList(updatedSession);
            
            // PERSISTENCE POINT
            await updateMessages(updatedSession.id, updatedSession.messages);
            await dbService.updateSettingsInDB(updatedSession.id, updatedSettings); 

            await useAudioStore.getState().triggerAutoPlayForNewMessage(newAiMessage);

            // --- AUTO ANALYZE (LIBRARIAN) ---
            if (updatedSession.settings.isMemoryBoxEnabled) {
                // Fire and forget, background update
                useMemoryStore.getState().autoAnalyzeAndSave(updatedMessages).catch(err => {
                    // console.debug("Librarian background update failed silently:", err);
                });
            }
            // ---------------------------------

            // --- AUTO ARCHIVER CHECK ---
            if (updatedSession.settings.autoArchivingEnabled) {
                const { generateIncrementalChapter } = useArchiverStore.getState();
                generateIncrementalChapter(false).catch(err => console.error("Background auto-archive failed", err));
            }
            // ---------------------------

            if (!isTemporaryContext && apiKeyForThisCall) {
                const idsToUpdate: string[] = [];
                if (currentTurnUserMessageForUI) {
                    const success = await memoryService.indexMessage(apiKeyForThisCall, currentTurnUserMessageForUI, indexingContext);
                    if (success) idsToUpdate.push(currentTurnUserMessageForUI.id);
                }
                if (newAiMessage.content && newAiMessage.content.trim().length > 10) {
                    const pairContext = { ...indexingContext, precedingUserText: currentTurnUserMessageForUI?.content };
                    const success = await memoryService.indexMessage(apiKeyForThisCall, newAiMessage, pairContext);
                    if (success) idsToUpdate.push(newAiMessage.id);
                }

                if (idsToUpdate.length > 0) {
                    const activeStore = useActiveChatStore.getState();
                    if (activeStore.currentChatId === activeChatIdForThisCall && activeStore.currentChatSession) {
                        const messagesWithEmbeddingUpdate = activeStore.currentChatSession.messages.map(msg => idsToUpdate.includes(msg.id) ? { ...msg, isEmbedded: true } : msg);
                        await activeStore.updateCurrentChatSession(s => s ? ({ ...s, messages: messagesWithEmbeddingUpdate }) : null);
                        const finalSession = useActiveChatStore.getState().currentChatSession;
                        if (finalSession) await updateMessages(finalSession.id, finalSession.messages);
                    } else {
                        const dbSession = await dbService.getChatSession(activeChatIdForThisCall);
                        if (dbSession) {
                            const messagesWithEmbeddingUpdate = dbSession.messages.map(msg => idsToUpdate.includes(msg.id) ? { ...msg, isEmbedded: true } : msg);
                            await updateMessages(activeChatIdForThisCall, messagesWithEmbeddingUpdate);
                        }
                    }
                }
            }
        };

        const handleFinalResponseError = async (errorMsg: string, isAbortError: boolean) => {
            removeProgress(stepProgressId); 
            if (geminiRefs.requestCancelledByUser && geminiRefs.pendingMessageId === modelMessageId) { setIsLoading(false); setLastMessageHadAttachments(false); return; }
            geminiRefs.onFullResponseCalledForPendingMessage = false;
            
            const errorObj = { message: errorMsg };
            const errorType = classifyGeminiError(errorObj);
            const localizedErrorMsg = formatGeminiError(errorObj);
            const finalErrorMessage = isAbortError ? `Response aborted.` : localizedErrorMsg;

            let fullSession = useActiveChatStore.getState().currentChatSession;
            if (!fullSession || fullSession.id !== activeChatIdForThisCall) fullSession = await dbService.getChatSession(activeChatIdForThisCall);
            if (!fullSession) return;
            
            const updatedMessages = fullSession.messages.map(msg => msg.id === modelMessageId ? { 
                ...msg, 
                isStreaming: false, 
                role: ChatMessageRole.ERROR, 
                content: finalErrorMessage, 
                characterName: characterNameForResponse,
                errorType: errorType 
            } : msg);
            
            const updatedSession = { ...fullSession, messages: updatedMessages, lastUpdatedAt: new Date() };
            if (useActiveChatStore.getState().currentChatId === activeChatIdForThisCall) {
                useActiveChatStore.getState().updateCurrentChatSession(s => s ? ({ ...s, messages: updatedMessages, lastUpdatedAt: new Date() }) : null);
            }
            useChatListStore.getState().updateChatSessionInList(updatedSession);
            await updateMessages(updatedSession.id, updatedSession.messages);
            if (!geminiRefs.requestCancelledByUser && geminiRefs.pendingMessageId === modelMessageId) { setIsLoading(false); setLastMessageHadAttachments(false); }
        };

        const handleFinalResponseComplete = async () => {
            keepAliveService.stop();

            const currentPendingMsgIdForComplete = geminiRefs.pendingMessageId;
            if (currentPendingMsgIdForComplete === modelMessageId) {
                setIsLoading(false); setLastMessageHadAttachments(false);
                if (!geminiRefs.onFullResponseCalledForPendingMessage) {
                    let fullSession = useActiveChatStore.getState().currentChatSession;
                    if (!fullSession || fullSession.id !== activeChatIdForThisCall) fullSession = await dbService.getChatSession(activeChatIdForThisCall);
                    if (fullSession) {
                        const messageInState = fullSession.messages.find(m => m.id === modelMessageId);
                        if (messageInState && messageInState.isStreaming && messageInState.role !== ChatMessageRole.ERROR) {
                            const updatedMessages = fullSession.messages.map(msg => msg.id === modelMessageId ? { ...msg, isStreaming: false, role: ChatMessageRole.ERROR, content: "Response processing failed or stream ended unexpectedly.", timestamp: new Date(), characterName: characterNameForResponse } : msg);
                            const updatedSession = { ...fullSession, messages: updatedMessages, lastUpdatedAt: new Date() };
                            if (useActiveChatStore.getState().currentChatId === activeChatIdForThisCall) {
                                useActiveChatStore.getState().updateCurrentChatSession(s => s ? ({ ...s, messages: updatedMessages, lastUpdatedAt: new Date() }) : null);
                            }
                            useChatListStore.getState().updateChatSessionInList(updatedSession);
                            await updateMessages(updatedSession.id, updatedSession.messages);
                        } else {
                            useChatListStore.getState().updateChatSessionInList({ ...fullSession, lastUpdatedAt: new Date() });
                        }
                    }
                } else {
                    useChatListStore.getState().updateChatSessionInList({ id: activeChatIdForThisCall, lastUpdatedAt: new Date() } as any);
                }
                geminiRefs.pendingMessageId = null; geminiRefs.originalMessageSnapshot = null;
            }
            if (geminiRefs.abortController && currentPendingMsgIdForComplete === modelMessageId) geminiRefs.abortController = null;
            if (currentPendingMsgIdForComplete === modelMessageId) geminiRefs.requestCancelledByUser = false;
            geminiRefs.onFullResponseCalledForPendingMessage = false;
        };

        if (baseSettingsForAPICall.enableShadowMode) {
            const defaultShadowPersona = "You are a direct responder. You take the conversation transcript and reply as the AI entity defined by the user.";
            const defaultShadowTask = "Reply to the last user message naturally based on the transcript.";
            try {
                if (baseSettingsForAPICall.debugApiRequests) {
                    logApiRequest({ requestType: 'models.generateContent', payload: { model: 'SHADOW_MODE', contents: "Bypassing main model, calling shadow service directly." }, characterName: characterNameForResponse });
                }
                const shadowResultObj = await generateShadowResponse(apiKeyForThisCall, baseSettingsForAPICall.agentModel || currentChatSession.model, historyForAPICall, finalUserMessageInputForAPI.text || "[No Text]", baseSettingsForAPICall.shadowPersona || defaultShadowPersona, baseSettingsForAPICall.shadowTaskInstruction || defaultShadowTask, baseSettingsForAPICall, logApiRequest);
                const shadowResultText = shadowResultObj.text;
                const shadowThoughts = shadowResultObj.thoughts; 
                const shadowHasUpdate = shadowResultObj.hasMemoryUpdate;
                let mergedThoughts = shadowThoughts;
                if (accumulatedThoughts.length > 0) {
                    const agentThoughtsStr = accumulatedThoughts.join('\n\n');
                    mergedThoughts = mergedThoughts ? `${agentThoughtsStr}\n\n---\n\n${mergedThoughts}` : agentThoughtsStr;
                }
                const responseData: FullResponseData = { text: shadowResultText, thoughts: mergedThoughts, groundingMetadata: undefined, hasMemoryUpdate: shadowHasUpdate, seedUsed: finalSeed };
                await handleFinalResponseSuccess(responseData);
                await handleFinalResponseComplete();
            } catch (e: any) {
                console.error("Shadow Mode Failed:", e);
                await handleFinalResponseError(e.message, false);
                await handleFinalResponseComplete();
            }
        } else {
            try {
                await getFullChatResponse({
                    apiKey: apiKeyForThisCall,
                    sessionId: activeChatIdForThisCall,
                    userMessageInput: finalInputForModelGeneration,
                    model: currentChatSession.model,
                    baseSettings: baseSettingsForAPICall,
                    currentChatMessages: historyForAPICall, 
                    thoughtInjectionContext: thoughtContextString, 
                    onFullResponse: handleFinalResponseSuccess,
                    onError: handleFinalResponseError,
                    onComplete: handleFinalResponseComplete,
                    onStreamUpdate: handleStreamUpdate, 
                    logApiRequestCallback: logApiRequest,
                    signal: geminiRefs.abortController.signal,
                    settingsOverride: settingsOverrideForAPICall,
                    allAiCharactersInSession: currentChatSession.aiCharacters,
                    generatingMessageId: modelMessageId 
                } as any);
            } catch (e: any) {
                await handleFinalResponseError(e.message, false);
                await handleFinalResponseComplete();
            }
        }
      },

    handleContinueFlow: async () => {
        const { currentChatSession } = useActiveChatStore.getState();
        const { activeApiKey, rotateActiveKey } = useApiKeyStore.getState();
        const { updateMessages } = useDataStore.getState();
        const { setIsLoading, logApiRequest } = useGeminiStatusStore.getState();
        const isLoading = useGeminiStatusStore.getState().isLoading;
        if (!currentChatSession || isLoading || currentChatSession.isCharacterModeActive || currentChatSession.messages.length === 0) return;
        await rotateActiveKey();
        geminiRefs.requestCancelledByUser = false;
        const { settings, model, messages } = currentChatSession;
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === ChatMessageRole.MODEL) {
            setIsLoading(true);
            geminiRefs.abortController = new AbortController();
            try {
                const historyForMimic = mapMessagesToFlippedRoleGeminiHistory(messages, settings);
                const mimicContent = await generateMimicUserResponse(activeApiKey?.value || '', model, historyForMimic, settings.userPersonaInstruction || '', settings, logApiRequest, geminiRefs.abortController.signal);
                if (geminiRefs.requestCancelledByUser) return;
                setIsLoading(false); 
                await get().handleSendMessage(mimicContent, [], messages);
            } catch (error: any) {
                console.error("Error during Continue Flow:", error);
                const errorMessage = `Flow generation failed: ${error.message}`;
                await useActiveChatStore.getState().updateCurrentChatSession(session => session ? ({ ...session, messages: [...session.messages, {id: `err-${Date.now()}`, role: ChatMessageRole.ERROR, content: errorMessage, timestamp: new Date()}]}) : null);
                const sessionAfterError = useActiveChatStore.getState().currentChatSession;
                if (sessionAfterError) await updateMessages(sessionAfterError.id, sessionAfterError.messages);
                setIsLoading(false);
            }
        } else {
            await get().handleSendMessage('', [], messages);
        }
    },
}));
