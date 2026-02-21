import React, { useEffect, useState, ReactNode, memo } from 'react';
import { CloseIcon } from './Icons.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: ReactNode;
    headerIcon?: ReactNode; // Optional icon to display before the title
    children: ReactNode;
    footer?: ReactNode; // Optional footer actions
    maxWidth?: string; // Tailwind max-width class (default: sm:max-w-xl)
    disableBackdropClick?: boolean;
}

const BaseModal: React.FC<BaseModalProps> = memo(({
    isOpen,
    onClose,
    title,
    headerIcon,
    children,
    footer,
    maxWidth = "sm:max-w-xl",
    disableBackdropClick = false
}) => {
    const { t } = useTranslation();
    const [isTransitioning, setIsTransitioning] = useState(true);

    // Prevent button mashing on open
    useEffect(() => {
        if (isOpen) {
            setIsTransitioning(true);
            const timer = setTimeout(() => setIsTransitioning(false), 500);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-md transition-opacity"
            role="dialog"
            aria-modal="true"
            onClick={disableBackdropClick ? undefined : onClose}
        >
            <div 
                className={`aurora-panel p-6 rounded-lg shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col text-gray-200 relative overflow-hidden animate-modal-open`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-xl font-semibold text-gray-100 flex items-center">
                        {headerIcon && <span className="mr-3 flex items-center">{headerIcon}</span>}
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        disabled={isTransitioning}
                        className="text-gray-400 p-1.5 rounded-full hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                        aria-label={t.close}
                    >
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-grow min-h-0 overflow-y-auto custom-scrollbar pr-1 mb-1">
                    <fieldset disabled={isTransitioning} className="contents">
                        {children}
                    </fieldset>
                </div>

                {/* Footer */}
                {footer && (
                    <div className="flex justify-end items-center pt-4 border-t border-[var(--aurora-border)] mt-2 flex-shrink-0 gap-3">
                        {/* We clone footer children to inject disabled prop if needed, though fieldset usually handles it */}
                        {React.Children.map(footer, child => {
                            if (React.isValidElement(child)) {
                                return React.cloneElement(child as React.ReactElement<any>, { disabled: isTransitioning || (child.props as any).disabled });
                            }
                            return child;
                        })}
                    </div>
                )}
            </div>
        </div>
    );
});

export default BaseModal;