import React from 'react';
import { motion } from 'framer-motion';
import { Language } from '../types';
import { Globe, ChevronRight, ShieldCheck } from 'lucide-react';

interface Props {
  currentLang: Language;
  onToggleLang: (lang: Language) => void;
  onStart: () => void;
}

const containerVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30, staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }
};

export const LanguageSelector: React.FC<Props> = ({ currentLang, onToggleLang, onStart }) => {
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-sm mx-auto relative z-10 flex flex-col items-center"
    >
      {/* Animated Background Aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-gradient-to-tr from-kauvery-primary/10 via-purple-500/5 to-transparent rounded-full blur-3xl -z-10 animate-pulse-slow"></div>

      <div className="bg-white/90 backdrop-blur-3xl rounded-[2.5rem] p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white relative overflow-hidden w-full">
        
        {/* Decorative sheen */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-kauvery-primary/5 to-transparent rounded-full blur-2xl"></div>

        <div className="relative z-10 flex flex-col items-center text-center">
          
          {/* Logo Icon */}
          <motion.div 
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-32 h-32 bg-white rounded-2xl rotate-3 flex items-center justify-center mb-6 shadow-xl shadow-kauvery-primary/20 overflow-hidden p-3"
          >
            <img 
              src="/components/assets/Kauvery_Nalam_Logo.jpg" 
              alt="Kauvery Nalam Logo" 
              className="w-full h-full object-contain object-center -rotate-3 scale-110"
              style={{ imageRendering: 'high-quality' }}
            />
          </motion.div>
          
          <motion.div variants={itemVariants} className="mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
              Kauvery Nalam
            </h2>
            <p className="text-gray-500 font-medium leading-relaxed mb-1">
              {currentLang === 'en' ? 'Start Kidney Health Self Assessment' : 'சிறுநீரக சுயபரிசோதனையைத் தொடங்கவும்'}
            </p>
            <div className="h-1 w-12 bg-kauvery-primary/20 rounded-full mx-auto my-3"></div>
          </motion.div>

          {/* Language Toggle */}
          <motion.div variants={itemVariants} className="bg-gray-100/80 p-1.5 rounded-full flex w-full mb-8 relative">
            {/* Sliding Background */}
            <motion.div 
              className="absolute top-1.5 bottom-1.5 bg-white rounded-full shadow-sm z-0"
              initial={false}
              animate={{ 
                x: currentLang === 'en' ? 0 : '100%', 
                width: '50%' 
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            
            <button 
              onClick={() => onToggleLang('en')}
              className={`flex-1 py-2.5 rounded-full text-sm font-bold z-10 transition-colors duration-200 ${currentLang === 'en' ? 'text-kauvery-primary' : 'text-gray-500 hover:text-gray-700'}`}
            >
              English
            </button>
            <button 
              onClick={() => onToggleLang('ta')}
              className={`flex-1 py-2.5 rounded-full text-sm font-bold z-10 transition-colors duration-200 ${currentLang === 'ta' ? 'text-kauvery-primary' : 'text-gray-500 hover:text-gray-700'}`}
            >
              தமிழ்
            </button>
          </motion.div>

          {/* Start Button */}
          <motion.button 
            variants={itemVariants}
            whileTap={{ scale: 0.96 }}
            onClick={onStart}
            className="w-full bg-gradient-to-r from-kauvery-primary to-kauvery-secondary text-white p-5 rounded-2xl font-bold shadow-xl shadow-kauvery-primary/25 flex items-center justify-between group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <span className="text-lg relative z-10">
              {currentLang === 'en' ? 'Start Assessment' : 'தொடங்கவும்'}
            </span>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center relative z-10">
              <ChevronRight size={20} />
            </div>
          </motion.button>
        </div>
      </div>
      
      <motion.div variants={itemVariants} className="text-center mt-8">
        <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase flex items-center justify-center gap-2 opacity-60">
          <ShieldCheck size={12} />
          Secure & Private Assessment
        </p>
      </motion.div>
    </motion.div>
  );
};
