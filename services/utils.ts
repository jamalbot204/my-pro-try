
// services/utils.ts
import { ChatMessage, ChatMessageRole, Attachment } from '../types.ts';

const SMART_SPLIT_SEARCH_RANGE = 50; // Words before and after the ideal split point.

// Global Best Practice: Whitelist standard HTML tags to allow rich text rendering (bold, breaks, tables).
// All other tags (custom XML, thoughts, artifacts) will be treated as raw data.
export const STANDARD_HTML_TAGS = new Set([
    'a', 'b', 'i', 'em', 'strong', 'p', 'div', 'span', 'br', 'hr',
    'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'img', 'del', 'sup', 'sub', 'details', 'summary'
]);

/**
 * Pre-processes text to handle custom formatting before Markdown rendering.
 * 1. Highlights quoted text in Amber/Gold.
 * 2. Converts {Section Title} into styled header blocks.
 * 3. Fences non-standard XML tags (like <thought>) to prevent browser hiding.
 * 
 * NOTE: It splits text by code blocks first to prevent modifying code syntax.
 */
export const preprocessMessageContent = (text: string): string => {
    if (!text) return text;

    // Split by code blocks (```...``` or `...`) to avoid modifying code content
    // Regex matches:
    // 1. Triple backticks block (lazy match)
    // 2. OR Single backtick inline code (lazy match)
    const parts = text.split(/(```[\s\S]*?```|`[^`\n]+`)/g);

    for (let i = 0; i < parts.length; i++) {
        // Only process parts that are NOT code blocks
        if (!parts[i].startsWith('`')) {
            
            // 1. [REMOVED] Highlight Quoted Text via HTML Injection
            // We now handle this in the React Rendering layer (MessageContent.tsx)
            // to prevent "flashing code" issues during streaming.

            // 2. Dynamic Section Headers: {Title} -> Styled Div
            // Matches {Text} where Text doesn't contain newlines or other braces
            parts[i] = parts[i].replace(
                /\{([^{}\n]+)\}/g, 
                '\n<div class="section-header w-full my-6 px-4 py-2 bg-emerald-700 text-white font-bold rounded-lg shadow-md border-l-4 border-emerald-400 flex items-center"><span class="mr-2 opacity-80">#</span> $1</div>\n'
            );

            // 3. Hide [[FAV]] marker visually
            // Replaces the specific favorite tag with an empty string so it's not seen in the chat UI
            parts[i] = parts[i].replace(/\[\[FAV\]\]/g, '');
        }
    }

    // Rejoin parts
    let processed = parts.join('');

    // 4. Custom Tag Fencing (Runs globally as XML tags often span lines and aren't code blocks)
    // Regex Explanation:
    // <([a-zA-Z][\w-]*)   -> Match opening tag start (e.g., <thought)
    // \b[^>]*>            -> Match attributes and closing bracket of opening tag
    // ([\s\S]*?)          -> Match content (non-greedy, including newlines)
    // <\/\1>              -> Match corresponding closing tag
    processed = processed.replace(/<([a-zA-Z][\w-]*)\b[^>]*>([\s\S]*?)<\/\1>/g, (match, tagName) => {
        // If it's standard HTML, leave it alone to render normally
        if (STANDARD_HTML_TAGS.has(tagName.toLowerCase())) {
            return match;
        }
        
        // If it's a custom tag:
        // Check if it's multiline. If yes, use block code fences (```xml ... ```)
        // If single line, use inline code fences (` ... `)
        if (match.includes('\n')) {
            // Ensure distinct block separation
            return `\n\`\`\`xml\n${match}\n\`\`\`\n`;
        } else {
            return ` \`${match}\` `;
        }
    });

    return processed;
};

/**
 * Splits text into segments for Text-to-Speech processing.
 * This function implements a "smart split" logic. If the text exceeds `maxWordsPerSegment`,
 * it calculates an ideal split point and then searches for the nearest sentence-ending
 * punctuation (`.`, `?`, `!`) within a defined word range to create more natural breaks.
 * 
 * Note: This function strips out Markdown code blocks (```...```) and emojis before processing to avoid reading raw code or graphic descriptions.
 *
 * @param fullText The complete text to be split.
 * @param maxWordsPerSegment The maximum number of words allowed in a single segment, or undefined/non-positive for no splitting.
 * @returns An array of text segments.
 */
