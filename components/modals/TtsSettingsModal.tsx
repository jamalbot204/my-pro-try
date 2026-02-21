
import React, { useState, useEffect, memo, useCallback } from 'react';
import { useSettingsUI } from '../../store/ui/useSettingsUI.ts';
import { useActiveChatStore } from '../../store/useActiveChatStore.ts';
import { TTSSettings, TTSModelId, TTSVoiceId } from '../../types.ts';
import { DEFAULT_TTS_SETTINGS } from '../../constants.ts';
import { CloseIcon, PencilIcon, SpeakerWaveIcon, CogIcon, UserIcon, CalculatorIcon } from '../common/Icons.tsx';
import { TTS_MODELS, TTS_VOICES_MALE, TTS_VOICES_FEMALE } from '../../constants.ts';
import InstructionEditModal from './InstructionEditModal.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';

interface TtsSettingsModalProps {
  isOpen?: boolean;
  initialSettings?: TTSSettings;
  onApply?: (settings: TTSSettings) => void;
  onClose?: () => void;
}

const TtsSettingsModal: React.FC<TtsSettingsModalProps> = memo(({ isOpen: propIsOpen, initialSettings, onApply, onClose }) => {
  const { currentChatSession, updateCurrentChatSession } = useActiveChatStore.getState();
  const { isTtsSettingsModalOpen, closeTtsSettingsModal } = useSettingsUI();
  const { t } = useTranslation();

  const isControlled = propIsOpen !== undefined;
  const showModal = isControlled ? propIsOpen : isTtsSettingsModalOpen;

  const [localTtsSettings, setLocalTtsSettings] = useState<TTSSettings>(DEFAULT_TTS_SETTINGS);
  const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);
  const [areButtonsDisabled, setAreButtonsDisabled] = useState(true);

  useEffect(() => {
    if (showModal) {
      setAreButtonsDisabled(true);
      const timerId = setTimeout(() => {
        setAreButtonsDisabled(false);
      }, 500);

      if (isControlled && initialSettings) {
          setLocalTtsSettings(initialSettings);
      } else if (currentChatSession) {
          setLocalTtsSettings(currentChatSession.settings.ttsSettings || DEFAULT_TTS_SETTINGS);
      }
      return () => clearTimeout(timerId);
    }
  }, [showModal, isControlled, initialSettings, currentChatSession]);

  const handleClose = useCallback(() => {
      if (isControlled && onClose) {
          onClose();
      } else {
          closeTtsSettingsModal();
      }
  }, [isControlled, onClose, closeTtsSettingsModal]);

  const handleModelChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocalTtsSettings(prev => ({ ...prev, model: e.target.value as TTSModelId }));
  }, []);

  const handleVoiceChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVoice = e.target.value as TTSVoiceId;
    if (newVoice) {
        setLocalTtsSettings(prev => ({ ...prev, voice: newVoice }));
    }
  }, []);
  
  const handleAutoPlayChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTtsSettings(prev => ({ ...prev, autoPlayNewMessages: e.target.checked }));
  }, []);

  const handleMaxWordsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const valueString = e.target.value;
    if (valueString === '') {
        setLocalTtsSettings(prev => ({
            ...prev,
            maxWordsPerSegment: 999999
        }));
        return;
    }
    const value = parseInt(valueString, 10);
    setLocalTtsSettings(prev => ({
      ...prev,
      maxWordsPerSegment: (Number.isInteger(value) && value > 0) ? value : 999999
    }));
  }, []);

  const handleTemperatureChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setLocalTtsSettings(prev => ({
      ...prev,
      temperature: value
    }));
  }, []);

  const handleOpenInstructionModal = useCallback(() => {
    setIsInstructionModalOpen(true);
  }, []);

  const handleApplyInstructionChange = useCallback((newInstruction: string) => {
    setLocalTtsSettings(prev => ({ ...prev, systemInstruction: newInstruction }));
    setIsInstructionModalOpen(false);
  }, []);

  const handleApplySettings = useCallback(() => {
    if (isControlled && onApply) {
        onApply(localTtsSettings);
    } else {
        if (!currentChatSession) return;
        updateCurrentChatSession(session => session ? ({
            ...session,
            settings: { ...session.settings, ttsSettings: localTtsSettings }
        }) : null);
        closeTtsSettingsModal();
    }
  }, [isControlled, onApply, localTtsSettings, currentChatSession, updateCurrentChatSession, closeTtsSettingsModal]);
  
  const handleResetDefaults = useCallback(() => {
    setLocalTtsSettings(DEFAULT_TTS_SETTINGS);
  }, []);

  if (!showModal) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-md" onClick={handleClose}>
        <div className="aurora-panel p-0 rounded-lg shadow-2xl w-full sm:max-w-md max-h-[90vh] flex flex-col text-gray-200 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
          
          <div className="p-5 flex justify-between items-center bg-[rgba(13,15,24,0.3)] border-b border-[var(--aurora-border)]">
            <h2 className="text-xl font-semibold text-gray-100 flex items-center">
                <SpeakerWaveIcon className="w-5 h-5 mr-3 text-emerald-400" />
                {t.ttsSettings}
            </h2>
            <button
              onClick={handleClose}
              disabled={areButtonsDisabled}
              className="text-gray-400 p-1.5 rounded-full hover:bg-white/10 hover:text-white transition-colors disabled:opacity-60"
              aria-label={t.close}
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-grow min-h-0 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            <fieldset disabled={areButtonsDisabled} className="space-y-4">
              
              <div className="relative p-4 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-500/5 to-transparent">
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center">
                    <SpeakerWaveIcon className="w-4 h-4 mr-2" /> Engine Config
                </h3>
                <div className="space-y-3 pl-1">
                    <div>
                        <label htmlFor="tts-model" className="block text-xs font-medium text-gray-300 mb-1">{t.ttsModel}</label>
                        <select id="tts-model" name="tts-model" className="w-full p-2 aurora-select text-sm border-emerald-500/20 focus:border-emerald-500" value={localTtsSettings.model} onChange={handleModelChange}>
                            {TTS_MODELS.map(model => (<option key={model.id} value={model.id}>{model.name}</option>))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="tts-voice" className="block text-xs font-medium text-gray-300 mb-1">{t.voice}</label>
                        <select
                            id="tts-voice"
                            name="tts-voice"
                            className="w-full p-2 aurora-select text-sm border-emerald-500/20 focus:border-emerald-500"
                            value={localTtsSettings.voice}
                            onChange={handleVoiceChange}
                        >
                            <option value="" disabled>Select a voice...</option>
                            <optgroup label={t.male}>
                            {TTS_VOICES_MALE.map(voice => (
                                <option key={voice.id} value={voice.id}>{voice.name} ({voice.description})</option>
                            ))}
                            </optgroup>
                            <optgroup label={t.female}>
                            {TTS_VOICES_FEMALE.map(voice => (
                                <option key={voice.id} value={voice.id}>{voice.name} ({voice.description})</option>
                            ))}
                            </optgroup>
                        </select>
                    </div>
                    {/* Temperature Slider */}
                    <div>
                        <div className="flex justify-between mb-1">
                            <label htmlFor="tts-temperature" className="text-xs font-medium text-gray-300">Temperature (Variability)</label>
                            <span className="text-xs text-emerald-400 font-mono">{localTtsSettings.temperature?.toFixed(1) ?? "1.0"}</span>
                        </div>
                        <input
                            type="range"
                            id="tts-temperature"
                            name="tts-temperature"
                            min="0.0"
                            max="2.0"
                            step="0.1"
                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            value={localTtsSettings.temperature ?? 1.0}
                            onChange={handleTemperatureChange}
                        />
                        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                            <span>Stable (0.0)</span>
                            <span>Expressive (2.0)</span>
                        </div>
                    </div>
                </div>
              </div>

              <div className="relative p-4 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-cyan-500 bg-gradient-to-r from-cyan-500/5 to-transparent">
                <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3 flex items-center">
                    <CogIcon className="w-4 h-4 mr-2" /> Behavior
                </h3>
                <div className="space-y-3 pl-1">
                    <div>
                        <div className="flex items-center justify-between">
                            <label htmlFor="autoPlayNewMessages" className="text-sm text-gray-200 cursor-pointer">{t.autoPlayNewMessages}</label>
                            <input id="autoPlayNewMessages" name="autoPlayNewMessages" type="checkbox" className="h-4 w-4 text-cyan-500 bg-black/30 border-white/20 rounded focus:ring-cyan-500 focus:ring-offset-black cursor-pointer" checked={localTtsSettings.autoPlayNewMessages ?? false} onChange={handleAutoPlayChange} />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{t.autoPlayDesc}</p>
                    </div>
                    <div>
                        <label htmlFor="tts-max-words" className="block text-xs font-medium text-gray-300 mb-1">{t.maxWordsPerSegment}</label>
                        <input 
                            type="number" 
                            id="tts-max-words" 
                            name="tts-max-words" 
                            className="w-full p-2 aurora-input text-sm border-cyan-500/20 focus:border-cyan-500" 
                            value={localTtsSettings.maxWordsPerSegment ?? ''} 
                            onChange={handleMaxWordsChange} 
                            step="10" 
                            placeholder="Default: No split (999999)" 
                        />
                        <p className="text-xs text-gray-400 mt-1">{t.maxWordsDesc}</p>
                    </div>
                </div>
              </div>

              <div className="relative p-4 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-500/5 to-transparent">
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-3 flex items-center">
                    <UserIcon className="w-4 h-4 mr-2" /> Persona
                </h3>
                <div className="pl-1">
                    <label className="block text-xs font-medium text-gray-300 mb-1">{t.ttsSystemInstruction}</label>
                    <button type="button" onClick={handleOpenInstructionModal} className="w-full p-2 aurora-input text-left flex justify-between items-center transition-shadow hover:shadow-[0_0_12px_2px_rgba(168,85,247,0.4)] border-purple-500/20 group">
                        <span className={`truncate text-sm ${localTtsSettings.systemInstruction ? 'text-gray-200' : 'text-gray-500 italic'}`} title={localTtsSettings.systemInstruction || t.ttsSystemInstructionPlaceholder}>{localTtsSettings.systemInstruction ? (localTtsSettings.systemInstruction.length > 40 ? localTtsSettings.systemInstruction.substring(0, 40) + "..." : localTtsSettings.systemInstruction) : t.ttsSystemInstructionPlaceholder}</span>
                        <PencilIcon className="w-3.5 h-3.5 text-gray-500 group-hover:text-purple-400 flex-shrink-0 ml-2" />
                    </button>
                    <p className="text-xs text-gray-400 mt-1">{t.ttsSystemInstructionDesc}</p>
                </div>
              </div>

            </fieldset>
          </div>

          <div className="p-4 border-t border-[var(--aurora-border)] bg-[rgba(13,15,24,0.5)] flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
            <button onClick={handleResetDefaults} disabled={areButtonsDisabled} type="button" className="px-4 py-2 text-xs font-medium text-blue-400 hover:text-white transition-colors disabled:opacity-60">{t.resetDefaults}</button>
            <div className="flex space-x-3 w-full sm:w-auto">
              <button onClick={handleClose} disabled={areButtonsDisabled} type="button" className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 rounded-md hover:bg-white/10 transition-colors disabled:opacity-60">{t.cancel}</button>
              <button onClick={handleApplySettings} disabled={areButtonsDisabled} type="button" className="flex-1 sm:flex-none px-6 py-2 text-sm font-medium text-white bg-[var(--aurora-accent-primary)] rounded-md hover:shadow-[0_0_12px_2px_rgba(90,98,245,0.6)] transition-all disabled:opacity-60">{t.applyTtsSettings}</button>
            </div>
          </div>
        </div>
      </div>
      {isInstructionModalOpen && (
        <InstructionEditModal
          isOpen={isInstructionModalOpen}
          title={t.ttsSystemInstruction}
          currentInstruction={localTtsSettings.systemInstruction || ''}
          onApply={handleApplyInstructionChange}
          onClose={() => setIsInstructionModalOpen(false)}
        />
      )}
    </>
  );
});

export default TtsSettingsModal;