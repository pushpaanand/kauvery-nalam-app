import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Language, UserInfo } from '../types';
import { TEXTS } from '../constants';
import { User, Calendar, Phone, Mail, ChevronRight, MapPin, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface Props {
  lang: Language;
  onSubmit: (info: UserInfo) => void;
}

// Helper for Input Wrapper
const InputGroup = ({ 
  label, 
  icon: Icon, 
  error, 
  children, 
  rightElement,
  onIconClick,
  isValid,
  className = ""
}: { 
  label: string, 
  icon: any, 
  error?: string, 
  children?: React.ReactNode,
  rightElement?: React.ReactNode,
  onIconClick?: () => void,
  isValid?: boolean,
  className?: string
}) => (
  <div className={`space-y-1.5 ${className}`}>
    <label className="text-xs font-bold uppercase text-gray-500 tracking-wider ml-1 flex justify-between items-center">
      {label}
    </label>
    <div className={`relative group transition-all duration-200 ${error ? 'animate-shake' : ''}`}>
      {/* Icon Button: Clickable if onIconClick provided, strictly positioned over padding */}
      <button
        type="button"
        onClick={(e) => {
          if (onIconClick) {
            e.preventDefault();
            e.stopPropagation();
            onIconClick();
          }
        }}
        className={`absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center transition-colors duration-200 z-10 outline-none
          ${onIconClick ? 'cursor-pointer hover:bg-gray-100 rounded-l-xl active:bg-gray-200' : 'pointer-events-none'} 
          ${error ? 'text-red-400' : isValid ? 'text-green-500' : 'text-gray-400 group-focus-within:text-kauvery-primary'}`}
        tabIndex={-1} 
      >
        <Icon size={18} />
      </button>
      
      {/* The Input Field */}
      {children}
      
      {/* Right Element or Validation Icon */}
      {rightElement ? (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20">
          {rightElement}
        </div>
      ) : (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none transition-all duration-300">
          {error && <AlertCircle size={18} className="text-red-500 animate-in zoom-in" />}
          {!error && isValid && <CheckCircle2 size={18} className="text-green-500 animate-in zoom-in" />}
        </div>
      )}
    </div>
    {error && (
      <div className="flex items-center gap-1 text-red-500 text-[10px] font-bold ml-1 animate-in slide-in-from-top-1 fade-in duration-200">
        <AlertCircle size={10} /> {error}
      </div>
    )}
  </div>
);

export const UserInfoForm: React.FC<Props> = ({ lang, onSubmit }) => {
  const [name, setName] = useState('');
  
  // Simplified Date State (Just Native String)
  const [dob, setDob] = useState(''); 
  const [age, setAge] = useState<number | null>(null);
  
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Calculate Age
  useEffect(() => {
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      setAge((calculatedAge >= 0 && calculatedAge < 120) ? calculatedAge : null);
    } else {
      setAge(null);
    }
  }, [dob]);

  // --- Validation Logic ---
  const validateField = (field: string, value: string) => {
    let error = '';
    
    if (field === 'phone' && value) {
      if (!/^[6-9]\d{9}$/.test(value)) error = TEXTS.invalidPhone[lang];
    }
    
    if (field === 'email' && value) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = TEXTS.invalidEmail[lang];
    }

    setErrors(prev => {
      const newErrors = { ...prev };
      if (error) newErrors[field] = error;
      else delete newErrors[field];
      return newErrors;
    });
  };

  const handleBlur = (field: string, value: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, value);
  };

  const validateAll = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = TEXTS.reqField[lang];
    if (!dob || age === null) newErrors.dob = TEXTS.reqField[lang];
    if (!location.trim()) newErrors.location = TEXTS.reqField[lang];

    // Strict regex checks
    if (phone && !/^[6-9]\d{9}$/.test(phone)) newErrors.phone = TEXTS.invalidPhone[lang];
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = TEXTS.invalidEmail[lang];
    
    // Either/Or Requirement
    if (!phone && !email) newErrors.contact = TEXTS.errorContact[lang];
    // If one is present but invalid, contact error shouldn't override specific error
    if ((phone && newErrors.phone) || (email && newErrors.email)) {
       delete newErrors.contact; 
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateAll()) {
      triggerHaptic('medium');
      onSubmit({
        name,
        dob,
        age: age || 0,
        phone,
        email,
        location
      });
    } else {
      triggerHaptic('error');
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    triggerHaptic('light');
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await res.json();
          let locString = '';
          if (data.city) locString += data.city;
          else if (data.locality) locString += data.locality;
          if (data.principalSubdivision) locString += `, ${data.principalSubdivision}`;
          if (!locString) locString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          
          setLocation(locString);
          if (errors.location) setErrors(prev => { const p = {...prev}; delete p.location; return p; });
        } catch (e) {
          setLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col h-full w-full px-1 pt-2 pb-32 overflow-y-auto no-scrollbar"
    >
      <div className="mb-6 px-1">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2 tracking-tight">
          {TEXTS.formTitle[lang]}
        </h2>
        <p className="text-sm text-gray-500 font-medium">
          {TEXTS.formDesc[lang]}
        </p>
      </div>

      <div className="space-y-5 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        
        {/* Name Input */}
        <InputGroup 
           label={TEXTS.nameLabel[lang]} 
           icon={User} 
           error={errors.name}
           isValid={!!name && !errors.name}
        >
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors(prev => { const p = {...prev}; delete p.name; return p; });
            }}
            onBlur={() => handleBlur('name', name)}
            className={`w-full bg-gray-50 border-2 rounded-xl py-3.5 pl-12 pr-10 text-gray-900 font-semibold outline-none transition-all placeholder:text-gray-300
              ${errors.name 
                ? 'border-red-100 focus:border-red-300 bg-red-50/50' 
                : 'border-transparent focus:bg-white focus:border-kauvery-primary/20 focus:ring-4 focus:ring-kauvery-primary/5 hover:bg-gray-100'}`}
            placeholder={lang === 'en' ? 'Your full name' : 'உங்கள் முழு பெயர்'}
          />
        </InputGroup>

        {/* DOB & Age (Standard Native Picker) */}
        <div className="flex gap-4">
          <div className="flex-1">
            <InputGroup 
              label={TEXTS.dobLabel[lang]} 
              icon={Calendar} 
              error={errors.dob}
              isValid={!!dob && !errors.dob}
            >
              <input
                type="date"
                value={dob}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  setDob(e.target.value);
                  if (errors.dob) setErrors(prev => { const p = {...prev}; delete p.dob; return p; });
                }}
                onBlur={() => handleBlur('dob', dob)}
                className={`w-full bg-gray-50 border-2 rounded-xl py-3.5 pl-12 pr-4 text-gray-900 font-bold outline-none transition-all uppercase appearance-none
                  ${errors.dob 
                    ? 'border-red-100 focus:border-red-300 bg-red-50/50' 
                    : 'border-transparent focus:bg-white focus:border-kauvery-primary/20 focus:ring-4 focus:ring-kauvery-primary/5 hover:bg-gray-100'}`}
                style={{ minHeight: '52px' }}
              />
            </InputGroup>
          </div>
          
          {/* Age Badge */}
          <div className="w-20 pt-6">
            <div className={`h-[54px] rounded-xl flex flex-col items-center justify-center border-2 transition-all duration-300
               ${age !== null 
                 ? 'bg-blue-50 border-blue-100' 
                 : 'bg-gray-50 border-transparent'}`}>
              <span className="text-[9px] uppercase text-gray-400 font-bold tracking-wider">{TEXTS.ageLabel[lang]}</span>
              <span className={`text-xl font-bold ${age !== null ? 'text-blue-600' : 'text-gray-300'}`}>
                {age !== null ? age : '--'}
              </span>
            </div>
          </div>
        </div>

        {/* Location Input */}
        <InputGroup 
          label={TEXTS.locationLabel[lang]} 
          icon={MapPin} 
          error={errors.location}
          isValid={!!location && !errors.location}
          rightElement={
            <button
              onClick={handleDetectLocation}
              disabled={isLocating}
              className="bg-white hover:bg-gray-50 text-kauvery-primary text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-sm border border-gray-100 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-70"
            >
              {isLocating ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
              {isLocating ? '...' : TEXTS.detectBtn[lang]}
            </button>
          }
        >
          <input
            type="text"
            value={location}
            onChange={(e) => {
               setLocation(e.target.value);
               if (errors.location) setErrors(prev => { const p = {...prev}; delete p.location; return p; });
            }}
            onBlur={() => handleBlur('location', location)}
            className={`w-full bg-gray-50 border-2 rounded-xl py-3.5 pl-12 pr-24 text-gray-900 font-medium outline-none transition-all placeholder:text-gray-300
              ${errors.location 
                ? 'border-red-100 focus:border-red-300 bg-red-50/50' 
                : 'border-transparent focus:bg-white focus:border-kauvery-primary/20 focus:ring-4 focus:ring-kauvery-primary/5 hover:bg-gray-100'}`}
            placeholder={TEXTS.locationPlaceholder[lang]}
          />
        </InputGroup>

        <div className="w-full h-px bg-gray-100/80 my-2"></div>

        {/* Contact Section */}
        <div>
          <label className="text-xs font-bold uppercase text-gray-500 tracking-wider ml-1 mb-3 block">
            {TEXTS.contactTitle[lang]}
          </label>
          
          <div className="space-y-4">
            {/* Phone */}
            <div className="space-y-1.5">
               <div className="relative group">
                  <div className={`absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center transition-colors z-10 ${errors.phone ? 'text-red-400' : !!phone && !errors.phone ? 'text-green-500' : 'text-gray-400'}`}>
                    <Phone size={18} />
                  </div>
                  
                  {/* Fixed Prefix */}
                  <div className="absolute left-11 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm pointer-events-none select-none">
                    +91
                  </div>

                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => {
                       const val = e.target.value.replace(/\D/g, ''); // Only numbers
                       setPhone(val);
                       // Clear error if user is typing, validate on blur
                       if (errors.phone) setErrors(prev => { const p = {...prev}; delete p.phone; return p; });
                       if (errors.contact) setErrors(prev => { const p = {...prev}; delete p.contact; return p; });
                    }}
                    onBlur={() => handleBlur('phone', phone)}
                    className={`w-full bg-gray-50 border-2 rounded-xl py-3.5 pl-[4.5rem] pr-10 text-gray-900 font-mono font-bold text-lg outline-none transition-all tracking-wide
                      ${errors.phone 
                        ? 'border-red-100 focus:border-red-300 bg-red-50/50' 
                        : 'border-transparent focus:bg-white focus:border-kauvery-primary/20 focus:ring-4 focus:ring-kauvery-primary/5 hover:bg-gray-100'}`}
                    placeholder=""
                  />
                  
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                     {errors.phone && <AlertCircle size={18} className="text-red-500" />}
                     {!errors.phone && phone && phone.length === 10 && <CheckCircle2 size={18} className="text-green-500" />}
                  </div>
               </div>
               {errors.phone && (
                  <div className="text-red-500 text-[10px] font-bold ml-1 flex items-center gap-1 animate-in slide-in-from-top-1">
                     <AlertCircle size={10} /> {errors.phone}
                  </div>
               )}
            </div>

            <div className="relative flex items-center justify-center py-1">
              <span className="bg-white px-3 text-[10px] text-gray-400 font-bold uppercase tracking-widest relative z-10">OR</span>
              <div className="absolute inset-0 h-px bg-gray-100 top-1/2 -translate-y-1/2 -z-0"></div>
            </div>

            {/* Email */}
            <InputGroup 
               label={TEXTS.emailLabel[lang]} 
               icon={Mail} 
               error={errors.email}
               isValid={!!email && !errors.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => { 
                   setEmail(e.target.value); 
                   if (errors.email) setErrors(prev => { const p = {...prev}; delete p.email; return p; });
                   if (errors.contact) setErrors(prev => { const p = {...prev}; delete p.contact; return p; });
                }}
                onBlur={() => handleBlur('email', email)}
                className={`w-full bg-gray-50 border-2 rounded-xl py-3.5 pl-12 pr-10 text-gray-900 font-medium outline-none transition-all
                   ${errors.email 
                     ? 'border-red-100 focus:border-red-300 bg-red-50/50' 
                     : 'border-transparent focus:bg-white focus:border-kauvery-primary/20 focus:ring-4 focus:ring-kauvery-primary/5 hover:bg-gray-100'}`}
                placeholder=""
              />
            </InputGroup>
            
            {/* Global Contact Error (If neither provided) */}
            {errors.contact && !errors.phone && !errors.email && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2"
              >
                 <AlertCircle size={16} className="text-red-500" />
                 <p className="text-xs text-red-600 font-bold">{errors.contact}</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent z-20">
        <div className="max-w-xl mx-auto">
          <button
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-kauvery-primary to-kauvery-primaryDark text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-kauvery-primary/25 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {TEXTS.continueBtn[lang]}
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};