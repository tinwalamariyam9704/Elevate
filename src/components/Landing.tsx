import React from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { motion } from 'motion/react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ArrowRight, Sparkles, Target, Zap } from 'lucide-react';

export default function Landing() {
  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const docRef = doc(db, 'users', user.uid);
      
      let docSnap;
      try {
        docSnap = await getDoc(docRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      }

      if (!docSnap?.exists()) {
        try {
          await setDoc(docRef, {
            userId: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            onboardingCompleted: false,
            interests: [],
            skills: [],
            createdAt: new Date().toISOString()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
        }
      }
    } catch (error) {
      console.error('Sign in error', error);
    }
  };

  return (
    <div className="flex-1 hero-gradient overflow-hidden">
      <section className="container mx-auto px-4 pt-20 pb-32 relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-accent/10 text-brand-accent text-xs font-semibold mb-6 border border-brand-accent/20">
            <Sparkles className="w-3 h-3" />
            <span>Premium Career Intelligence for Professionals</span>
          </div>
          
          <h1 className="text-7xl md:text-9xl font-display font-black leading-[0.85] tracking-tighter mb-10 text-slate-900">
            Elevate Your <br />
            <span className="text-brand-accent italic">Trajectory.</span>
          </h1>
          
          <p className="text-2xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
            Strategic career transformation for the global workforce. 
            Elite roadmaps, salary intelligence, and AI-resilience auditing for every professional landscape.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Button size="lg" onClick={handleSignIn} className="h-16 px-12 text-lg font-bold bg-brand-primary text-white rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-brand-primary/20 group">
              Start Your Evolution <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <div className="flex items-center gap-3 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Processing 42k+ Career Pivots
            </div>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <div className="mt-40 grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            {
              title: "AI Resilience Audit",
              desc: "Predict and protect your career against industrial-scale AI automation.",
              icon: Zap,
              color: "text-indigo-600",
              badge: "Market-Live"
            },
            {
              title: "Strategic Trajectories",
              desc: "Deep-hive insights for High-Finance, Medicine, Law, and Skilled Trades.",
              icon: Target,
              color: "text-indigo-600",
              badge: "Pro Edition"
            },
            {
              title: "Lifecycle Roadmaps",
              desc: "Dynamic, real-time guidance that adapts as global markets shift.",
              icon: Sparkles,
              color: "text-indigo-600",
              badge: "Universal"
            }
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-10 rounded-[3rem] bg-white border border-slate-100 hover:border-brand-accent/30 transition-all duration-500 hover:shadow-2xl hover:shadow-brand-accent/5"
            >
              <div className="flex justify-between items-start mb-10">
                <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-brand-accent group-hover:text-white transition-colors duration-500">
                  <feature.icon className="w-6 h-6" />
                </div>
                <Badge variant="secondary" className="bg-slate-50 text-slate-400 font-bold text-[9px] uppercase tracking-widest border-none">
                  {feature.badge}
                </Badge>
              </div>
              <h3 className="text-2xl font-display font-bold mb-4 tracking-tight group-hover:text-brand-accent transition-colors">{feature.title}</h3>
              <p className="text-slate-500 leading-relaxed font-medium">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-32 border-y border-slate-100 bg-slate-50/30">
        <div className="container mx-auto px-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-12">Intelligence Trusted by Professionals from</p>
          <div className="flex flex-wrap justify-center gap-x-16 gap-y-8 opacity-30 grayscale contrast-200">
            {['Goldman Sachs', 'McKinsey', 'Apple', 'NVIDIA', 'Mayo Clinic'].map((brand) => (
               <span key={brand} className="text-2xl font-display font-black tracking-tighter">{brand.toUpperCase()}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="bg-brand-primary py-20 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-display font-bold mb-2">98%</div>
              <div className="text-xs uppercase tracking-widest opacity-50">Accuracy Score</div>
            </div>
            <div>
              <div className="text-4xl font-display font-bold mb-2">12k+</div>
              <div className="text-xs uppercase tracking-widest opacity-50">Paths Analyzed</div>
            </div>
            <div>
              <div className="text-4xl font-display font-bold mb-2">50+</div>
              <div className="text-xs uppercase tracking-widest opacity-50">AI Experts</div>
            </div>
            <div>
              <div className="text-4xl font-display font-bold mb-2">Instant</div>
              <div className="text-xs uppercase tracking-widest opacity-50">AI Feedback</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
