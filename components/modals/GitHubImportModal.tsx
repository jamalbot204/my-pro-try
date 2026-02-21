import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { CheckIcon, CloseIcon as CancelIcon, GitHubIcon, LinkIcon } from '../common/Icons.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';

interface GitHubImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (url: string) => void;
}

const GitHubImportModal: React.FC<GitHubImportModalProps> = memo(({ isOpen, onClose, onImport }) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [areButtonsDisabled, setAreButtonsDisabled] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const GITHUB_REPO_REGEX = /^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-._]+(\/)?$/;

  useEffect(() => {
    if (isOpen) {
      setAreButtonsDisabled(true);
      const timerId = setTimeout(() => {
        setAreButtonsDisabled(false);
      }, 500);

      setUrl('');
      setIsValid(false);
      setTimeout(() => inputRef.current?.focus(), 100);

      return () => clearTimeout(timerId);
    }
  }, [isOpen]);

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    setIsValid(GITHUB_REPO_REGEX.test(newUrl));
  }, [GITHUB_REPO_REGEX]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onImport(url);
    }
  }, [isValid, onImport, url]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="github-import-modal-title"
      onClick={onClose}
    >
      <div
        className="aurora-panel p-6 rounded-lg shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col text-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="github-import-modal-title" className="text-lg font-semibold text-gray-100 flex items-center">
            <GitHubIcon className="w-5 h-5 mr-3" />
            {t.importGithubRepo}
          </h2>
          <button
            onClick={onClose}
            disabled={areButtonsDisabled}
            className="text-gray-400 p-1 rounded-full transition-shadow hover:text-gray-100 hover:shadow-[0_0_10px_1px_rgba(255,255,255,0.2)] disabled:opacity-60"
            aria-label={t.close}
          >
            <CancelIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
            {/* Input Card - Slate */}
            <div className="relative p-4 mb-6 rounded-r-xl rounded-l-md border border-white/10 border-l-4 border-l-slate-500 bg-gradient-to-r from-slate-500/5 to-transparent">
                <p className="text-xs text-gray-400 mb-3">
                    {t.githubRepoDesc}
                </p>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <LinkIcon className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={url}
                        onChange={handleUrlChange}
                        className="w-full pl-9 p-2.5 aurora-input text-sm border-slate-500/30 focus:border-slate-500 font-mono"
                        aria-label={t.githubRepoUrl}
                        placeholder="https://github.com/username/repo"
                    />
                </div>
                {url && !isValid && (
                    <p className="text-xs text-red-400 mt-2">Invalid GitHub Repository URL format.</p>
                )}
            </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={areButtonsDisabled}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 rounded-md transition-shadow hover:shadow-[0_0_12px_2px_rgba(255,255,255,0.2)] flex items-center disabled:opacity-60"
            >
              <CancelIcon className="w-4 h-4 mr-1.5" /> {t.cancel}
            </button>
            <button
              type="submit"
              disabled={areButtonsDisabled || !isValid}
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--aurora-accent-primary)] rounded-md transition-shadow hover:shadow-[0_0_12px_2px_rgba(90,98,245,0.6)] flex items-center disabled:opacity-50"
            >
              <CheckIcon className="w-4 h-4 mr-1.5" /> {t.import}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default GitHubImportModal;