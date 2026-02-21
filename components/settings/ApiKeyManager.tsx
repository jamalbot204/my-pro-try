import React, { memo, useCallback, useRef } from 'react';
import { useApiKeyStore } from '../../store/useApiKeyStore.ts';
import { useConfirmationUI } from '../../store/ui/useConfirmationUI.ts';
import { ApiKey } from '../../types.ts';
import { PlusIcon, TrashIcon, CheckIcon, ChevronDoubleUpIcon, EyeIcon, EyeOffIcon, ArrowPathIcon, GripVerticalIcon, KeyIcon } from '../common/Icons.tsx';

const ApiKeyItem: React.FC<{
  apiKey: ApiKey;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isKeyVisible: boolean;
  onUpdate: (id: string, name: string, value: string) => void;
  onDelete: (id: string) => void;
  onMoveToEdge: (id: string, edge: 'top' | 'bottom') => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnter: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnd: () => void;
}> = memo(({ apiKey, index, isFirst, isLast, isKeyVisible, onUpdate, onDelete, onMoveToEdge, onDragStart, onDragEnter, onDragEnd }) => {

  const handleDeleteClick = useCallback(() => {
    onDelete(apiKey.id);
  }, [onDelete, apiKey.id]);

  const handleMoveToTop = useCallback(() => onMoveToEdge(apiKey.id, 'top'), [apiKey.id, onMoveToEdge]);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragEnter={(e) => onDragEnter(e, index)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      className={`relative p-3 mb-3 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-500/5 to-transparent flex flex-col sm:flex-row items-center gap-3 cursor-move group transition-all hover:bg-white/5 ${isFirst ? 'ring-1 ring-yellow-500/30' : ''}`}
    >
      {/* Drag Handle & Active Indicator */}
      <div className="flex items-center self-start sm:self-center">
        <div className="cursor-grab active:cursor-grabbing p-1 text-gray-500 hover:text-gray-300 flex-shrink-0">
            <GripVerticalIcon className="w-5 h-5" />
        </div>
        <div className="w-6 h-6 flex items-center justify-center ml-1">
            {isFirst ? (
                <div className="bg-green-500/20 text-green-400 p-1 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.3)]" title="Active Key">
                    <CheckIcon className="w-4 h-4" />
                </div>
            ) : (
                <div className="text-gray-600">
                    <KeyIcon className="w-4 h-4" />
                </div>
            )}
        </div>
      </div>

      {/* Inputs */}
      <div className="flex-grow w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
            type="text"
            value={apiKey.name}
            onChange={(e) => onUpdate(apiKey.id, e.target.value, apiKey.value)}
            placeholder="Key Name"
            className="col-span-1 p-2 bg-black/20 border border-white/10 rounded text-sm text-yellow-100 placeholder-gray-500 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50"
            aria-label="API Key Name"
            onMouseDown={(e) => e.stopPropagation()} 
        />
        <input
            type={isKeyVisible ? 'text' : 'password'}
            value={apiKey.value}
            onChange={(e) => onUpdate(apiKey.id, apiKey.name, e.target.value)}
            placeholder="Paste API Key Value"
            className="col-span-1 sm:col-span-2 p-2 bg-black/20 border border-white/10 rounded text-sm text-gray-300 font-mono placeholder-gray-500 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50"
            aria-label="API Key Value"
            onMouseDown={(e) => e.stopPropagation()}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-1 self-end sm:self-center">
        <button 
            onClick={handleMoveToTop} 
            disabled={isFirst} 
            title="Set as Active (Move to Top)" 
            className="p-2 text-gray-400 hover:text-yellow-400 bg-white/5 hover:bg-yellow-500/10 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            onMouseDown={(e) => e.stopPropagation()}
        >
            <ChevronDoubleUpIcon className="w-4 h-4" />
        </button>
        <button 
            onClick={handleDeleteClick} 
            title="Delete Key" 
            className="p-2 text-gray-400 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-md transition-colors"
            onMouseDown={(e) => e.stopPropagation()}
        >
            <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

const ApiKeyManager: React.FC = memo(() => {
  const { apiKeys, isKeyVisible, addApiKey, updateApiKey, toggleKeyVisibility, moveKeyToEdge, isRotationEnabled, toggleRotation, reorderApiKeys } = useApiKeyStore();
  const requestDeleteConfirmation = useConfirmationUI(state => state.requestDeleteConfirmation);
  
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDelete = useCallback((id: string) => {
    requestDeleteConfirmation({ sessionId: id, messageId: 'api-key' });
  }, [requestDeleteConfirmation]);
  
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragOverItem.current = position;
    if (dragItem.current !== null && dragItem.current !== position) {
        const newKeys = [...apiKeys];
        const draggedKey = newKeys[dragItem.current];
        newKeys.splice(dragItem.current, 1);
        newKeys.splice(position, 0, draggedKey);
        dragItem.current = position;
        reorderApiKeys(newKeys);
    }
  }, [apiKeys, reorderApiKeys]);

  const handleDragEnd = useCallback(() => {
    dragItem.current = null;
    dragOverItem.current = null;
  }, []);

  const handleDragOverContainer = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); 
    const scrollParent = containerRef.current?.closest('.overflow-auto');
    if (!scrollParent) return;

    const { top, bottom } = scrollParent.getBoundingClientRect();
    const sensitivity = 50; 
    const scrollSpeed = 10;

    if (e.clientY < top + sensitivity) {
        scrollParent.scrollTop -= scrollSpeed;
    } else if (e.clientY > bottom - sensitivity) {
        scrollParent.scrollTop += scrollSpeed;
    }
  }, []);

  return (
    <div ref={containerRef} onDragOver={handleDragOverContainer} className="flex flex-col h-full">
      <div className="flex-grow space-y-1 overflow-visible">
        {apiKeys.map((key, index) => (
          <ApiKeyItem
            key={key.id}
            apiKey={key}
            index={index}
            isFirst={index === 0}
            isLast={index === apiKeys.length - 1}
            isKeyVisible={isKeyVisible}
            onUpdate={updateApiKey}
            onDelete={handleDelete}
            onMoveToEdge={moveKeyToEdge}
            onDragStart={handleDragStart}
            onDragEnter={handleDragEnter}
            onDragEnd={handleDragEnd}
          />
        ))}
        {apiKeys.length === 0 && (
            <div className="p-8 text-center border-2 border-dashed border-gray-700 rounded-lg">
                <KeyIcon className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No API keys found.</p>
                <p className="text-xs text-gray-500">Add a key to start chatting.</p>
            </div>
        )}
      </div>
      
      <div className="mt-4 pt-4 border-t border-[var(--aurora-border)] flex flex-wrap gap-3">
        <button onClick={addApiKey} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-yellow-600/80 rounded-md transition-shadow hover:shadow-[0_0_12px_2px_rgba(234,179,8,0.6)]">
          <PlusIcon className="w-4 h-4 mr-2" /> Add API Key
        </button>
        <button onClick={toggleKeyVisibility} title={isKeyVisible ? "Hide Keys" : "Show Keys"} className="p-2 text-gray-300 bg-white/5 rounded-md hover:text-white border border-white/10 hover:bg-white/10">
          {isKeyVisible ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
        </button>
        <button 
          onClick={toggleRotation} 
          title={isRotationEnabled ? "Turn Off Key Rotation" : "Turn On Key Rotation"} 
          className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all border disabled:opacity-50 ml-auto ${
            isRotationEnabled 
              ? 'bg-green-600/20 text-green-300 border-green-500/30 hover:bg-green-600/30' 
              : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
          }`}
          disabled={apiKeys.length < 2}
        >
          <ArrowPathIcon className={`w-4 h-4 mr-2 ${isRotationEnabled ? 'animate-spin-slow' : ''}`} />
          Rotation: {isRotationEnabled ? 'Active' : 'Off'}
        </button>
      </div>
    </div>
  );
});

export default ApiKeyManager;