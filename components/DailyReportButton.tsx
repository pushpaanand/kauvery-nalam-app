import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerDailyReport } from '../services/dataService';
import { triggerHaptic } from '../utils/haptics';

interface Props {
  language: 'en' | 'ta';
}

export const DailyReportButton: React.FC<Props> = ({ language }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleClick = async () => {
    triggerHaptic('medium');
    setIsLoading(true);

    try {
      const result = await triggerDailyReport();
      setToastMessage(result.message);
      setShowToast(true);
      
      if (result.success) {
        triggerHaptic('success');
      } else {
        triggerHaptic('error');
      }

      // Hide toast after 3 seconds
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    } catch (error) {
      console.error('Error triggering daily report:', error);
      setToastMessage(language === 'en' ? 'Failed to send report' : 'அறிக்கை அனுப்ப முடியவில்லை');
      setShowToast(true);
      triggerHaptic('error');
      
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={handleClick}
        disabled={isLoading}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-kauvery-primary hover:bg-[#cc0039] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label={language === 'en' ? 'Send Daily Report' : 'தினசரி அறிக்கை அனுப்ப'}
      >
        {isLoading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
          />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        )}
      </motion.button>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-6 z-50 bg-white rounded-lg shadow-xl border border-gray-200 px-4 py-3 max-w-xs"
          >
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${toastMessage.includes('success') || toastMessage.includes('successfully') ? 'bg-green-500' : 'bg-red-500'}`} />
              <p className="text-sm font-medium text-gray-800">{toastMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
