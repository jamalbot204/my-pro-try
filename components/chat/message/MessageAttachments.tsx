
import React, { memo } from 'react';
import { Attachment } from '../../../types.ts';
import { DocumentIcon, PlayCircleIcon, ArrowDownTrayIcon, XCircleIcon } from '../../common/Icons.tsx';
import RefreshAttachmentButton from '../../common/RefreshAttachmentButton.tsx';
import { useInteractionStore } from '../../../store/useInteractionStore.ts';
import { useGeminiApiStore } from '../../../store/useGeminiApiStore.ts';

interface MessageAttachmentsProps {
  messageId: string;
  attachments: Attachment[];
  isSelectionModeActive: boolean;
}

const MessageAttachments: React.FC<MessageAttachmentsProps> = memo(({ messageId, attachments, isSelectionModeActive }) => {
    const { reUploadAttachment } = useInteractionStore();
    const isLoading = useGeminiApiStore(s => s.isLoading);

    const handleDownloadAttachmentLocal = (attachment: Attachment) => {
        if (!attachment.dataUrl) { alert("Attachment data is not available for download."); return; }
        const link = document.createElement('a');
        link.href = attachment.dataUrl;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!attachments || attachments.length === 0) return null;

    return (
        <div className={`mt-2 grid gap-2 ${attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {attachments.map(attachment => (
                <div key={attachment.id} className="relative group/attachment border border-white/10 rounded-md overflow-hidden bg-black/20 flex flex-col justify-center items-center min-h-[100px]">
                    {attachment.mimeType.startsWith('image/') && attachment.type === 'image' && attachment.mimeType !== 'application/pdf' ? (
                        <div className="w-full h-full flex items-center justify-center bg-black/10 aspect-video">
                            <img src={attachment.dataUrl} alt={attachment.name} className="max-w-full max-h-60 object-contain rounded-md cursor-pointer" onClick={() => attachment.dataUrl && window.open(attachment.dataUrl, '_blank')}/>
                        </div>
                    ) : attachment.mimeType.startsWith('video/') && attachment.type === 'video' ? (
                        <div className="w-full h-full aspect-video">
                            <video src={attachment.dataUrl} controls className="w-full h-full object-contain rounded-md"/>
                        </div>
                    ) : (
                        <div className="p-2 w-full h-full flex flex-col items-center justify-center bg-transparent transition-colors hover:bg-white/5 cursor-pointer aspect-video" onClick={() => attachment.dataUrl && window.open(attachment.dataUrl, '_blank')}>
                            <DocumentIcon className="w-8 h-8 mb-1 text-gray-300" />
                            <span className="text-xs text-gray-300 text-center break-all px-1">{attachment.name}</span>
                        </div>
                    )}
                    <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover/attachment:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); handleDownloadAttachmentLocal(attachment); }} title={`Download ${attachment.name}`} className="p-1 bg-black bg-opacity-40 text-white rounded-full transition-all hover:shadow-[0_0_8px_1px_rgba(255,255,255,0.2)]" aria-label={`Download ${attachment.name}`} disabled={!attachment.dataUrl || isSelectionModeActive}>
                            <ArrowDownTrayIcon className="w-3 h-3" />
                        </button>
                        {attachment.fileUri && (
                            <RefreshAttachmentButton attachment={attachment} onReUpload={() => reUploadAttachment(messageId, attachment.id)} disabled={attachment.isReUploading || isLoading} />
                        )}
                    </div>
                    {attachment.reUploadError && (<p className="text-xs text-red-400 p-1 bg-black/50 absolute bottom-0 w-full text-center" title={attachment.reUploadError}>Refresh Error</p>)}
                </div>
            ))}
        </div>
    );
});

export default MessageAttachments;
