import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-md h-[100dvh] w-full">
      <div className="relative flex items-center justify-center mb-8">
        
        {/* Outer Ripple Rings */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute border border-kauvery-primary/20 rounded-full"
            initial={{ width: '4rem', height: '4rem', opacity: 1 }}
            animate={{ width: '12rem', height: '12rem', opacity: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.6,
              ease: "easeOut"
            }}
          />
        ))}

        {/* Solid Center Circle */}
        <div className="relative z-10 w-24 h-24 bg-white rounded-full shadow-xl shadow-kauvery-primary/10 flex items-center justify-center p-1">
          {/* Progress Ring SVG */}
          <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="#FFE0E9"
              strokeWidth="6"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="#E6004C"
              strokeWidth="6"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
            />
          </svg>
          
          {/* Center Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-kauvery-primary"
            >
              <Activity size={32} strokeWidth={2.5} />
            </motion.div>
          </div>
        </div>
      </div>
      
      <div className="text-center space-y-2">
        <motion.h3 
          className="text-lg font-bold text-gray-900"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Analyzing Vitals
        </motion.h3>
        <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">
          Calculating Kidney Health Score
        </p>
      </div>
    </div>
  );
};