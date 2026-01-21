import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppState, Language, Mode, AssessmentData, UserInfo } from './types';
import { QUESTIONS, TEXTS } from './constants';
import { LanguageSelector } from './components/LanguageSelector';
import { ProgressBar } from './components/ProgressBar';
import { QuestionCard } from './components/QuestionCard';
import { ResultScreen } from './components/ResultScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { ReportView } from './components/ReportView'; // Import Report View
import { UserInfoForm } from './components/UserInfoForm'; // Import Form
import { DailyReportButton } from './components/DailyReportButton'; // Import Daily Report Button
import { submitAssessment, generatePriorityCode, createUser } from './services/dataService';
import { triggerHaptic } from './utils/haptics';

const App: React.FC = () => {
  const [reportData, setReportData] = useState<string | null>(null);
  
  // Initialize App State
  const [state, setState] = useState<AppState>({
    language: 'en', 
    hasStarted: false,
    isUserInfoCollected: false,
    userInfo: null,
    userId: null,
    mode: 'self',
    step: 0,
    answers: {},
    result: null,
    unit: 'default',
    qrNo: null,
    isSubmitting: false
  });

  const [direction, setDirection] = useState(0);

  const [qrError, setQrError] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState<boolean>(true);

  // Check for Report param, QR param, and Unit param on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // 1. Check for Report Data (QR Code Scan) - allow without QR param
    const rParam = params.get('r');
    if (rParam) {
      setReportData(rParam);
      setQrLoading(false);
      return; // Stop normal app loading if report is present
    }

    // 2. Check for QR Data -> REQUIRED for normal flow
    const qrParam = params.get('qr');
    if (!qrParam) {
      setQrError('QR parameter is required. Please scan a valid QR code.');
      setQrLoading(false);
      return;
    }

    // Set qrNo immediately so page can render while loading
    setState(prev => ({ ...prev, qrNo: qrParam }));

    // Fetch QR config from backend
    const apiBase = process.env.VITE_API_BASE ? process.env.VITE_API_BASE : '';
    const apiUrl = `${apiBase}/api/qr-config?qr=${encodeURIComponent(qrParam)}`;
    
    console.log('Fetching QR config from:', apiUrl);
    
    fetch(apiUrl)
      .then(async (resp) => {
        const contentType = resp.headers.get('content-type');
        
        // Check if response is HTML (error page) instead of JSON
        if (contentType && !contentType.includes('application/json')) {
          const text = await resp.text();
          console.error('Received HTML instead of JSON:', text.substring(0, 200));
          throw new Error('Backend server not responding. Please ensure the backend is running.');
        }
        
        if (!resp.ok) {
          const text = await resp.text();
          let errorMsg = 'QR not found';
          try {
            const json = JSON.parse(text);
            errorMsg = json.error || text;
          } catch {
            errorMsg = text || `Server error (${resp.status})`;
          }
          throw new Error(errorMsg);
        }
        return resp.json();
      })
      .then(data => {
        console.log('QR config loaded:', data);
        if (!data || !data.qr_no) {
          throw new Error('Invalid QR config response');
        }
        setState(prev => ({ 
          ...prev, 
          unit: data.location || prev.unit, 
          qrNo: data.qr_no || qrParam 
        }));
        setQrError(null);
        setQrLoading(false);
      })
      .catch(err => {
        console.error('QR config fetch failed', err);
        let errorMessage = err.message || 'QR not found or inactive';
        
        // Better error messages for common issues
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          errorMessage = 'Cannot connect to backend server. Please ensure the backend is running on port 4000.';
        } else if (err.message.includes('not responding')) {
          errorMessage = err.message;
        }
        
        setQrError(errorMessage);
        setQrLoading(false);
        // Keep qrNo even if fetch fails, so user can see what they tried
        setState(prev => ({ ...prev, qrNo: qrParam }));
      });
  }, []);

  const toggleLanguage = (lang: Language) => {
    triggerHaptic('light');
    setState(prev => ({ ...prev, language: lang }));
  };

  const handleStart = () => {
    triggerHaptic('medium');
    setDirection(1);
    setState(prev => ({ ...prev, hasStarted: true }));
  };

  const handleUserInfoSubmit = async (info: UserInfo) => {
    // Auto-calculate Q1 (Age Group) based on info.age
    let ageGroupVal = '';
    if (info.age < 40) ageGroupVal = 'Below 40';
    else if (info.age >= 40 && info.age <= 60) ageGroupVal = '40–60';
    else ageGroupVal = 'Above 60';

    const newAnswers = { ...state.answers, q1: ageGroupVal };

    // Create user in database - CALL USER API
    console.log('Creating user via API...', info);
    const userId = await createUser(info);
    if (!userId) {
      console.error('Failed to create user - API call failed');
      alert('Failed to save user information. Please try again.');
      return; // Don't proceed if user creation fails
    }
    console.log('User created successfully, userId:', userId);

    // Set state: Info collected, answers updated, Step moves to 1 (Skipping Q1)
    setState(prev => ({
      ...prev,
      userInfo: info,
      userId: userId,
      isUserInfoCollected: true,
      answers: newAnswers,
      step: 1 // Skip Q1
    }));
    setDirection(1);
  };

  const calculateResult = (data: AssessmentData) => {
    const isRed = 
      data.q6 === 'Yes' || 
      data.q7 === 'Yes' || 
      data.q8 === 'Yes' || 
      data.q10 === 'Yes';

    if (isRed) return 'RED';

    // Special rule: If user has Diabetes (Q3) AND selects "Trace" (Q15), result must be AMBER
    const hasDiabetes = data.q3 && data.q3 !== 'No';
    const hasTrace = data.q15 === 'Trace';
    if (hasDiabetes && hasTrace) {
      return 'AMBER';
    }

    // Q15 logic: None = Green (doesn't contribute to risk), Trace/1+/2+/3+ = Risk
    // If Q15 is None, it doesn't add to risk, so we continue with other checks
    // If Q15 is Trace/1+/2+/3+, it contributes to risk (AMBER)
    const hasUrineProteinRisk = data.q15 && 
      (data.q15 === 'Trace' || data.q15 === '1+' || data.q15 === '2+' || data.q15 === '3+');

    const isAmber = 
      (data.q3 && data.q3 !== 'No') ||
      data.q4 === 'Yes' ||
      data.q5 === 'Yes' ||
      (data.q9 && data.q9 !== 'No') ||
      data.q11 === 'Yes' ||
      data.q1 === 'Above 60' ||
      hasUrineProteinRisk;

    if (isAmber) return 'AMBER';

    return 'GREEN';
  };

  // Shared Logic for determining the next valid step index
  const getNextStepIndex = (currentStep: number, currentAnswers: AssessmentData) => {
    let nextStep = currentStep + 1;
    
    // Skip logic loop
    while (nextStep < QUESTIONS.length) {
      const q = QUESTIONS[nextStep];
      if (q.dependsOn && q.requiredValues) {
        if (!q.requiredValues.includes(currentAnswers[q.dependsOn])) {
          nextStep++;
          continue;
        }
      }
      break;
    }
    return nextStep;
  };

  const handleAnswer = async (val: string) => {
    const currentQ = QUESTIONS[state.step];
    const newAnswers = { ...state.answers, [currentQ.id]: val };

    const nextStep = getNextStepIndex(state.step, newAnswers);

    if (nextStep >= QUESTIONS.length) {
      setDirection(1);
      setState(prev => ({ ...prev, answers: newAnswers, isSubmitting: true }));
      
      const zone = calculateResult(newAnswers);
      const code = zone === 'RED' ? generatePriorityCode('RED') : generatePriorityCode(zone);
      
      const resultObj = {
        zone: zone as any,
        code,
        timestamp: new Date().toISOString()
      };

      // CALL ASSESSMENT API when showing results
      console.log('Submitting assessment via API...', { 
        qrNo: state.qrNo, 
        userId: state.userId, 
        risk_zone: zone,
        priority_code: code 
      });
      
      const success = await submitAssessment(
        newAnswers, 
        resultObj, 
        state.unit, 
        state.language, 
        state.mode,
        state.userInfo,
        state.userId,
        state.qrNo
      );

      if (success) {
        console.log('Assessment submitted successfully');
      } else {
        console.error('Assessment submission failed');
        alert('Failed to save assessment. Please try again.');
      }

      setState(prev => ({ 
        ...prev, 
        answers: newAnswers, 
        result: resultObj,
        isSubmitting: false 
      }));
    } else {
      setDirection(1); // Slide Left (Forward)
      setState(prev => ({ ...prev, answers: newAnswers, step: nextStep }));
    }
  };

  // Logic for "Next" button (without changing answer)
  const handleNext = async () => {
    const nextStep = getNextStepIndex(state.step, state.answers);

    if (nextStep >= QUESTIONS.length) {
      // Logic if next leads to submission (though rare for "Next" button usually user has to pick last option)
      setDirection(1);
      setState(prev => ({ ...prev, isSubmitting: true }));
      const zone = calculateResult(state.answers);
      const code = zone === 'RED' ? generatePriorityCode('RED') : generatePriorityCode(zone);
      const resultObj = {
        zone: zone as any,
        code,
        timestamp: new Date().toISOString()
      };
      
      // CALL ASSESSMENT API when showing results
      console.log('Submitting assessment via API (Next button)...', { 
        qrNo: state.qrNo, 
        userId: state.userId, 
        risk_zone: zone,
        priority_code: code 
      });
      
      const success = await submitAssessment(
        state.answers, 
        resultObj, 
        state.unit, 
        state.language, 
        state.mode, 
        state.userInfo,
        state.userId,
        state.qrNo
      );

      if (success) {
        console.log('Assessment submitted successfully');
      } else {
        console.error('Assessment submission failed');
        alert('Failed to save assessment. Please try again.');
      }
      
      setState(prev => ({ ...prev, result: resultObj, isSubmitting: false }));
    } else {
      setDirection(1);
      setState(prev => ({ ...prev, step: nextStep }));
    }
  };

  const handleBack = () => {
    // Since Q1 is auto-filled (index 0), if we are at step 1 (Q2), going back should go to User Info form
    if (state.step === 1) {
      setDirection(-1);
      setState(prev => ({ ...prev, isUserInfoCollected: false }));
      return;
    }

    let prevStep = state.step - 1;
    while (prevStep >= 0) {
       const q = QUESTIONS[prevStep];
       if (q.dependsOn && q.requiredValues) {
         if (!q.requiredValues.includes(state.answers[q.dependsOn])) {
           prevStep--;
           continue;
         }
       }
       break;
    }
    setDirection(-1); // Slide Right (Back)
    setState(prev => ({ ...prev, step: Math.max(0, prevStep) }));
  };

  const handleRestart = (newMode: Mode) => {
    setState(prev => ({
      ...prev,
      mode: newMode,
      step: 0,
      answers: {},
      result: null,
      // We keep userInfo and isUserInfoCollected unless specific requirement to clear it.
      // Usually users restart for themselves or parents, so keep info?
      // Prompt says "When user goes more preciouses questions...", standard restart might need clear.
      // Let's reset UserInfo on restart to allow full new entry or mode switch.
      userInfo: null,
      userId: null,
      isUserInfoCollected: false,
      hasStarted: false // Go back to start screen to select language/mode properly? Or just reset steps.
    }));
  };

  // ROUTE 1: REPORT VIEW (If URL has ?r=...) - Allow without QR
  if (reportData) {
    return <ReportView dataString={reportData} />;
  }

  // Show loading while checking QR
  if (qrLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kauvery-primary mx-auto mb-4"></div>
          <p className="text-gray-700">Loading QR configuration...</p>
        </div>
      </div>
    );
  }

  // BLOCK ACCESS if QR error or no QR parameter (except report view)
  if (qrError || (!state.qrNo && !reportData)) {
    return (
      <div className="min-h-[100dvh] bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Access</h1>
          <p className="text-gray-700 mb-2">{qrError || 'QR parameter is required'}</p>
          <p className="text-sm text-gray-500 mb-4">Please scan a valid QR code to access this assessment.</p>
          {/* <p className="text-xs text-gray-400">URL format: <code className="bg-gray-100 px-2 py-1 rounded">?qr=KH05</code></p> */}
        </div>
      </div>
    );
  }

  // ROUTE 2: WELCOME SCREEN (If not started)
  if (!state.hasStarted) {
    return (
      <div className="min-h-[100dvh] bg-[#F8FAFC] flex flex-col items-center justify-center p-6 relative overflow-hidden safe-top safe-bottom">
        <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] bg-kauvery-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none" />
        <LanguageSelector 
          currentLang={state.language}
          onToggleLang={toggleLanguage}
          onStart={handleStart}
        />
      </div>
    );
  }

  // ROUTE 3: MAIN APP WIZARD
  const currentQ = QUESTIONS[state.step];

  return (
    <div className="min-h-[100dvh] font-sans text-gray-900 pb-safe safe-top relative bg-[#F8FAFC] overflow-hidden flex flex-col">
      
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-kauvery-primary/5 to-transparent blur-[80px]"></div>
      </div>

      {/* 
         STICKY HEADER 
         z-30 ensures it sits above content. 
         bg-white/90 + backdrop-blur-md creates a more solid "scroll under" effect.
      */}
      <header className={`sticky top-0 z-30 transition-all duration-300 ${state.result ? 'bg-transparent' : 'bg-white/90 backdrop-blur-md border-b border-gray-100/50 shadow-sm'}`}>
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-glow transform rotate-3 shrink-0 overflow-hidden p-2">
               <img 
                 src="/components/assets/Kauvery_Nalam_Logo.jpg" 
                 alt="Kauvery Nalam Logo" 
                 className="w-full h-full object-contain object-center scale-150"
                 style={{ imageRendering: 'high-quality' }}
               />
             </div>
             <div className="flex flex-col">
               <h1 className="text-xs font-extrabold text-gray-900 uppercase tracking-wide leading-none mb-1">
                 {TEXTS.headerTitle[state.language]}
               </h1>
               <div className="flex items-center gap-2">
                 <div className={`w-1.5 h-1.5 rounded-full ${state.mode === 'self' ? 'bg-blue-500 shadow-blue-500/50' : 'bg-purple-500 shadow-purple-500/50'} shadow-lg`}></div>
                 <div className="text-[9px] text-gray-500 font-bold tracking-wider uppercase">
                   {state.mode === 'self' ? TEXTS.selfMode[state.language] : TEXTS.parentMode[state.language]}
                 </div>
               </div>
             </div>
          </div>
          
          {/* Persistent Language Toggle in Header */}
          <button 
            onClick={() => toggleLanguage(state.language === 'en' ? 'ta' : 'en')}
            className="px-3 py-1.5 bg-white/50 rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-600 hover:bg-white transition-colors border border-gray-200 shadow-sm"
          >
            {state.language === 'en' ? 'தமிழ்' : 'ENG'}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-xl mx-auto px-6 pt-6 relative z-10 flex flex-col">
        <AnimatePresence mode="wait" custom={direction}>
          {state.isSubmitting ? (
             <LoadingScreen key="loader" />
          ) : state.result ? (
            <ResultScreen 
              key="result"
              result={state.result}
              answers={state.answers} 
              lang={state.language}
              mode={state.mode}
              qrNo={state.qrNo}
              onRestart={handleRestart}
            />
          ) : !state.isUserInfoCollected ? (
            // User Info Form Slide
            <UserInfoForm 
               key="user-form"
               lang={state.language}
               onSubmit={handleUserInfoSubmit}
            />
          ) : (
            <div key="wizard" className="relative h-full flex flex-col flex-1">
              <ProgressBar current={state.step} total={QUESTIONS.length} />
              
              <div className="relative flex-1 w-full">
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                  <QuestionCard 
                    key={state.step}
                    question={currentQ}
                    lang={state.language}
                    onAnswer={handleAnswer}
                    onBack={handleBack}
                    onNext={handleNext}
                    currentVal={state.answers[currentQ.id]}
                    isFirst={false} // Since we always have InfoForm before, technically never "First" screen
                    direction={direction}
                    currentQuestion={state.step + 1}
                    totalQuestions={QUESTIONS.length}
                  />
                </AnimatePresence>
              </div>

              <div className="text-center mt-auto py-6">
                <div className="inline-block px-4 py-1.5 rounded-full bg-gray-100/50 backdrop-blur-sm border border-gray-200/50">
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">
                    Kauvery Health Shield • {state.unit}
                  </p>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Daily Report Button - Floating Icon */}
      {/* <DailyReportButton language={state.language} /> */}
    </div>
  );
};

export default App;
