import React from 'react';
import { Sun, Moon, Globe } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Language } from '../../i18n/translations';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
  ];

  return (
    <div className="flex justify-end items-center gap-4 p-4 border-b border-gray-200 dark:border-[#1a1a1a] bg-white dark:bg-[#0a0a0a] transition-colors duration-300">
      <div className="relative group">
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors border border-gray-200 dark:border-[#333]">
          <Globe className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {languages.find(l => l.code === language)?.flag} {language.toUpperCase()}
          </span>
        </button>
        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`w-full flex items-center px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#1a1a1a] first:rounded-t-lg last:rounded-b-lg transition-colors ${
                language === lang.code ? 'text-[#065f46] dark:text-[#d4a017] font-bold' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <span className="mr-2">{lang.flag}</span> {lang.name}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-400"
        aria-label="Toggle Theme"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    </div>
  );
}
