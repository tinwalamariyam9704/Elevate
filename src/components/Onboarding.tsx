import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useUser } from '../context/UserContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Progress } from './ui/progress';

const QUESTIONS = [
  {
    id: 'type',
    question: "Tell us about yourself.",
    options: [
      { value: 'student', label: 'Student', desc: 'Starting your career and looking for the right path' },
      { value: 'professional', label: 'Working Professional', desc: 'Looking to grow, switch, or advance in your field' },
      { value: 'job-seeker', label: 'Job Seeker', desc: 'Actively searching for a new job or role' }
    ]
  },
  {
    id: 'primary_domain',
    question: "Which field interests you most?",
    options: [
      { value: 'technology', label: 'Technology', desc: 'Software, IT, engineering, and digital systems' },
      { value: 'creative', label: 'Creative', desc: 'Design, arts, writing, and media' },
      { value: 'business', label: 'Business', desc: 'Management, finance, sales, and marketing' },
      { value: 'humanities', label: 'Healthcare & Society', desc: 'Medicine, teaching, and social work' }
    ]
  },
  {
    id: 'interest_impact',
    question: "How do you prefer to solve problems?",
    options: [
      { value: 'creation', label: 'Building things', desc: 'Creating new products, apps, or services' },
      { value: 'optimization', label: 'Improving things', desc: 'Making existing systems better and more efficient' },
      { value: 'empathy', label: 'Helping others', desc: 'Solving problems through understanding and care' }
    ]
  },
  {
    id: 'skill_set',
    question: "Which 'Superpower' do you leverage most?",
    options: [
      { value: 'analytical', label: 'Logical Analysis', desc: 'Deciphering complex data patterns' },
      { value: 'communicative', label: 'Persuasive Storytelling', desc: 'Moving people with words and vision' },
      { value: 'technical', label: 'Technical Execution', desc: 'Mastering tools and specialized crafts' },
      { value: 'strategic', label: 'Strategic Planning', desc: 'Seeing the 10,000ft view of a project' }
    ]
  },
  {
    id: 'ai_fear',
    question: "How do you perceive the AI transition?",
    options: [
      { value: 'collaborator', label: 'Integral Partner', desc: 'I want to be an AI-augmented professional' },
      { value: 'traditionalist', label: 'Defensive Moat', desc: 'I prefer roles that require high human touch' },
      { value: 'pioneer', label: 'Systems Builder', desc: 'I want to build or manage the AI itself' }
    ]
  },
  {
    id: 'work_environment',
    question: "Which environment fuels your productivity?",
    options: [
      { value: 'deep-focus', label: 'Deep Focus Autonomy', desc: 'Quiet, independent project blocks' },
      { value: 'dynamic-team', label: 'High-Energy Collaboration', desc: 'Fast-paced team syncs and brainstorming' },
      { value: 'balanced', label: 'Hybrid Flexibility', desc: 'A measured blend of both worlds' }
    ]
  },
  {
    id: 'motivation',
    question: "What is your primary driver for work?",
    options: [
      { value: 'expertise', label: 'Craft Mastery', desc: 'Being the absolute best at what I do' },
      { value: 'impact', label: 'Global Change', desc: 'Solving problems that affect millions' },
      { value: 'freedom', label: 'Financial Freedom', desc: 'Efficiency and rewards to fund my life' },
      { value: 'stability', label: 'Security & Legacy', desc: 'Building a reliable, long-term foundation' }
    ]
  },
  {
    id: 'risk_tolerance',
    question: "What is your professional risk appetite?",
    options: [
      { value: 'safe', label: 'Calculated Stability', desc: 'Established firms with clear ladders' },
      { value: 'moderate', label: 'Scale-up Growth', desc: 'Growth-stage ventures with some risk' },
      { value: 'high', label: 'Disruptive Startup', desc: 'High risk, high potential, fast iteration' }
    ]
  },
  {
    id: 'learning_style',
    question: "How do you acquire new expertise?",
    options: [
      { value: 'structured', label: 'Academic Rigor', desc: 'Certifications and formal curriculums' },
      { value: 'practical', label: 'Trial and Error', desc: 'Building projects and learning on the fly' },
      { value: 'mentorship', label: 'Social Learning', desc: 'Observing experts and peer collaboration' }
    ]
  },
  {
    id: 'future_outlook',
    question: "Where do you see the most opportunity?",
    options: [
      { value: 'automation', label: 'Efficiency Tech', desc: 'Tools that replace manual labor' },
      { value: 'human-centric', label: 'The Human Edge', desc: 'Arts, therapy, and ethics-based fields' },
      { value: 'sustainability', label: 'Regenerative Systems', desc: 'Climate, energy, and circular economics' }
    ]
  }
];

