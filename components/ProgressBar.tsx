import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  current: number;
  total: number;
}

export const ProgressBar: React.FC<Props> = ({ current, total }) => {
  // Calculate percentage but ensure it never hits 0 visually for better UX
  const percentage = Math.max(5, Math.min(100, ((current + 1) / total) * 100));
  
  return (
    <div className="w-full h-1.5 bg-gray-100 mb-8 overflow-hidden rounded-full relative">
      <motion.div 
        className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-kauvery-primary to-kauvery-primaryDark shadow-[0_0_12px_rgba(230,0,76,0.4)]"
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ 
          type: "spring", 
          stiffness: 100, 
          damping: 20,
          mass: 1
        }}
      />
    </div>
  );
};