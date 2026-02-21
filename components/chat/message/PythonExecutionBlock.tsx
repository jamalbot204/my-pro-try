import React, { memo, useState, Suspense } from 'react';
import { ToolInvocation } from '../../../types.ts';
import { ChevronDownIcon, ChevronRightIcon, CheckCircleIcon, XCircleIcon, ArrowDownTrayIcon, ExportBoxIcon } from '../../common/Icons.tsx';

// Lazy load CodeBlockHighlighter from common
const CodeBlockHighlighter = React.lazy(() => import('../../common/CodeBlockHighlighter.tsx'));

interface PythonExecutionBlockProps {
  invocation: ToolInvocation;
}

const PythonExecutionBlock: React.FC<PythonExecutionBlockProps> = memo(({ invocation }) => {
  const [isExpanded, setIsExpanded] = useState(true); 
  const [isOutputDocked, setIsOutputDocked] = useState(false); 
  
  const { args, result, isError } = invocation;
  const code = args.code || '';

  const borderColor = isError ? 'border-red-500/30' : 'border-cyan-500/30';
  const bgColor = isError ? 'bg-red-950/20' : 'bg-cyan-950/20';
  const textColor = isError ? 'text-red-300' : 'text-cyan-300';
  const headerHover = isError ? 'hover:bg-red-950/40' : 'hover:bg-cyan-950/40';

  const toggleDocking = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsOutputDocked(!isOutputDocked);
      if (!isOutputDocked) setIsExpanded(true);
  };

  const OutputContent = () => (
      <pre className={`whitespace-pre-wrap break-all font-mono text-xs ${isError ? 'text-red-300' : 'text-green-300'} ${isOutputDocked ? 'p-3' : 'py-2 px-1'}`}>
          {result || <span className="text-gray-500 italic">No output</span>}
      </pre>
  );

  return (
    <div className="w-full my-2 flex flex-col">
      <div className={`rounded-md border ${borderColor} ${bgColor} overflow-hidden font-mono text-xs transition-all duration-200`}>
          <div
            className={`w-full flex items-center justify-between p-2 transition-colors cursor-pointer select-none ${headerHover}`}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center space-x-2">
              <div className={`p-1 rounded bg-black/40 ${textColor}`}>
                 <span className="font-bold text-[10px]">PY</span>
              </div>
              <span className={`font-semibold ${textColor}`}>
                {isError ? "Execution Error" : "Python Executed"}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
                <button 
                    onClick={toggleDocking}
                    className={`p-1 rounded hover:bg-white/10 ${textColor} opacity-70 hover:opacity-100 transition-all`}
                    title={isOutputDocked ? "Undock Output (Show in Chat)" : "Dock Output (Move to Box)"}
                >
                    {isOutputDocked ? <ExportBoxIcon className="w-3.5 h-3.5" /> : <ArrowDownTrayIcon className="w-3.5 h-3.5" />}
                </button>

                <div className="w-px h-3 bg-white/10 mx-1"></div>

                {isError ? <XCircleIcon className="w-4 h-4 text-red-400" /> : <CheckCircleIcon className="w-4 h-4 text-green-400" />}
                {isExpanded ? <ChevronDownIcon className={`w-4 h-4 ${textColor}`} /> : <ChevronRightIcon className={`w-4 h-4 ${textColor}`} />}
            </div>
          </div>

          {isExpanded && (
            <div className="border-t border-white/5 bg-[#0d1117]">
                <div className={`${isOutputDocked ? 'border-b border-white/5' : ''}`}>
                    <div className="px-3 py-1 bg-white/5 text-[10px] text-gray-500 uppercase tracking-wider font-bold flex justify-between items-center">
                        <span>Input</span>
                    </div>
                    <div className="overflow-x-auto max-h-60 custom-scrollbar">
                        <Suspense fallback={<pre className="p-3 text-gray-300">{code}</pre>}>
                            <CodeBlockHighlighter language="python" codeString={code} />
                        </Suspense>
                    </div>
                </div>

                {isOutputDocked && (
                    <div className="animate-fade-in">
                        <div className="px-3 py-1 bg-white/5 text-[10px] text-gray-500 uppercase tracking-wider font-bold border-b border-white/5">Output</div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            <OutputContent />
                        </div>
                    </div>
                )}
            </div>
          )}
      </div>

      {!isOutputDocked && (
          <div className={`mt-1 ml-1 pl-3 border-l-2 ${borderColor} animate-fade-in`}>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1 opacity-70">Result</div>
              <OutputContent />
          </div>
      )}
    </div>
  );
});

export default PythonExecutionBlock;