export default function Onboarding() {
  const { user, refreshProfile } = useUser();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [computing, setComputing] = useState(false);

  const currentQuestion = QUESTIONS[step];
  const progress = ((step + 1) / QUESTIONS.length) * 100;

  const handleSelect = (val: string) => {
    setAnswers({ ...answers, [currentQuestion.id]: val });
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    setComputing(true);
    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        onboardingCompleted: true,
        userType: answers.type,
        assessmentAnswers: answers,
        updatedAt: new Date().toISOString()
      });
      await refreshProfile();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    } finally {
      setComputing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
      {/* Soft background accents */}
      <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-brand-accent/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-accent/5 blur-[120px]" />
      </div>

      <div className="w-full max-w-5xl relative z-10">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white text-slate-500 text-[11px] font-bold uppercase tracking-widest mb-8 shadow-sm border border-slate-100">
            <Target className="w-4 h-4 text-brand-accent" />
            <span>Step {step + 1} of {QUESTIONS.length}: Profile Setup</span>
          </div>
          
          <div className="max-w-md mx-auto mb-16">
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${progress}%` }}
                 className="h-full bg-brand-accent shadow-[0_0_10px_rgba(99,102,241,0.3)]"
               />
            </div>
            <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
              {step === 0 ? "Tell us who you are" : step === 1 ? "What field are you in?" : "How do you work?"}
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!computing ? (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2 className="text-4xl md:text-5xl font-display font-black mb-12 text-center tracking-tight text-slate-900 balance">
                {currentQuestion.question}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentQuestion.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={`flex flex-col gap-8 p-10 text-left rounded-[2rem] border-2 transition-all duration-500 group relative ${
                      answers[currentQuestion.id] === opt.value 
                      ? 'border-brand-accent bg-white shadow-2xl shadow-brand-accent/10 ring-4 ring-brand-accent/5' 
                      : 'border-white bg-white/60 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 border-slate-100/50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center shrink-0 transition-all duration-500 ${
                      answers[currentQuestion.id] === opt.value 
                      ? 'border-brand-accent bg-brand-accent text-white rotate-6' 
                      : 'border-slate-100 bg-slate-50 text-slate-300 group-hover:border-brand-accent/30 group-hover:text-brand-accent'
                    }`}>
                      {answers[currentQuestion.id] === opt.value ? <CheckCircle2 className="w-6 h-6" /> : <div className="w-2 h-2 rounded-full bg-current" />}
                    </div>
                    <div>
                      <p className="font-display font-bold text-2xl mb-3 tracking-tight text-slate-900">{opt.label}</p>
                      <p className="text-sm text-slate-500 leading-relaxed font-medium">{opt.desc}</p>
                    </div>
                    {answers[currentQuestion.id] === opt.value && (
                      <motion.div 
                        layoutId="active-check"
                        className="absolute top-6 right-6"
                      >
                         <div className="w-2 h-2 rounded-full bg-brand-accent animate-ping" />
                      </motion.div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="relative w-32 h-32 mb-12">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
                <div className="absolute inset-0 border-4 border-brand-accent rounded-full border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-brand-accent animate-pulse" />
                </div>
              </div>
              <h2 className="text-4xl font-display font-black mb-4 tracking-tight text-slate-900">Creating Your Career Guide</h2>
              <p className="text-slate-500 font-medium max-w-sm leading-relaxed">
                We are finding the best career paths for you based on your background and interests.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {!computing && (
          <div className="mt-20 flex justify-between items-center border-t border-slate-200 pt-10">
            <Button 
              variant="ghost" 
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 font-bold uppercase tracking-widest text-[10px] h-12 px-8"
            >
              <ArrowLeft className="mr-3 w-4 h-4" /> Previous
            </Button>

            {step === QUESTIONS.length - 1 && answers[currentQuestion.id] && (
              <Button 
                onClick={handleFinish} 
                className="bg-slate-900 hover:bg-brand-accent h-16 px-12 rounded-2xl shadow-xl shadow-slate-900/10 transition-all font-black uppercase tracking-widest text-xs group text-white"
              >
                Show My Career Paths <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Target(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}
