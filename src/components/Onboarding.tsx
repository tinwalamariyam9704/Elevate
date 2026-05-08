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
    question: "Establish your professional identity.",
    options: [
      { value: 'student', label: 'Emerging Talent', desc: 'Synthesizing global knowledge for first-tier entry' },
      { value: 'professional', label: 'Industry Veteran', desc: 'Refining trajectory for elite growth and AI resilience' },
      { value: 'job-seeker', label: 'Strategic Pivot', desc: 'Executing a transition into high-yield industries' }
    ]
  },
  {
    id: 'primary_domain',
    question: "Identify your primary ecosystem.",
    options: [
      { value: 'technology', label: 'Deep Tech & Infrastructure', desc: 'Digital architecture and planetary-scale systems' },
      { value: 'creative', label: 'Creative Leadership', desc: 'Visual narratives and high-value design strategy' },
      { value: 'business', label: 'Operations & Global Finance', desc: 'Management, venture capital, and market scaling' },
      { value: 'humanities', label: 'Human Lifecycle & Ethics', desc: 'Medicine, psychology, and social evolution' }
    ]
  },
  {
    id: 'interest_impact',
    question: "What is your preferred mode of problem solving?",
    options: [
      { value: 'creation', label: 'Generative Construction', desc: 'Building something new where nothing existed' },
      { value: 'optimization', label: 'Systems Optimization', desc: 'Making existing things faster and better' },
      { value: 'empathy', label: 'Empathetic Connection', desc: 'Solving problems through human understanding' }
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
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0B0F1A] text-white relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-accent blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-accent blur-[120px]" />
      </div>

      <div className="w-full max-w-4xl relative z-10">
        <div className="mb-16 text-center">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-white/10">
            <Target className="w-3.5 h-3.5 text-brand-accent" />
            <span>Strategic Calibration // Stage {step + 1}</span>
          </div>
          <div className="w-full h-1 bg-white/10 rounded-full mb-4 overflow-hidden">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${progress}%` }}
               className="h-full bg-brand-accent shadow-[0_0_15px_rgba(99,102,241,0.5)]"
             />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!computing ? (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <h2 className="text-5xl md:text-6xl font-display font-black mb-12 text-center tracking-tighter leading-tight">{currentQuestion.question}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentQuestion.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={`flex flex-col gap-6 p-10 text-left rounded-[2.5rem] border-2 transition-all duration-500 group relative overflow-hidden ${
                      answers[currentQuestion.id] === opt.value 
                      ? 'border-brand-accent bg-brand-accent/10 shadow-2xl shadow-brand-accent/20' 
                      : 'border-white/5 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-500 ${
                      answers[currentQuestion.id] === opt.value 
                      ? 'border-brand-accent bg-brand-accent text-white scale-110' 
                      : 'border-white/20'
                    }`}>
                      {answers[currentQuestion.id] === opt.value ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-brand-accent transition-colors" />}
                    </div>
                    <div>
                      <p className="font-display font-black text-xl mb-3 tracking-tight group-hover:text-brand-accent transition-colors">{opt.label}</p>
                      <p className="text-sm text-white/40 leading-relaxed font-medium">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-24 h-24 border-4 border-white/5 border-t-brand-accent rounded-full animate-spin mb-10 shadow-[0_0_50px_rgba(99,102,241,0.2)]" />
              <h2 className="text-4xl font-display font-black mb-4 tracking-tighter">Calculating Trajectories...</h2>
              <p className="text-white/40 font-medium max-w-sm">Synthesizing market data and global talent pools to define your unique professional pivot.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {!computing && (
          <div className="mt-20 flex justify-between items-center border-t border-white/5 pt-10">
            <Button 
              variant="ghost" 
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="rounded-xl text-white/40 hover:text-white hover:bg-white/5 font-bold uppercase tracking-widest text-[10px] h-12 px-8"
            >
              <ArrowLeft className="mr-3 w-4 h-4" /> Previous Phase
            </Button>

            {step === QUESTIONS.length - 1 && answers[currentQuestion.id] && (
              <Button 
                onClick={handleFinish} 
                className="bg-brand-accent hover:bg-brand-accent/90 h-14 px-12 rounded-2xl shadow-2xl shadow-brand-accent/20 transition-all font-black uppercase tracking-widest text-xs group"
              >
                Assemble Future <ArrowRight className="ml-3 w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
