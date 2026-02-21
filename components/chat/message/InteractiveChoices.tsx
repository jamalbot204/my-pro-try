
import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useGeminiApiStore } from '../../../store/useGeminiApiStore.ts';

interface InteractiveChoicesProps {
    choices: string[];
}

const InteractiveChoices: React.FC<InteractiveChoicesProps> = memo(({ choices }) => {
    const { handleSendMessage, isLoading } = useGeminiApiStore();

    if (choices.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2 mt-3 animate-fade-in">
            {choices.map((choice, idx) => (
                <button
                    key={idx}
                    onClick={() => handleSendMessage(choice)}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600/80 hover:bg-indigo-500 rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-400/30 markdown-content"
                >
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                            p: ({node, ...props}) => <span {...props} />, // Render paragraphs as spans to ensure valid HTML inside button
                            // Ensure links don't break button click behavior, treat them as styled text or prevent default
                            a: ({node, ...props}) => <span className="underline decoration-dotted" {...props} />
                        }}
                    >
                        {choice}
                    </ReactMarkdown>
                </button>
            ))}
        </div>
    );
});

export default InteractiveChoices;
