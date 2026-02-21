
import { create } from 'zustand';
import { ChatSession } from '../types.ts';
import * as dbService from '../services/dbService.ts';
import { METADATA_KEYS } from '../services/dbService.ts';
import { useChatListStore } from './useChatListStore.ts';
import { useDataStore } from './useDataStore.ts';
import { DEFAULT_SETTINGS } from '../constants.ts';

interface ActiveChatState {
  currentChatId: string | null;
  currentChatSession: ChatSession | null;
  loadActiveChatId: () => Promise<void>;
  selectChat: (id: string | null) => Promise<void>;
  updateCurrentChatSession: (updater: (session: ChatSession) => ChatSession | null) => Promise<void>;
}

export const useActiveChatStore = create<ActiveChatState>((set, get) => ({
  currentChatId: null,
  currentChatSession: null,

  loadActiveChatId: async () => {
    // This should be called after chatHistory is loaded
    try {
      const activeChatId = await dbService.getAppMetadata<string | null>(METADATA_KEYS.ACTIVE_CHAT_ID);
      const { chatHistory, createNewChat } = useChatListStore.getState();
      if (chatHistory.length > 0) {
        // We verify existence using the summary list (fast)
        const validActiveChatId = activeChatId && chatHistory.find(s => s.id === activeChatId) ? activeChatId : chatHistory[0].id;
        // selectChat handles the full data fetch
        await get().selectChat(validActiveChatId);
      } else {
        // Automatically create a new chat if no history exists to prevent empty state confusion
        await createNewChat();
      }
    } catch (error) {
        console.error("Failed to load active chat ID from IndexedDB:", error);
        set({ currentChatId: null, currentChatSession: null });
    }
  },

  selectChat: async (id: string | null) => {
    const chatList = useChatListStore.getState().chatHistory;

    if (!id) {
        set({ currentChatId: null, currentChatSession: null });
        await dbService.setAppMetadata(METADATA_KEYS.ACTIVE_CHAT_ID, null);
        return;
    }

    // Attempt to fetch full session details (including messages) from DB
    let fullSession: ChatSession | undefined;
    try {
        fullSession = await dbService.getChatSession(id);
    } catch (e) {
        console.error("Failed to fetch chat session from DB:", e);
    }

    // Fallback: If DB fetch fails or returns nothing (race condition or not persisted yet),
    // check the memory list. Note: The list usually contains summaries (empty messages),
    // so this is a robust fallback for metadata, but messages might be missing.
    if (!fullSession) {
        fullSession = chatList.find(s => s.id === id);
    }

    set({ 
      currentChatId: id, 
      currentChatSession: fullSession || null 
    });
    await dbService.setAppMetadata(METADATA_KEYS.ACTIVE_CHAT_ID, id);
  },

  updateCurrentChatSession: async (updater) => {
    const { currentChatSession } = get();
    if (!currentChatSession) return;

    const updatedSessionCandidate = updater(currentChatSession);
    if (updatedSessionCandidate === null) return; // No update

    const finalUpdatedSession = { ...updatedSessionCandidate, lastUpdatedAt: new Date() };
    
    // Update the list store (List store will strip messages internally to keep it light)
    useChatListStore.getState().updateChatSessionInList(finalUpdatedSession);
    
    // Update self (Active store keeps full object)
    set({ currentChatSession: finalUpdatedSession });
  },
}));

let hasInitialized = false;
// This listener runs when isLoadingData changes to false in list store.
useChatListStore.subscribe(
  (state, prevState) => {
    if (state.isLoadingData !== prevState.isLoadingData && !state.isLoadingData && !hasInitialized) {
      useActiveChatStore.getState().loadActiveChatId();
      hasInitialized = true;
    }
  }
);