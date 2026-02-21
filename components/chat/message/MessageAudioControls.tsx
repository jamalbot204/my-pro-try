import React, { memo } from 'react';
import { useAudioStore } from '../../../store/useAudioStore.ts';
import { SpeakerWaveIcon, XCircleIcon, PauseIcon, SpeakerXMarkIcon } from '../../common/Icons.tsx';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { ChatMessage } from '../../../types.ts';
import { useShallow } from 'zustand/react/shallow';

interface MessageAudioControlsProps {
  message: ChatMessage;
  displayContent: string;
  textSegmentsForTts: string[];
  allTtsPartsCached: boolean;
  hasAnyCachedAudio: boolean;
  isSelectionModeActive: boolean;
}

const MessageAudioControls: React.FC<MessageAudioControlsProps> = memo(({ 
    message, 
    displayContent, 
    textSegmentsForTts, 
    allTtsPartsCached, 
    hasAnyCachedAudio,
    isSelectionModeActive 
}) => {
    const { t } = useTranslation();

    const audioState = useAudioStore(useShallow(state => ({
        currentMessageId: state.audioPlayerState.currentMessageId,
        isPlaying: state.audioPlayerState.isPlaying,
        isLoading: state.audioPlayerState.isLoading,
        globalError: state.audioPlayerState.error,
        fetchingSegmentIds: state.fetchingSegmentIds,
        segmentFetchErrors: state.segmentFetchErrors,
        activeMultiPartFetches: state.activeMultiPartFetches,
    })));

    const audioActions = useAudioStore(useShallow(state => ({
        handlePlayTextForMessage: state.handlePlayTextForMessage,
        togglePlayPause: state.togglePlayPause,
        handleCancelMultiPartFetch: state.handleCancelMultiPartFetch,
        onCancelApiFetchThisSegment: state.onCancelApiFetchThisSegment,
    })));

    const getAudioStateForSegment = (baseMessageId: string, partIdx?: number) => {
        const isSinglePartForMainButton = partIdx === undefined && textSegmentsForTts.length === 1;
        const finalPartIdx = isSinglePartForMainButton ? 0 : partIdx;
        const segmentId = finalPartIdx !== undefined ? `${baseMessageId}_part_${finalPartIdx}` : baseMessageId;
        
        const isCurrentPlayerTarget = audioState.currentMessageId === segmentId;
        const segmentFetchErr = audioState.segmentFetchErrors.get(segmentId);
        const isCached = message.cachedAudioBuffers?.[finalPartIdx ?? 0] != null;
        
        return { 
            uniqueSegmentId: segmentId, 
            isCurrentAudioPlayerTarget: isCurrentPlayerTarget, 
            isAudioPlayingForThisSegment: isCurrentPlayerTarget && audioState.isPlaying, 
            isAudioLoadingForPlayer: isCurrentPlayerTarget && audioState.isLoading, 
            hasAudioErrorForThisSegment: (isCurrentPlayerTarget && !!audioState.globalError) || !!segmentFetchErr, 
            audioErrorMessage: segmentFetchErr || (isCurrentPlayerTarget ? audioState.globalError : null), 
            isAudioReadyToPlayFromCacheForSegment: isCached && !(isCurrentPlayerTarget && audioState.isPlaying) && !(isCurrentPlayerTarget && audioState.isLoading) && !segmentFetchErr 
        };
    };

    const renderPlayButtonForSegment = (partIndexInput?: number) => {
        const isMainContextButton = partIndexInput === undefined;
        const segmentState = getAudioStateForSegment(message.id, partIndexInput);
        let IconComponent = SpeakerWaveIcon, iconClassName = segmentState.isAudioReadyToPlayFromCacheForSegment ? 'text-green-400' : 'text-gray-300', title = segmentState.isAudioReadyToPlayFromCacheForSegment ? t.playCached : t.playMessage, isDisabled = false, isPulsing = false;
        
        const isThisSegmentIndividuallyFetching = audioState.fetchingSegmentIds.has(segmentState.uniqueSegmentId);
        const isThisTheMainButtonOverallFetching = isMainContextButton && audioState.activeMultiPartFetches.has(message.id);
        
        if (isThisTheMainButtonOverallFetching) { IconComponent = XCircleIcon; iconClassName = 'text-red-400 hover:text-red-300'; title = `${t.cancelFetching} ${textSegmentsForTts.length}`; isPulsing = true;
        } else if (isThisSegmentIndividuallyFetching && !isMainContextButton) { IconComponent = XCircleIcon; iconClassName = 'text-red-400 hover:text-red-300'; title = `${t.cancelFetching} Part ${partIndexInput! + 1}`; isPulsing = true;
        } else if (segmentState.isAudioPlayingForThisSegment) { IconComponent = PauseIcon; iconClassName = 'text-orange-400'; title = isMainContextButton ? t.pause : `${t.pause} Part ${partIndexInput! + 1}`;
        } else if (segmentState.isAudioLoadingForPlayer) { IconComponent = SpeakerWaveIcon; isPulsing = true; isDisabled = true; title = isMainContextButton ? t.loadingAudio : `${t.loadingPart} ${partIndexInput! + 1}...`; iconClassName = 'text-blue-400';
        } else if (segmentState.hasAudioErrorForThisSegment) { IconComponent = SpeakerXMarkIcon; iconClassName = 'text-red-400'; title = `${isMainContextButton ? "" : `Part ${partIndexInput! + 1}: `}${t.audioError}: ${segmentState.audioErrorMessage || 'Unknown error'}.`; }
        
        const clickHandler = isMainContextButton ? handleMasterPlayButtonClick : () => handlePartPlayButtonClick(partIndexInput!);
        return (<button onClick={clickHandler} title={title} aria-label={title} className={`p-1.5 text-gray-300 rounded-md bg-black bg-opacity-20 transition-shadow focus:outline-none focus:ring-2 ring-[var(--aurora-accent-primary)] hover:text-white hover:shadow-[0_0_8px_1px_rgba(34,197,94,0.6)] ${iconClassName} ${isPulsing ? 'animate-pulse' : ''}`} disabled={isDisabled || isSelectionModeActive}>{<IconComponent className="w-4 h-4" />}{partIndexInput !== undefined && <span className="text-xs ml-1">P{partIndexInput+1}</span>}</button>);
    };

    const handleMasterPlayButtonClick = () => {
        if (audioState.isPlaying && audioState.currentMessageId?.startsWith(message.id)) {
          audioActions.togglePlayPause();
        } else if (audioState.activeMultiPartFetches.has(message.id)) {
          audioActions.handleCancelMultiPartFetch(message.id);
        } else {
          audioActions.handlePlayTextForMessage(displayContent, message.id, undefined);
        }
    };

    const handlePartPlayButtonClick = (partIndex: number) => {
        const uniqueSegmentId = `${message.id}_part_${partIndex}`;
        if (audioState.currentMessageId === uniqueSegmentId && audioState.isPlaying) {
          audioActions.togglePlayPause();
        } else if (audioState.fetchingSegmentIds.has(uniqueSegmentId)) {
          audioActions.onCancelApiFetchThisSegment(uniqueSegmentId);
        } else {
          audioActions.handlePlayTextForMessage(displayContent, message.id, partIndex);
        }
    };

    const showIndividualPartControls = textSegmentsForTts.length > 1 && allTtsPartsCached;

    return (
        <>
            {!showIndividualPartControls && renderPlayButtonForSegment()}
            {showIndividualPartControls && textSegmentsForTts.map((_, index) => (
                <React.Fragment key={index}>
                    {renderPlayButtonForSegment(index)}
                </React.Fragment>
            ))}
        </>
    );
});

export default MessageAudioControls;