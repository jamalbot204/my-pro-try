import React, { memo, useState, useCallback } from 'react';
import { KeyIcon, SparklesIcon, SpeakerWaveIcon, ShieldCheckIcon, PencilIcon, UserIcon } from '../common/Icons.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { GeminiSettings } from '../../types.ts';
import { MODEL_DEFINITIONS } from '../../constants.ts';

interface SettingsGeneralProps {
  localModel: string;
  localSettings: GeminiSettings;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onOpenApiKeyModal: () => void;
  onOpenInstructionModal: (type: 'systemInstruction') => void;
  onOpenTtsModal: () => void;
  onOpenSafetyModal: () => void;
}

const SettingsGeneral: React.FC<SettingsGeneralProps> = memo(({
  localModel,
  localSettings,
  handleInputChange,
  onOpenApiKeyModal,
  onOpenInstructionModal,
  onOpenTtsModal,
  onOpenSafetyModal
}) => {
  const { t } = useTranslation();
  const [isCustomModelMode, setIsCustomModelMode] = useState(
      !MODEL_DEFINITIONS.some(m => m.id === localModel) && localModel.trim() !== ''
  );

  const toggleCustomMode = useCallback(() => {
      setIsCustomModelMode(prev => !prev);
  }, []);

  return (
    <div className="space-y-4">
      
      {/* API Key Card - Yellow/Gold */}
      <div className="relative p-4 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-500/5 to-transparent">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-500/10 mr-3 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.1)]">
                <KeyIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-200">{t.apiKeyManagement}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{t.apiKeyDesc}</p>
            </div>
          </div>
          <button
            onClick={onOpenApiKeyModal}
            className="px-3 py-1.5 text-xs font-medium text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded-md transition-all hover:bg-yellow-500/20 hover:text-yellow-200 hover:shadow-[0_0_8px_rgba(250,204,21,0.3)]"
          >
            {t.manage}
          </button>
        </div>
      </div>

      {/* Model Selection Card - Electric Blue */}
      <div className="relative p-4 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-500/5 to-transparent">
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10 mr-3 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                    <SparklesIcon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-gray-200">{t.model}</h3>
            </div>
            <button onClick={toggleCustomMode} className="text-xs text-blue-300 hover:text-white underline decoration-dashed">
                {isCustomModelMode ? t.resetDefaults : t.useCustomModel}
            </button>
        </div>
        
        {isCustomModelMode ? (
            <div className="relative">
                <input
                    type="text"
                    name="model"
                    value={localModel}
                    onChange={handleInputChange}
                    placeholder={t.enterCustomModel}
                    className="w-full p-2.5 aurora-input text-sm border-blue-500/20 focus:border-blue-500/50 font-mono"
                />
            </div>
        ) : (
            <select
            id="model"
            name="model"
            className="w-full p-2.5 aurora-select text-sm border-blue-500/20 focus:border-blue-500/50"
            value={localModel}
            onChange={handleInputChange}
            >
            {MODEL_DEFINITIONS.map(model => (
                <option key={model.id} value={model.id}>{model.name}</option>
            ))}
            </select>
        )}
      </div>

      {/* Persona / System Instruction Card - Purple */}
      <div className="relative p-4 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-500/5 to-transparent">
        <div className="flex items-center mb-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-500/10 mr-3 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.1)]">
            <UserIcon className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-gray-200">{t.systemInstruction}</h3>
        </div>
        <button
          type="button"
          onClick={() => onOpenInstructionModal('systemInstruction')}
          className="w-full p-3 aurora-input text-left flex justify-between items-start transition-colors hover:bg-white/10 group border-purple-500/20"
        >
          <span className={`text-sm line-clamp-2 ${localSettings.systemInstruction ? 'text-gray-300' : 'text-gray-500 italic'}`}>
            {localSettings.systemInstruction || t.systemInstructionPlaceholder}
          </span>
          <PencilIcon className="w-4 h-4 text-gray-500 group-hover:text-purple-400 mt-0.5 flex-shrink-0 ml-2" />
        </button>
      </div>

      {/* Audio & Safety Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* TTS Settings - Emerald Green */}
        <div className="relative p-4 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-500/5 to-transparent flex flex-col justify-between">
          <div>
            <div className="flex items-center mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 mr-2 text-emerald-400">
                    <SpeakerWaveIcon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-gray-200">{t.ttsSettings}</h3>
            </div>
            <p className="text-xs text-gray-400 mb-3 ml-1">{t.ttsDesc}</p>
          </div>
          <button
            onClick={onOpenTtsModal}
            className="w-full px-3 py-2 text-xs font-medium text-emerald-200 bg-emerald-500/10 border border-emerald-500/20 rounded-md hover:bg-emerald-500/20 transition-colors"
          >
            {t.configure}
          </button>
        </div>

        {/* Safety Settings - Red */}
        <div className="relative p-4 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-red-500 bg-gradient-to-r from-red-500/5 to-transparent flex flex-col justify-between">
          <div>
            <div className="flex items-center mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 mr-2 text-red-400">
                    <ShieldCheckIcon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-gray-200">{t.safetySettings}</h3>
            </div>
            <p className="text-xs text-gray-400 mb-3 ml-1">{t.safetyDesc}</p>
          </div>
          <button
            onClick={onOpenSafetyModal}
            className="w-full px-3 py-2 text-xs font-medium text-red-200 bg-red-500/10 border border-red-500/20 rounded-md hover:bg-red-500/20 transition-colors"
          >
            {t.configure}
          </button>
        </div>
      </div>

    </div>
  );
});

export default SettingsGeneral;