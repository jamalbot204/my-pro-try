import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SparklesIcon, ChevronDownIcon, ChevronRightIcon } from '../../common/Icons.tsx';

interface MessageThoughtsProps {
  messageId: string;
  thoughts: string;
  isExpanded: boolean;
  onToggle: () => void;
}

const MessageThoughts: React.FC<MessageThoughtsProps> = memo(({ messageId, thoughts, isExpanded, onToggle }) => {
  if (!thoughts) return null;

  return (
    <div className="w-full mb-1.5">
        <div className="bg-slate-800/50 border border-slate-700/80 rounded-lg shadow-md">
            <button onClick={onToggle} className="w-full flex items-center justify-between p-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-700/70 rounded-t-lg focus:outline-none" aria-expanded={isExpanded} aria-controls={`thoughts-content-${messageId}`}>
                <div className="flex items-center">
                    <SparklesIcon className="w-4 h-4 mr-2 text-blue-400" />
                    <span className="font-medium">Thoughts <span className="text-xs text-slate-400">(experimental)</span></span>
                </div>
                <div className="flex items-center text-slate-400">
                    <span className="mr-1 text-xs">{isExpanded ? 'Collapse' : 'Expand'}</span>
                    {isExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                </div>
            </button>
            {isExpanded && (
                <div id={`thoughts-content-${messageId}`} className="p-3 border-t border-slate-700/80 markdown-content text-xs text-slate-300 max-h-48 overflow-y-auto">
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                            a: (props: any) => <a target="_blank" rel="noopener noreferrer" {...props} />
                        }}
                    >
                        {thoughts}
                    </ReactMarkdown>
                </div>
            )}
        </div>
    </div>
  );
});

export default MessageThoughts;