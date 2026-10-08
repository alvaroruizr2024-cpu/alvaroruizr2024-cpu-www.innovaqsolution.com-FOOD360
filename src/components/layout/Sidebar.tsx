import React from 'react';
import { motion } from 'motion/react';
import { navigation } from '../../data/mockData';
import { cn } from '../../lib/utils';
import { ChefHat } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface SidebarProps {
  currentSection: string;
  onSectionChange: (id: string) => void;
}

export function Sidebar({ currentSection, onSectionChange }: SidebarProps) {
  const { t } = useLanguage();

  return (
    <div className="w-72 bg-white dark:bg-[#0a0a0a] border-r border-gray-200 dark:border-[#1a1a1a] h-screen flex flex-col text-gray-700 dark:text-gray-300 transition-colors duration-300">
      <div className="p-6 flex items-center gap-3 border-b border-gray-200 dark:border-[#1a1a1a]">
        <motion.div whileHover={{ rotate: [0, -12, 10, 0], scale: 1.1 }} transition={{ duration: 0.6 }} className="bg-gradient-to-br from-[#065f46] to-[#047857] p-2 rounded-xl shadow-[0_0_15px_rgba(6,95,70,0.3)] dark:shadow-[0_0_15px_rgba(6,95,70,0.5)]">
          <ChefHat className="w-6 h-6 text-white" />
        </motion.div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-wider">FOOD<span className="text-[#d4a017]">360</span></h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">InnovaQ Solutions</p>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {navigation.map((item, idx) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + idx * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSectionChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "relative w-full text-left flex focus-visible:outline-2 focus-visible:outline-[#d4a017] items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "text-[#065f46] dark:text-[#d4a017]" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-gray-900 dark:hover:text-gray-200"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-lg bg-[#065f46]/10 dark:bg-[#065f46]/20 border border-[#065f46]/30 dark:border-[#065f46]/50 shadow-[0_0_24px_rgba(6,95,70,0.25)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <Icon className={cn("relative w-5 h-5", isActive ? "text-[#065f46] dark:text-[#d4a017]" : "text-gray-400 dark:text-gray-500")} />
              <span className="relative">{t(`sidebar.${item.id}`)}</span>
            </motion.button>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-gray-200 dark:border-[#1a1a1a]">
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-[#111] rounded-lg border border-gray-200 dark:border-[#222]">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs text-gray-500 dark:text-gray-400">{t('sidebar.online')}</span>
        </div>
      </div>
    </div>
  );
}
