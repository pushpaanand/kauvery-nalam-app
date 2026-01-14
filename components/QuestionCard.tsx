import React from 'react';
import { motion } from 'framer-motion';
import { Question, Language, Option } from '../types';
import { TEXTS } from '../constants';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface Props {
  question: Question;
  lang: Language;
  onAnswer: (val: string) => void;
  onBack: () => void;
  onNext: () => void; // Added onNext prop
  currentVal?: string;
  isFirst: boolean;
  direction: number; // 1 for forward, -1 for back
  currentQuestion: number; // Current question number (1-based)
  totalQuestions: number; // Total number of questions
}

// Improved Slide Variants using percentages for better responsiveness
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    position: 'absolute' as const,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    position: 'relative' as const,
    transition: {
      x: { type: "spring", stiffness: 350, damping: 35 },
      opacity: { duration: 0.2 }
    }
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
    position: 'absolute' as const,
    transition: {
      x: { type: "spring", stiffness: 350, damping: 35 },
      opacity: { duration: 0.2 }
    }
  })
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, type: "spring", stiffness: 400, damping: 25 }
  })
};

export const QuestionCard: React.FC<Props> = ({ question, lang, onAnswer, onBack, onNext, currentVal, isFirst, direction, currentQuestion, totalQuestions }) => {
  
  const handleOptionClick = (val: string) => {
    triggerHaptic('light');
    onAnswer(val);
  };

  const handleBackClick = () => {
    triggerHaptic('medium');
    onBack();
  };

  const handleNextClick = () => {
    triggerHaptic('light');
    onNext();
  };

  return (
    <motion.div
      key={question.id}
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="flex flex-col h-full w-full"
    >
      <div className="flex-1 overflow-y-auto pb-24 no-scrollbar px-1">
        {/* Progress Indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
          <p className="text-sm font-bold text-gray-500">
            {lang === 'ta' ? `கேள்வி ${currentQuestion} / ${totalQuestions}` : `Question ${currentQuestion} of ${totalQuestions}`}
          </p>
        </motion.div>
        
        {/* Header Section */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
          <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4 leading-tight tracking-tight">
            {question.label[lang]}
          </h3>
        </motion.div>

        {/* Option Tiles */}
        <div className="space-y-3">
          {question.options.map((opt: Option, i) => {
            const isSelected = currentVal === opt.val;
            return (
              <motion.button
                custom={i}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                whileTap={{ scale: 0.98 }}
                key={opt.val}
                onClick={() => handleOptionClick(opt.val)}
                className={`relative w-full text-left p-5 rounded-2xl border transition-all duration-200 flex items-center justify-between group overflow-hidden gpu-accelerated
                  ${isSelected 
                    ? 'border-kauvery-primary bg-kauvery-surface ring-1 ring-kauvery-primary ring-offset-1 shadow-md' 
                    : 'border-white bg-white shadow-sm hover:border-gray-200'
                  }`}
              >
                {/* Visual Selection Indicator */}
                {isSelected && (
                  <motion.div 
                    layoutId="active-strip"
                    className="absolute left-0 top-0 bottom-0 w-1.5 bg-kauvery-primary"
                  />
                )}

                <div className="pl-3 relative z-10 w-full">
                  <div className={`text-lg font-bold ${isSelected ? 'text-kauvery-primaryDark' : 'text-gray-800'}`}>
                    {opt.label[lang]}
                  </div>
                </div>

                {/* Radio Circle */}
                <div className={`flex-shrink-0 ml-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-200
                  ${isSelected ? 'border-kauvery-primary bg-kauvery-primary' : 'border-gray-200 bg-gray-50'}`}>
                  {isSelected && (
                    <motion.div 
                      initial={{ scale: 0 }} 
                      animate={{ scale: 1 }} 
                      className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" 
                    />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Navigation Footer Fixed at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 py-4 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC] to-transparent flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto">
          {!isFirst && (
            <button 
              onClick={handleBackClick}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors font-bold text-sm py-3 pr-4 active:scale-95"
            >
              <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center">
                 <ChevronLeft size={18} />
              </div>
              {TEXTS.back[lang]}
            </button>
          )}
        </div>

        {/* Next Button - Only appears if currentVal exists (Review Mode) */}
        <div className="pointer-events-auto">
          {currentVal && (
            <button 
              onClick={handleNextClick}
              className="flex items-center gap-2 bg-kauvery-primary text-white pl-5 pr-4 py-2.5 rounded-full font-bold text-sm shadow-lg shadow-kauvery-primary/30 hover:bg-kauvery-primaryDark active:scale-95 transition-all"
            >
              {TEXTS.next[lang]}
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};