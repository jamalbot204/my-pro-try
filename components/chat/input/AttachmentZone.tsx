
import React, { memo } from 'react';
import { Attachment } from '../../../types.ts';
import { DocumentIcon, XCircleIcon } from '../../common/Icons.tsx';

interface AttachmentZoneProps {
    files: Attachment[];
    onRemove: (id: string) => void;
    disabled?: boolean;
}

const AttachmentZone: React.FC<AttachmentZoneProps> = memo(({ files, onRemove, disabled }) => {
    if (files.length === 0) return null;

    return (
        <div className="p-3 border-b border-white/10 bg-black/10 rounded-t-[var(--aurora-input-radius)]">
            <div className="flex flex-wrap gap-2">
                {files.map(file => {
                    const isUploading = (file.uploadState === 'reading_client' || file.uploadState === 'uploading_to_cloud' || file.uploadState === 'processing_on_server') && !file.error;
                    const isError = !!file.error || file.uploadState?.startsWith('error');

                    return (
                        <div key={file.id} className="relative group p-2 bg-black/30 rounded-lg border border-white/5 flex items-center" style={{ minWidth: '160px' }}>
                            <div className="flex-shrink-0 w-8 h-8 bg-black/40 rounded flex items-center justify-center mr-2">
                                {isUploading ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                                ) : isError ? (
                                    <DocumentIcon className="w-4 h-4 text-red-400" />
                                ) : file.dataUrl && file.mimeType.startsWith('image/') && file.type === 'image' ? (
                                    <img src={file.dataUrl} alt={file.name} className="w-full h-full object-cover rounded" />
                                ) : (
                                    <DocumentIcon className="w-4 h-4 text-gray-300" />
                                )}
                            </div>
                            <div className="flex-grow flex flex-col min-w-0 mr-1">
                                <p className="text-xs font-medium text-gray-200 truncate max-w-[100px]" title={file.name}>{file.name}</p>
                                <p className="text-[10px] text-gray-400">{isUploading ? 'Uploading...' : (isError ? 'Error' : 'Ready')}</p>
                            </div>
                            <button 
                                onClick={() => onRemove(file.id)} 
                                disabled={disabled}
                                className="flex-shrink-0 text-gray-400 hover:text-red-400 p-1 disabled:opacity-50 disabled:cursor-not-allowed" 
                                title="Remove"
                            >
                                <XCircleIcon className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default AttachmentZone;
