import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AssessmentResult, Language, Mode, AssessmentData } from '../types';
import { QUESTIONS, RESULT_CONTENT } from '../constants';
import { triggerHaptic } from '../utils/haptics';
import QRCode from 'qrcode';
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
  MessageCircle
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

  const content = RESULT_CONTENT[result.zone];
  const userLabel = mode === 'self' 
    ? (lang === 'ta' ? 'பயனர் (Self)' : 'Self') 
    : (lang === 'ta' ? 'பெற்றோர் (Parent)' : 'Parent');

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

  const handleCopyLink = () => {
    if (reportLink) {
      navigator.clipboard.writeText(reportLink).then(() => {
        triggerHaptic('success');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
          {lang === 'ta' ? 'பகிரவும்' : 'Share Assessment'}
        </p>
          <div className="flex gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-xl text-sm font-bold transition-colors shadow-md active:scale-95"
            >
              <MessageCircle size={16} />
              {lang === 'ta' ? 'WhatsApp பகிரவும்' : 'Share via WhatsApp'}
            </button>
            {reportLink && (
              <button
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-bold transition-colors border border-gray-200 active:scale-95"
              >
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                {copied ? (lang === 'ta' ? 'நகலெடுக்கப்பட்டது' : 'Copied') : (lang === 'ta' ? 'நகலெடு' : 'Copy Report')}
              </button>
            )}
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
           <div className="perspective-1000 mb-6">
            <motion.div 
              initial={{ rotateX: 10, opacity: 0, y: 20 }}
              animate={{ rotateX: 0, opacity: 1, y: 0 }}
              className="relative w-full rounded-[1.5rem] bg-gradient-to-br from-[#D32F2F] to-[#B71C1C] text-white shadow-2xl shadow-red-500/30 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 flex items-start justify-between border-b border-white/10">
                <div className="flex items-center gap-3">
                   <div className="bg-white/20 p-3 rounded-lg backdrop-blur-md">
                     <img 
                       src="/components/assets/Kauvery_Nalam_Logo.jpg" 
                       alt="Kauvery Nalam Logo" 
                       className="w-10 h-10 object-contain object-center scale-110"
                       style={{ imageRendering: 'high-quality' }}
                     />
                   </div>
                   <div>
                     <div className="flex items-center gap-2">
                       <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse border border-white"></div>
                       <h2 className="text-[10px] font-bold uppercase tracking-widest opacity-90">Priority Pass</h2>
                     </div>
                     <h1 className="text-lg font-extrabold leading-tight">{content.title[lang]}</h1>
                   </div>
                </div>
                <button 
                  onClick={() => setIsQrZoomed(true)} 
                  className="bg-white p-1 rounded-lg shadow-sm active:scale-95 transition-transform"
                >
                  {qrUrl && <img src={qrUrl} alt="QR" className="w-10 h-10 object-contain rounded" />}
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 bg-white/5">
                <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                  <span className="text-xs font-medium opacity-80">Zone</span>
                  <span className="text-sm font-bold">{content.zoneTitle[lang]}</span>
                </div>
                <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                   <span className="text-xs font-medium opacity-80">For</span>
                   <span className="text-sm font-bold flex items-center gap-2">
                     <User size={14} /> {userLabel}
                   </span>
                </div>
                <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                   <span className="text-xs font-medium opacity-80">Priority Code</span>
                   <span className="text-lg font-mono font-bold tracking-wider text-yellow-300">{result.code}</span>
                </div>
                
                {/* Time Slot Box */}
                <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                   <div className="flex items-center gap-2 mb-1 opacity-80">
                     <Clock size={12} />
                     <span className="text-[10px] font-bold uppercase tracking-wider">{content.timeSlotLabel[lang]}</span>
                   </div>
                   <p className="font-bold text-sm leading-snug">{content.timeSlot[lang]}</p>
                </div>
              </div>
            </motion.div>
           </div>
           
           <div className="text-center mb-6 px-4">
              <p className="text-sm font-medium text-gray-800 leading-relaxed whitespace-pre-line">
                {content.instruction[lang]}
              </p>
           </div>
           
           <div className="h-px bg-gray-200 w-full mb-6"></div>
           
           <SafetySection title={content.safetyTitle[lang]} list={content.safetyPoints} />
        </>
      )}

      {/* === AMBER ZONE LAYOUT === */}
      {result.zone === 'AMBER' && (
        <>
           <motion.div 
             initial={{ scale: 0.95, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="bg-white rounded-[2rem] shadow-xl shadow-orange-500/10 border border-orange-100 overflow-hidden mb-6"
           >
              <div className="bg-[#FFF8E1] p-6 text-center border-b border-orange-100">
                 <h1 className="text-2xl font-extrabold text-[#F57C00] mb-2">{content.badge[lang]}</h1>
                 <p className="text-sm font-bold text-gray-700">{content.title[lang]}</p>
              </div>
              <div className="p-6">
                 {/* Markdown-ish rendering for bold text */}
                 <p className="text-sm text-gray-800 leading-relaxed text-center whitespace-pre-line">
                   {content.desc[lang].split('**').map((part: string, i: number) => 
                      i % 2 === 1 ? <strong key={i} className="text-black">{part}</strong> : part
                   )}
                 </p>
              </div>
           </motion.div>

           <SafetySection title={content.safetyTitle[lang]} list={content.safetyPoints} />
        </>
      )}

      {/* === GREEN ZONE LAYOUT === */}
      {result.zone === 'GREEN' && (
        <>
           <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="text-center mb-8"
           >
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-6 py-2 rounded-full font-bold text-sm mb-4 border border-green-200 shadow-sm">
                <ShieldCheck size={18} />
                {content.badge[lang]} – Kauvery Nalam 2025
              </div>
              <h1 className="text-3xl font-extrabold text-green-700 mb-2 tracking-tight">
                 {content.title[lang]}
              </h1>
              <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto whitespace-pre-line">
                 {content.desc[lang]}
              </p>
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

    </motion.div>
  );
};