export const splitTextForTts = (fullText: string, maxWordsPerSegment?: number): string[] => {
  // Remove code blocks (content between triple backticks) using regex.
  // [\s\S]*? matches any character including newlines, non-greedily.
  let cleanText = fullText.replace(/```[\s\S]*?```/g, '');

  // Remove emojis using Unicode Property Escapes
  cleanText = cleanText.replace(/\p{Extended_Pictographic}/gu, '');

  const words = cleanText.trim().split(/\s+/).filter(Boolean);
  const totalWords = words.length;

  if (totalWords === 0) {
    return [];
  }

  // If maxWordsPerSegment is not defined, is non-positive, or if totalWords is within the limit, don't split.
  if (maxWordsPerSegment === undefined || maxWordsPerSegment <= 0 || totalWords <= maxWordsPerSegment) {
    return [cleanText];
  }

  const segments: string[] = [];
  let remainingWords = [...words];
  let numSegmentsToCreate = Math.ceil(totalWords / maxWordsPerSegment);

  while (remainingWords.length > 0 && numSegmentsToCreate > 1) {
    const idealSplitPoint = Math.ceil(remainingWords.length / numSegmentsToCreate);
    
    // Define search boundaries within the remaining text
    const searchStart = Math.max(0, idealSplitPoint - SMART_SPLIT_SEARCH_RANGE);
    const searchEnd = Math.min(remainingWords.length - 1, idealSplitPoint + SMART_SPLIT_SEARCH_RANGE);

    const possibleSplitIndices: number[] = [];
    for (let i = searchStart; i <= searchEnd; i++) {
        const word = remainingWords[i];
        if (word.endsWith('.') || word.endsWith('?') || word.endsWith('!')) {
            possibleSplitIndices.push(i);
        }
    }

    let bestSplitIndex = -1;
    if (possibleSplitIndices.length > 0) {
        // Find the index in the possible list that is closest to idealSplitPoint
        bestSplitIndex = possibleSplitIndices.reduce((prev, curr) => {
            return (Math.abs(curr - idealSplitPoint) < Math.abs(prev - idealSplitPoint)) ? curr : prev;
        });
    }

    // If no sentence end was found, fallback to the ideal split point
    const fallbackSplitPoint = Math.min(idealSplitPoint, remainingWords.length - 1);
    const splitIndex = (bestSplitIndex !== -1) ? bestSplitIndex : fallbackSplitPoint;

    // Create the segment. The split is *after* the word at splitIndex.
    const segmentWords = remainingWords.slice(0, splitIndex + 1);
    if (segmentWords.length > 0) {
      segments.push(segmentWords.join(' '));
    }

    // Update remaining words and segments count
    remainingWords = remainingWords.slice(splitIndex + 1);
    numSegmentsToCreate--;
  }

  // Add the final remaining part as the last segment
  if (remainingWords.length > 0) {
    segments.push(remainingWords.join(' '));
  }

  return segments.filter(s => s.trim() !== "");
};


export function sanitizeFilename(
    name: string,
    maxLength: number = 50
  ): string {
    const replacement = '_';
    if (!name) return '';
  
    // Preserve original casing, do not convert to lowercase.
    let SaneName = name;
  
    // First, replace known invalid filesystem characters.
    // Invalid chars are typically: < > : " / \ | ? *
    SaneName = SaneName.replace(/[<>:"/\\|?*]+/g, '');
  
    // Next, replace sequences of whitespace and hyphens with a single replacement character.
    SaneName = SaneName.replace(/[\s-]+/g, replacement);
  
    // In case the previous steps created multiple underscores, condense them.
    SaneName = SaneName.replace(/_+/g, replacement);
  
    // Remove leading/trailing replacement characters that might have been created.
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const trimRegex = new RegExp(`^${escapeRegex(replacement)}+|${escapeRegex(replacement)}+$`, 'g');
    SaneName = SaneName.replace(trimRegex, '');
  
    // Truncate to the desired maxLength.
    if (SaneName.length > maxLength) {
      SaneName = SaneName.substring(0, maxLength);
      // After truncating, clean up any trailing underscores again.
      SaneName = SaneName.replace(new RegExp(`${escapeRegex(replacement)}+$`), '');
    }
    
    // If the name is empty after sanitization (e.g., it only contained invalid characters),
    // provide a default fallback name.
    if (!SaneName.trim() && name) {
        return 'untitled';
    }
  
    return SaneName;
}

export function triggerDownload(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Helper for useGemini.ts
export const findPrecedingUserMessageIndex = (messages: ChatMessage[], targetMessageIndex: number): number => {
  for (let i = targetMessageIndex - 1; i >= 0; i--) {
    if (messages[i].role === ChatMessageRole.USER) {
      return i;
    }
  }
  return -1;
};

export const getHistoryUpToMessage = (messages: ChatMessage[], messageIndex: number): ChatMessage[] => {
  if (messageIndex < 0 || messageIndex >= messages.length) {
    return messages; // Return all messages if index is out of bounds, or handle as an error
  }
  return messages.slice(0, messageIndex);
};

export const getDisplayFileType = (file: Attachment): string => {
  if (file.type === 'image') return "Image";
  if (file.type === 'video') return "Video";
  if (file.mimeType === 'application/pdf') return "PDF";
  if (file.mimeType.startsWith('text/') || file.mimeType.includes('json') || file.mimeType.includes('javascript') || file.mimeType.includes('python')) return "Text";
  return "File";
};

export const parseInteractiveChoices = (content: string): { cleanContent: string; choices: string[] } => {
    const regex = /\{\{(.+?)\}\}/g;
    const choices: string[] = [];
    const cleanContent = content.replace(regex, (match, group1) => {
        choices.push(group1.trim());
        return ''; // Remove from display
    });
    return { cleanContent: cleanContent.trim(), choices };
};
