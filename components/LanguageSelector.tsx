'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check } from 'lucide-react';

const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
] as const;

type LanguageCode = typeof languages[number]['code'];

export function LanguageSelector({ variant = 'default', openDirection = 'down' }: { variant?: 'default' | 'minimal'; openDirection?: 'up' | 'down' }) {
    const locale = useLocale() as LanguageCode;
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentLanguage = languages.find(l => l.code === locale) || languages[0];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLanguageChange = (code: LanguageCode) => {
        // Set cookie for the locale
        document.cookie = `NEXT_LOCALE=${code};path=/;max-age=${60 * 60 * 24 * 365}`;
        setIsOpen(false);
        // Refresh the page to apply the new locale
        window.location.reload();
    };

    if (variant === 'minimal') {
        return (
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
                    aria-label="Select language"
                >
                    <span>{currentLanguage.flag}</span>
                    <span className="hidden sm:inline">{currentLanguage.code.toUpperCase()}</span>
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: openDirection === 'up' ? 5 : -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: openDirection === 'up' ? 5 : -5 }}
                            transition={{ duration: 0.15 }}
                            className={`absolute right-0 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[140px] z-50 ${
                                openDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
                            }`}
                        >
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => handleLanguageChange(lang.code)}
                                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-50 transition-colors ${
                                        locale === lang.code ? 'text-slate-900 font-medium' : 'text-slate-600'
                                    }`}
                                >
                                    <span>{lang.flag}</span>
                                    <span className="flex-1">{lang.name}</span>
                                    {locale === lang.code && (
                                        <Check className="w-4 h-4 text-violet-500" />
                                    )}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Select language"
            >
                <Globe className="w-4 h-4" />
                <span>{currentLanguage.flag}</span>
                <span className="hidden sm:inline">{currentLanguage.code.toUpperCase()}</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200 py-2 min-w-[160px] z-50"
                    >
                        <div className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Language
                        </div>
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => handleLanguageChange(lang.code)}
                                className={`w-full px-3 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-slate-50 transition-colors ${
                                    locale === lang.code ? 'text-slate-900 bg-slate-50' : 'text-slate-600'
                                }`}
                            >
                                <span className="text-lg">{lang.flag}</span>
                                <span className="flex-1 font-medium">{lang.name}</span>
                                {locale === lang.code && (
                                    <Check className="w-4 h-4 text-violet-500" />
                                )}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
