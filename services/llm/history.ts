
import { Part } from "@google/genai";
import { ChatMessage, ChatMessageRole, GeminiSettings, GeminiHistoryEntry, AICharacter } from '../../types.ts';

export function mapMessagesToGeminiHistoryInternal(
  messages: ChatMessage[],
  settings?: GeminiSettings
): GeminiHistoryEntry[] {
  // CHANGED: Removed `&& !msg.hasMemoryUpdate` to preserve continuity of model responses that triggered updates.
  let eligibleMessages = messages.filter(
    msg => (msg.role === ChatMessageRole.USER || msg.role === ChatMessageRole.MODEL)
  );

  const maxMessages = settings?.contextWindowMessages;

  if (typeof maxMessages === 'number' && maxMessages > 0 && eligibleMessages.length > maxMessages) {
    eligibleMessages = eligibleMessages.slice(-maxMessages);
  }

  return eligibleMessages.map(msg => {
    const parts: Part[] = [];
    // We strictly use the content as is, no more injected timestamps.
    let baseContent = msg.content;
    
    // Check if Python Execution History should be injected into the context for memory
    if (settings?.includePythonHistory && msg.toolInvocations && msg.toolInvocations.length > 0) {
        const pythonInvocations = msg.toolInvocations.filter(inv => inv.toolName === 'execute_python');
        if (pythonInvocations.length > 0) {
            const historyBlock = pythonInvocations.map(inv => {
                return `[SYSTEM: EXECUTED PYTHON CODE]\nCode:\n${inv.args.code}\nResult:\n${inv.result}`;
            }).join('\n\n');
            
            // Append execution history to the content string sent to the model
            baseContent = baseContent ? `${baseContent}\n\n${historyBlock}` : historyBlock;
        }
    }
    
    if (baseContent.trim() || msg.isGithubContextMessage) {
      parts.push({ text: baseContent });
    }
    
    // STRICT CLOUD-ONLY IMPLEMENTATION (Relaxed Validation)
    if (msg.attachments) {
      msg.attachments.forEach(att => {
        // We prioritize sending the URI if it exists, regardless of local state tracking.
        // If the link is expired or invalid, the Gemini Server will return an error (e.g. 403/404),
        // which the UI handles by showing the "Refresh Attachments" button.
        if (att.fileUri) {
          parts.push({
            fileData: {
              mimeType: att.mimeType,
              fileUri: att.fileUri,
            }
          });
        }
      });
    }
    
    if (parts.length === 0 && (msg.role === ChatMessageRole.USER || msg.role === ChatMessageRole.MODEL)) { 
      parts.push({ text: "" }); 
    }
    
    return {
      role: msg.role as 'user' | 'model',
      parts: parts,
    };
  });
}

export function mapMessagesToFlippedRoleGeminiHistory(
    messages: ChatMessage[],
    settings?: GeminiSettings
): GeminiHistoryEntry[] {
    const history = mapMessagesToGeminiHistoryInternal(messages, settings);
    return history.map(entry => ({
        role: entry.role === 'user' ? 'model' : 'user',
        parts: entry.parts
    }));
}

export function mapMessagesToCharacterPerspectiveHistory(
    messages: ChatMessage[],
    characterId: string,
    allCharacters: AICharacter[],
    settings: GeminiSettings
): GeminiHistoryEntry[] {
    // CHANGED: Removed `&& !m.hasMemoryUpdate` to consistency.
    const validMessages = messages.filter(m => (m.role === ChatMessageRole.USER || m.role === ChatMessageRole.MODEL));
    const contextWindow = settings.contextWindowMessages;
    const msgsToMap = (contextWindow && contextWindow > 0) ? validMessages.slice(-contextWindow) : validMessages;

    const history: GeminiHistoryEntry[] = [];
    const targetChar = allCharacters.find(c => c.id === characterId);

    msgsToMap.forEach(msg => {
        const parts: Part[] = [];
        let content = msg.content;

        if (content) {
            if (msg.role === ChatMessageRole.MODEL) {
                if (msg.characterName) {
                    if (targetChar && msg.characterName === targetChar.name) {
                        // This matches the character perspective we are generating for.
                    } else {
                        // Another character speaking. Maps to 'user' role with name prefix.
                        content = `${msg.characterName}: ${content}`;
                    }
                } else {
                    // Generic AI message. Maps to 'user' role with name prefix.
                    content = `Assistant: ${content}`;
                }
            } else {
                // User message. Maps to 'user' role with name prefix.
                content = `User: ${content}`;
            }
            parts.push({ text: content });
        }

        // STRICT CLOUD-ONLY IMPLEMENTATION (Relaxed Validation)
        if (msg.attachments) {
            msg.attachments.forEach(att => {
                if (att.fileUri) {
                    parts.push({ fileData: { mimeType: att.mimeType, fileUri: att.fileUri } });
                }
            });
        }

        if (parts.length > 0) {
            let role: 'user' | 'model' = 'user';
            if (msg.role === ChatMessageRole.MODEL && targetChar && msg.characterName === targetChar.name) {
                role = 'model';
            }
            history.push({ role, parts });
        }
    });

    return history;
}
