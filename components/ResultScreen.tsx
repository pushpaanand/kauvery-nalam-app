import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AssessmentResult, Language, Mode, AssessmentData } from '../types';
import { QUESTIONS, RESULT_CONTENT } from '../constants';
import { triggerHaptic } from '../utils/haptics';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { 
  AlertTriangle, 
  RotateCcw, 
  ShieldCheck, 
  Maximize2,
  X,
  ScanLine,
  Copy,
  Check,
  User,
  Users,
  Clock,
  MessageCircle,
  Download,
  Calendar,
  FileText
} from 'lucide-react';

interface Props {
  result: AssessmentResult;
  answers: AssessmentData;
  lang: Language;
  mode: Mode;
  qrNo?: string | null;
  onRestart: (newMode: Mode) => void;
}

export const ResultScreen: React.FC<Props> = ({ result, answers, lang, mode, qrNo, onRestart }) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [reportLink, setReportLink] = useState('');
  const [isQrZoomed, setIsQrZoomed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [priorityCodeCopied, setPriorityCodeCopied] = useState(false);
  const resultContainerRef = useRef<HTMLDivElement>(null);
  const reportContainerRef = useRef<HTMLDivElement>(null);

  const content = RESULT_CONTENT[result.zone];
  const userLabel = mode === 'self' 
    ? (lang === 'ta' ? 'நீங்கள்' : 'Self') 
    : (lang === 'ta' ? 'பெற்றோர் (Parent)' : 'Parent');

  // Debug: Log answers when component renders
  useEffect(() => {
    console.log('ResultScreen - Answers received:', answers);
    console.log('ResultScreen - Answer keys:', Object.keys(answers));
    console.log('ResultScreen - Total answers:', Object.keys(answers).length);
    QUESTIONS.forEach((q, idx) => {
      const answer = answers[q.id];
      if (answer) {
        const found = q.options.find(opt => opt.val === answer);
        console.log(`Q${idx + 1} (${q.id}): answer="${answer}", found=${!!found}`);
      } else {
        console.log(`Q${idx + 1} (${q.id}): NO ANSWER`);
      }
    });
  }, [answers]);

  // Helper: Unicode-safe Base64 Encode
  const unicodeSafeBtoa = (str: string) => {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode(parseInt(p1, 16));
    }));
  };

  useEffect(() => {
    const generateQR = async () => {
      // 1. Compress Data
      const compressedAnswers = QUESTIONS.map(q => answers[q.id] || null);

      const reportPayload = {
        v: 1, 
        i: result.code, 
        d: result.timestamp,
        z: result.zone, 
        l: lang, 
        a: compressedAnswers 
      };

      try {
        const jsonString = JSON.stringify(reportPayload);
        const encoded = unicodeSafeBtoa(jsonString);
        const safeEncoded = encodeURIComponent(encoded);
        const url = `${window.location.origin}${window.location.pathname}?r=${safeEncoded}`;
        setReportLink(url);
        
        const dataUrl = await QRCode.toDataURL(url, {
          width: 400,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'M'
        });
        setQrUrl(dataUrl);
      } catch (e) {
        console.error("QR Gen Error", e);
      }
    };

    generateQR();

    if (result.zone === 'GREEN') {
      triggerHaptic('success');
      setShowConfetti(true);
    } else if (result.zone === 'RED') {
      triggerHaptic('error');
    } else {
      triggerHaptic('medium');
    }
  }, [result.zone, result.code, answers, lang, result.timestamp]);

  const handleDownloadReport = async () => {
    if (!reportContainerRef.current) {
      console.error('Report container ref is null');
      return;
    }
    
    triggerHaptic('medium');
    
    try {
      // Temporarily make the report visible for capture
      const reportElement = reportContainerRef.current;
      const originalStyle = reportElement.style.cssText;
      
      // Log answers for debugging
      console.log('Downloading report - Answers:', answers);
      console.log('Downloading report - Answer count:', Object.keys(answers).length);
      
      // Verify answers are present
      const answerCount = Object.keys(answers).filter(key => answers[key]).length;
      console.log('Downloading report - Non-empty answers:', answerCount);
      
      if (answerCount === 0) {
        console.warn('WARNING: No answers found in answers object!');
        alert('No answers found. Please ensure you have completed the assessment.');
        reportElement.style.cssText = originalStyle;
        return;
      }
      
      reportElement.style.position = 'fixed';
      reportElement.style.left = '0';
      reportElement.style.top = '0';
      reportElement.style.visibility = 'visible';
      reportElement.style.zIndex = '9999';
      reportElement.style.width = '800px';
      
      // Wait longer for content to fully render, especially for images and text
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(reportElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: true, // Enable logging to see what's being captured
        width: reportElement.scrollWidth,
        height: reportElement.scrollHeight,
        windowWidth: reportElement.scrollWidth,
        windowHeight: reportElement.scrollHeight,
        allowTaint: true
      });
      
      // Restore original style
      reportElement.style.cssText = originalStyle;
      
      // Create download link
      const link = document.createElement('a');
      link.download = `Kauvery-Nalam-Report-${result.code}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      triggerHaptic('success');
    } catch (error) {
      console.error('Download failed', error);
      triggerHaptic('error');
      // Restore original style on error
      if (reportContainerRef.current) {
        reportContainerRef.current.style.cssText = 'position: absolute; visibility: hidden; left: -9999px;';
      }
    }
  };

  const handleCopyPriorityCode = () => {
    if (result.code) {
      navigator.clipboard.writeText(result.code).then(() => {
        triggerHaptic('success');
        setPriorityCodeCopied(true);
        setTimeout(() => setPriorityCodeCopied(false), 2000);
      }).catch(err => console.error('Copy failed', err));
    }
  };

  const handleWhatsAppShare = () => {
    triggerHaptic('medium');
    // Build the site URL with QR parameter (the original site URL, not the report link)
    const baseUrl = window.location.origin + window.location.pathname;
    const siteUrl = qrNo ? `${baseUrl}?qr=${qrNo}` : baseUrl;
    
    // Create WhatsApp share message with site URL
    const message = lang === 'ta' 
      ? `காவேரி நலம் - சிறுநீரக நல மதிப்பீடு\n\n${siteUrl}`
      : `Kauvery Nalam - Kidney Health Assessment\n\n${siteUrl}`;
    
    // Open WhatsApp with the message
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShareReportViaWhatsApp = () => {
    if (!reportLink) return;
    
    triggerHaptic('medium');
    
    // Determine risk level based on zone
    let riskLevel = '';
    if (result.zone === 'RED') {
      riskLevel = lang === 'ta' ? 'அதிக ஆபத்து (HIGH RISK)' : 'HIGH RISK';
    } else if (result.zone === 'AMBER') {
      riskLevel = lang === 'ta' ? 'மிதமான ஆபத்து (MODERATE RISK)' : 'MODERATE RISK';
    } else {
      riskLevel = lang === 'ta' ? 'குறைந்த ஆபத்து (LOW RISK)' : 'LOW RISK';
    }
    
    // Build the message
    let message = '';
    if (lang === 'ta') {
      message = `எனது காவேரி சிறுநீரக ஆபத்து மதிப்பீட்டு முடிவுகள்:\n\n`;
      message += `ஆபத்து நிலை: ${riskLevel}\n`;
      message += `முன்னுரிமை குறியீடு: ${result.code}\n`;
      if (result.zone === 'RED' && content.timeSlot) {
        message += `மருத்துவமனை பதிவு: ${content.timeSlot[lang]}\n`;
      }
      message += `\nமுழு அறிக்கையைக் காண: ${reportLink}`;
    } else {
      message = `My Kauvery Kidney Risk Assessment Results:\n\n`;
      message += `Risk Level: ${riskLevel}\n`;
      message += `Priority Code: ${result.code}\n`;
      if (result.zone === 'RED' && content.timeSlot) {
        message += `Clinic Appointment: ${content.timeSlot[lang]}\n`;
      }
      message += `\nView full report: ${reportLink}`;
    }
    
    // Open WhatsApp with the message
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // --- RENDER HELPERS ---
  const SafetySection = ({ title, list }: { title: string, list: any[] }) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-gray-50/80 backdrop-blur-sm p-5 rounded-2xl border border-gray-200 mt-6 shadow-sm"
    >
      <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide flex items-center gap-2">
        {title}
      </h3>
      <ul className="space-y-3">
        {list.map((item, idx) => (
          <li key={idx} className="text-xs text-gray-700 leading-relaxed flex gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 shrink-0"></div>
             <span>
               {item.label[lang] && <strong className="text-gray-900 mr-1">{item.label[lang]}</strong>}
               {item.text[lang]}
             </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );

  const CtaSection = () => (
    <div className="space-y-3 mt-8">
      {/* Share Section */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
        <p className="text-xs font-bold text-gray-600 mb-3 text-center uppercase tracking-wider">
          {lang === 'ta' ? 'WhatsApp பகிரும் செய்தி' : 'WhatsApp share message'}
        </p>
          <div className="space-y-2">
            <button
              onClick={handleWhatsAppShare}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-xl text-sm font-bold transition-colors shadow-md active:scale-95"
            >
              <MessageCircle size={16} />
              {lang === 'ta' ? 'WhatsApp மூலம் இணைப்பு பகிரவும்' : 'Share link via WhatsApp'}
            </button>
            {reportLink && (
              <button
                onClick={handleShareReportViaWhatsApp}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-xl text-sm font-bold transition-colors shadow-md active:scale-95"
              >
                <MessageCircle size={16} />
                {lang === 'ta' ? 'WhatsApp மூலம் அறிக்கை பகிரவும்' : 'Share report via WhatsApp'}
              </button>
            )}
            <button
              onClick={handleDownloadReport}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-bold transition-colors border border-gray-200 active:scale-95"
            >
              <Download size={16} />
              {lang === 'ta' ? 'அறிக்கையைப் பதிவிறக்கவும்' : 'Download report'}
            </button>
          </div>
        </div>

      {/* Dynamic Main Action Button */}
      <motion.button 
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          triggerHaptic('medium');
          onRestart(mode === 'self' ? 'parent' : 'self');
        }}
        className="w-full bg-gradient-to-r from-kauvery-primary to-kauvery-secondary text-white p-4 rounded-2xl font-bold shadow-lg shadow-kauvery-primary/20 active:scale-95 transition-all flex items-center justify-between group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
             <Users size={18} className="text-white" />
          </div>
          <span className="text-sm font-bold">
            {content.ctaParent ? content.ctaParent[lang] : 'Check for Parent'}
          </span>
        </div>
        <RotateCcw size={18} className="opacity-80 relative z-10" />
      </motion.button>

      {/* Helper Text for CTA */}
      {content.ctaNote && (
        <p className="text-[10px] text-gray-500 text-center px-4 leading-relaxed font-medium">
          {content.ctaNote[lang]}
        </p>
      )}

      {/* Secondary Restart */}
      <button 
        onClick={() => {
          triggerHaptic('light');
          onRestart('self');
        }}
        className="w-full py-3 text-[10px] font-bold text-gray-400 hover:text-kauvery-primary transition-colors uppercase tracking-widest"
      >
        {lang === 'ta' ? 'புதிய பரிசோதனை (New Check)' : 'Start a New Check'}
      </button>
      
      {/* Secondary Note */}
      {result.zone !== 'RED' && (
         <p className="text-[9px] text-gray-400 text-center">
            {lang === 'ta' ? 'நீங்களோ அல்லது உங்கள் உறவினரோ மீண்டும் பரிசோதிக்க விரும்பினால் இதைப் பயன்படுத்தவும்.' : 'Use this if you want to recheck for yourself or another relative.'}
         </p>
      )}
    </div>
  );

  return (
    <motion.div 
      ref={resultContainerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-10 relative"
    >
      {/* Confetti Effect for Green Result */}
      {showConfetti && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-green-400 rounded-full"
              initial={{ x: Math.random() * 100 + "%", y: -20, opacity: 1 }}
              animate={{ y: 600, opacity: 0, rotate: 360 }}
              transition={{ duration: 2 + Math.random() * 2, ease: "easeOut" }}
            />
          ))}
        </div>
      )}

      {/* QR ZOOM MODAL */}
      <AnimatePresence>
        {isQrZoomed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6"
            onClick={() => setIsQrZoomed(false)}
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full flex flex-col items-center text-center relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setIsQrZoomed(false)}
                className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"
              >
                <X size={20} />
              </button>
              
              <div className="flex items-center gap-2 mb-2">
                <ScanLine size={20} className="text-kauvery-primary" />
                <h3 className="text-lg font-bold text-gray-900">Scan for Report</h3>
              </div>
              
              <div className="bg-white p-3 rounded-2xl border-2 border-gray-100 shadow-inner mb-6">
                {qrUrl && <img src={qrUrl} alt="Report QR Large" className="w-56 h-56 object-contain" />}
              </div>

              <div className="flex gap-2 w-full mb-4">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors border border-gray-200"
                >
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy Link'}
                </button>
                <button
                  onClick={handleWhatsAppShare}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  <MessageCircle size={14} />
                  {lang === 'ta' ? 'WhatsApp' : 'WhatsApp'}
                </button>
              </div>

              <div className="bg-gray-50 px-5 py-3 rounded-xl border border-gray-100 w-full text-center">
                <p className="text-[10px] uppercase text-gray-400 font-bold tracking-widest mb-1">Priority ID</p>
                <p className="text-sm font-mono font-bold text-gray-900">{result.code}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === RED ZONE LAYOUT === */}
      {result.zone === 'RED' && (
        <>
           {/* 1. Risk Level Banner (BIGGEST) */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="text-center mb-8"
           >
             <div className="inline-flex items-center justify-center bg-gradient-to-br from-[#D32F2F] to-[#B71C1C] text-white px-8 py-6 rounded-2xl shadow-2xl shadow-red-500/30 mb-4">
               <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                 {content.zoneTitle[lang]}
               </h1>
             </div>
           </motion.div>

           {/* 2. What This Means */}
           <motion.div 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             className="bg-red-50 rounded-2xl border-2 border-red-200 p-6 mb-6"
           >
             <h2 className="text-lg font-bold text-red-800 mb-2">
               {lang === 'ta' ? 'இதன் அர்த்தம்' : 'What This Means'}
             </h2>
             <p className="text-base text-red-900 leading-relaxed">
               {content.subtitle[lang]}
             </p>
           </motion.div>

           {/* 3. Next Steps */}
           <motion.div 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
             className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6"
           >
             <h2 className="text-lg font-bold text-gray-900 mb-4">
               {lang === 'ta' ? 'அடுத்த படிகள்' : 'Next Steps'}
             </h2>
             
             <div className="space-y-4">
               {/* Priority Code */}
               <div className="space-y-2">
                 <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                   <div>
                     <p className="text-xs font-medium text-gray-500 mb-1">
                       {lang === 'ta' ? 'முன்னுரிமை குறியீடு' : 'Priority Code'}
                     </p>
                     <button
                       onClick={handleCopyPriorityCode}
                       className="text-xl font-mono font-bold tracking-wider text-red-600 hover:text-red-700 active:scale-95 transition-all cursor-pointer select-none"
                     >
                       {result.code}
                     </button>
                   </div>
                   <button
                     onClick={() => setIsQrZoomed(true)} 
                     className="bg-gray-100 p-2 rounded-lg shadow-sm active:scale-95 transition-transform"
                   >
                     {qrUrl && <img src={qrUrl} alt="QR" className="w-12 h-12 object-contain rounded" />}
                   </button>
                 </div>
                 <p className="text-xs text-gray-500 text-center">
                   {lang === 'ta' ? 'குறியீட்டை நகலெடுக்க தட்டவும்' : 'Tap code to copy to clipboard'}
                 </p>
               </div>

               {/* Time Slot */}
               <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                 <div className="flex items-center gap-2 mb-2">
                   <Clock size={16} className="text-blue-600" />
                   <span className="text-sm font-bold text-blue-800">{content.timeSlotLabel[lang]}</span>
                 </div>
                 <p className="font-bold text-base text-blue-900 leading-snug">{content.timeSlot[lang]}</p>
               </div>

               {/* Clinic Instruction */}
               <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                 <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                   {content.instruction[lang]}
                 </p>
               </div>
             </div>
           </motion.div>

           {/* Toast Notification for Priority Code Copy */}
           <AnimatePresence>
             {priorityCodeCopied && (
               <motion.div
                 initial={{ opacity: 0, y: 20, scale: 0.9 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 exit={{ opacity: 0, y: 20, scale: 0.9 }}
                 transition={{ duration: 0.2 }}
                 className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2"
               >
                 <Check size={18} />
                 <span className="font-bold text-sm">{lang === 'ta' ? 'நகலெடுக்கப்பட்டது!' : 'Copied!'}</span>
               </motion.div>
             )}
           </AnimatePresence>

           {/* 4. Detailed Instructions */}
           <SafetySection title={content.safetyTitle[lang]} list={content.safetyPoints} />

           {/* Important Notice Section */}
           {content.importantNoticeHeader && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-red-50/80 rounded-2xl border-2 border-red-200 p-6 mb-6 shadow-sm"
              >
                 <h3 className="text-sm font-bold text-red-800 mb-4 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-600" />
                    {content.importantNoticeHeader[lang]}
                 </h3>
                 <ul className="space-y-2.5">
                    {content.importantNoticePoints.map((point: any, i: number) => (
                       <li key={i} className="text-xs text-red-900 leading-relaxed font-medium">
                          {point[lang]}
                       </li>
                    ))}
                 </ul>
                 <p className="text-xs text-red-800 font-semibold mt-4 pt-4 border-t border-red-200">
                    {lang === 'ta' ? 'இந்த அறிகுறிகள் உங்கள் ஆபத்து மதிப்பெண்ணைப் பொருட்படுத்தாமல் உடனடி மருத்துவ பராமரிப்பு தேவை.' : 'These symptoms require urgent care regardless of your risk score.'}
                 </p>
              </motion.div>
           )}
        </>
      )}

      {/* === AMBER ZONE LAYOUT === */}
      {result.zone === 'AMBER' && (
        <>
           <motion.div 
             initial={{ scale: 0.95, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="bg-white rounded-[2rem] shadow-xl shadow-[#FF9800]/10 border border-[#FF9800]/20 overflow-hidden mb-6"
           >
              <div className="bg-[#FFF3E0] p-6 text-center border-b border-[#FF9800]/20">
                 <h1 className="text-2xl font-extrabold text-[#FF9800] mb-2">{content.zoneTitle[lang]}</h1>
                 <p className="text-sm font-bold text-gray-700 mb-4">{content.subtitle[lang]}</p>
                 {/* Markdown-ish rendering for bold text */}
                 <p className="text-sm text-gray-800 leading-relaxed text-center whitespace-pre-line">
                   {content.desc[lang].split('**').map((part: string, i: number) => 
                      i % 2 === 1 ? <strong key={i} className="text-black">{part}</strong> : part
                   )}
                 </p>
              </div>
           </motion.div>

           <SafetySection title={content.safetyTitle[lang]} list={content.safetyPoints} />

           {/* Important Notice Section */}
           {content.importantNoticeHeader && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-red-50/80 rounded-2xl border-2 border-red-200 p-6 mb-6 shadow-sm"
              >
                 <h3 className="text-sm font-bold text-red-800 mb-4 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-600" />
                    {content.importantNoticeHeader[lang]}
                 </h3>
                 <ul className="space-y-2.5">
                    {content.importantNoticePoints.map((point: any, i: number) => (
                       <li key={i} className="text-xs text-red-900 leading-relaxed font-medium">
                          {point[lang]}
                       </li>
                    ))}
                 </ul>
                 <p className="text-xs text-red-800 font-semibold mt-4 pt-4 border-t border-red-200">
                    {lang === 'ta' ? 'இந்த அறிகுறிகள் உங்கள் ஆபத்து மதிப்பெண்ணைப் பொருட்படுத்தாமல் உடனடி மருத்துவ பராமரிப்பு தேவை.' : 'These symptoms require urgent care regardless of your risk score.'}
                 </p>
              </motion.div>
           )}
        </>
      )}

      {/* === GREEN ZONE LAYOUT === */}
      {result.zone === 'GREEN' && (
        <>
           <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="bg-white rounded-[2rem] shadow-xl shadow-green-500/10 border border-green-100 overflow-hidden mb-6"
           >
              <div className="bg-green-50 p-6 text-center border-b border-green-100">
                 <h1 className="text-2xl font-extrabold text-green-700 mb-2">{content.zoneTitle[lang]}</h1>
                 <p className="text-sm font-bold text-gray-700 mb-4">{content.subtitle[lang]}</p>
                 <p className="text-sm text-gray-800 leading-relaxed text-center whitespace-pre-line">
                   {content.desc[lang]}
                 </p>
              </div>
           </motion.div>

           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4 border-b border-gray-100 pb-3">
                 {content.goldenRulesHeader[lang]}
              </h3>
              <ul className="space-y-3">
                 {content.goldenRules.map((rule: any, i: number) => (
                    <li key={i} className="text-xs text-gray-700 leading-relaxed bg-gray-50/50 p-2 rounded-lg">
                       {rule[lang]}
                    </li>
                 ))}
              </ul>
           </div>

           {/* Important Notice Section */}
           {content.importantNoticeHeader && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-red-50/80 rounded-2xl border-2 border-red-200 p-6 mb-6 shadow-sm"
              >
                 <h3 className="text-sm font-bold text-red-800 mb-4 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-600" />
                    {content.importantNoticeHeader[lang]}
                 </h3>
                 <ul className="space-y-2.5">
                    {content.importantNoticePoints.map((point: any, i: number) => (
                       <li key={i} className="text-xs text-red-900 leading-relaxed font-medium">
                          {point[lang]}
                       </li>
                    ))}
                 </ul>
                 <p className="text-xs text-red-800 font-semibold mt-4 pt-4 border-t border-red-200">
                    {lang === 'ta' ? 'இந்த அறிகுறிகள் உங்கள் ஆபத்து மதிப்பெண்ணைப் பொருட்படுத்தாமல் உடனடி மருத்துவ பராமரிப்பு தேவை.' : 'These symptoms require urgent care regardless of your risk score.'}
                 </p>
              </motion.div>
           )}

           <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-5 mb-6">
              <h4 className="text-xs font-bold text-blue-800 mb-2">
                 {content.footerHeader[lang]}
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line mb-4">
                 {content.footerText[lang]}
              </p>
              <div className="bg-white p-3 rounded-xl border border-blue-100/50">
                 <p className="text-[10px] text-gray-500 leading-relaxed">
                    {content.finalNote[lang]}
                 </p>
              </div>
           </div>
        </>
      )}

      {/* Common CTA Footer */}
      <CtaSection />

      {/* Hidden Full Report View for Download */}
      <div 
        ref={reportContainerRef}
        className="fixed -left-[9999px] top-0 w-[800px] bg-white"
        style={{ position: 'absolute', visibility: 'hidden' }}
      >
        <div className="min-h-screen bg-gray-50 pb-safe">
          {/* Report Header */}
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center overflow-hidden p-2">
                  <img 
                    src="/components/assets/Kauvery_Nalam_Logo.jpg" 
                    alt="Kauvery Nalam Logo" 
                    className="w-full h-full object-contain object-center scale-110"
                    style={{ imageRendering: 'high-quality' }}
                  />
                </div>
                <div>
                  <h1 className="text-sm font-extrabold uppercase text-gray-900 leading-none mb-1">
                    {lang === 'ta' ? 'காவேரி நலம்' : 'Kauvery Nalam'}
                  </h1>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {lang === 'ta' ? 'அதிகாரப்பூர்வ மருத்துவ அறிக்கை' : 'Official Medical Report'}
                  </p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                result.zone === 'RED' ? 'bg-red-50 text-red-700 border-red-100' :
                result.zone === 'AMBER' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                'bg-green-50 text-green-700 border-green-100'
              }`}>
                {result.zone === 'RED' ? (lang === 'ta' ? 'கவனம் தேவை' : 'Action Required') :
                 result.zone === 'AMBER' ? (lang === 'ta' ? 'மிதமான ஆபத்து' : 'Moderate Risk') :
                 (lang === 'ta' ? 'ஆரோக்கியமான நிலை' : 'Healthy')}
              </div>
            </div>
          </div>

          <div className="max-w-xl mx-auto px-6 py-8">
            {/* Patient Info Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 flex items-center gap-1">
                    <FileText size={10} /> {lang === 'ta' ? 'குறிப்பு எண்' : 'Reference ID'}
                  </p>
                  <p className="font-mono text-sm font-bold text-gray-900">{result.code}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 flex items-center justify-end gap-1">
                    <Calendar size={10} /> {lang === 'ta' ? 'தேதி' : 'Date'}
                  </p>
                  <p className="font-mono text-sm font-bold text-gray-900">
                    {new Date(result.timestamp).toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Q&A List */}
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4 pl-1">
              {lang === 'ta' ? 'மருத்துவ பதில்கள்' : 'Clinical Responses'}
            </h3>
            <div className="space-y-4">
              {QUESTIONS.map((q, index) => {
                // Use same logic as ReportView - get answer from object by question ID
                const answer = answers[q.id];
                
                // Skip if answer is missing (same as ReportView)
                if (!answer) return null;
                
                // Find full label of answer for display (same as ReportView)
                const optionLabel = q.options.find(opt => opt.val === answer)?.label[lang] || answer;

                return (
                  <div key={q.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex gap-3">
                      <span className="text-xs font-bold text-gray-300 w-5 pt-0.5 flex-shrink-0">{index + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 mb-2 leading-snug">
                          {q.label[lang]}
                        </p>
                        <div className="inline-block bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                          <p className="text-sm font-bold text-kauvery-primary break-words">
                            {optionLabel}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Result Summary */}
            <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">
                {lang === 'ta' ? 'மதிப்பீட்டு முடிவு' : 'Assessment Result'}
              </h3>
              
              {/* Risk Level */}
              <div className={`inline-block px-4 py-2 rounded-full text-sm font-bold mb-4 ${
                result.zone === 'RED' ? 'bg-red-50 text-red-700 border border-red-200' :
                result.zone === 'AMBER' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                'bg-green-50 text-green-700 border border-green-200'
              }`}>
                {content.zoneTitle[lang]} - {content.subtitle[lang]}
              </div>

              {/* Zone-specific content */}
              {result.zone === 'RED' && (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-1">{lang === 'ta' ? 'அடுத்த படிகள்' : 'Next Steps'}</p>
                    <p className="text-sm text-gray-800">{content.instruction[lang]}</p>
                  </div>
                  {content.timeSlot && (
                    <div>
                      <p className="text-xs font-bold text-gray-700 mb-1">{content.timeSlotLabel[lang]}</p>
                      <p className="text-sm text-gray-800">{content.timeSlot[lang]}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-2">{content.safetyTitle[lang]}</p>
                    <ul className="space-y-2">
                      {content.safetyPoints.map((point: any, idx: number) => (
                        <li key={idx} className="text-xs text-gray-700">
                          {point.label[lang] && <strong className="text-gray-900">{point.label[lang]} </strong>}
                          {point.text[lang]}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {content.importantNoticeHeader && (
                    <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                      <p className="text-xs font-bold text-red-800 mb-2">{content.importantNoticeHeader[lang]}</p>
                      <ul className="space-y-1">
                        {content.importantNoticePoints.map((point: any, idx: number) => (
                          <li key={idx} className="text-xs text-red-900">
                            {point[lang]}
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-red-800 font-semibold mt-2 pt-2 border-t border-red-200">
                        {lang === 'ta' ? 'இந்த அறிகுறிகள் உங்கள் ஆபத்து மதிப்பெண்ணைப் பொருட்படுத்தாமல் உடனடி மருத்துவ பராமரிப்பு தேவை.' : 'These symptoms require urgent care regardless of your risk score.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {result.zone === 'AMBER' && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                    {content.desc[lang].split('**').map((part: string, i: number) => 
                      i % 2 === 1 ? <strong key={i} className="text-black">{part}</strong> : part
                    )}
                  </p>
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-2">{content.safetyTitle[lang]}</p>
                    <ul className="space-y-2">
                      {content.safetyPoints.map((point: any, idx: number) => (
                        <li key={idx} className="text-xs text-gray-700">
                          {point.label[lang] && <strong className="text-gray-900">{point.label[lang]} </strong>}
                          {point.text[lang]}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {content.importantNoticeHeader && (
                    <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                      <p className="text-xs font-bold text-red-800 mb-2">{content.importantNoticeHeader[lang]}</p>
                      <ul className="space-y-1">
                        {content.importantNoticePoints.map((point: any, idx: number) => (
                          <li key={idx} className="text-xs text-red-900">
                            {point[lang]}
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-red-800 font-semibold mt-2 pt-2 border-t border-red-200">
                        {lang === 'ta' ? 'இந்த அறிகுறிகள் உங்கள் ஆபத்து மதிப்பெண்ணைப் பொருட்படுத்தாமல் உடனடி மருத்துவ பராமரிப்பு தேவை.' : 'These symptoms require urgent care regardless of your risk score.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {result.zone === 'GREEN' && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                    {content.desc[lang]}
                  </p>
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-2">{content.goldenRulesHeader[lang]}</p>
                    <ul className="space-y-2">
                      {content.goldenRules.map((rule: any, idx: number) => (
                        <li key={idx} className="text-xs text-gray-700">
                          {rule[lang]}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {content.importantNoticeHeader && (
                    <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                      <p className="text-xs font-bold text-red-800 mb-2">{content.importantNoticeHeader[lang]}</p>
                      <ul className="space-y-1">
                        {content.importantNoticePoints.map((point: any, idx: number) => (
                          <li key={idx} className="text-xs text-red-900">
                            {point[lang]}
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-red-800 font-semibold mt-2 pt-2 border-t border-red-200">
                        {lang === 'ta' ? 'இந்த அறிகுறிகள் உங்கள் ஆபத்து மதிப்பெண்ணைப் பொருட்படுத்தாமல் உடனடி மருத்துவ பராமரிப்பு தேவை.' : 'These symptoms require urgent care regardless of your risk score.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="mt-12 text-center">
              <p className="text-[10px] text-gray-400 font-medium max-w-xs mx-auto leading-relaxed">
                {lang === 'ta' ? 'இந்த அறிக்கை காவேரி நலம் டிஜிட்டல் மதிப்பீட்டால் தானாக உருவாக்கப்பட்டது. இது மருத்துவரின் முறையான நோயறிதலுக்கு மாற்றாகாது.' : 'This report is automatically generated by Kauvery Nalam Digital Assessment. It does not replace a doctor\'s formal diagnosis.'}
              </p>
            </div>
          </div>
        </div>
      </div>

    </motion.div>
  );
};