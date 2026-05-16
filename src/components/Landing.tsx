import React from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { motion } from 'motion/react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ArrowRight, Sparkles, Target, Zap, Mail, Lock, User as UserIcon } from 'lucide-react';

export default function Landing() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [isRegistering, setIsRegistering] = React.useState(false);
  const [authError, setAuthError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);

    try {
      if (isRegistering) {
        // Registration
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;
        
        // Update Firebase Auth Profile
        await updateProfile(user, { displayName: name });

        // Create Firestore User Document
        const docRef = doc(db, 'users', user.uid);
        try {
          await setDoc(docRef, {
            userId: user.uid,
            email: user.email,
            displayName: name,
            onboardingCompleted: false,
            interests: [],
            skills: [],
            createdAt: new Date().toISOString()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
        }
      } else {
        // Login
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error('Auth error', error);
      setAuthError(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 hero-gradient overflow-hidden">
      <section className="container mx-auto px-4 pt-20 pb-32 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-accent/10 text-brand-accent text-xs font-semibold mb-6 border border-brand-accent/20">
              <Sparkles className="w-3 h-3" />
              <span>Premium Career Intelligence for Professionals</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-display font-black leading-[0.85] tracking-tighter mb-10 text-slate-900">
              Elevate Your <br />
              <span className="text-brand-accent italic">Trajectory.</span>
            </h1>
            
            <p className="text-xl text-slate-500 mb-12 max-w-2xl leading-relaxed font-light">
              Strategic career transformation for the global workforce. 
              Elite roadmaps, salary intelligence, and AI-resilience auditing for every professional landscape.
            </p>
            
            <div className="flex items-center gap-3 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Processing 42k+ Career Pivots
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass-card p-10 rounded-[3rem] border border-white/40 shadow-2xl relative z-10"
          >
            <h2 className="text-3xl font-display font-black mb-2 tracking-tight text-slate-900">
              {isRegistering ? 'Initialize Evolution' : 'Access Command Center'}
            </h2>
            <p className="text-slate-500 mb-8 font-medium">
              {isRegistering ? 'Create your strategic profile to begin.' : 'Enter your credentials to resume your trajectory.'}
            </p>

            <form onSubmit={handleAuth} className="space-y-4">
              {isRegistering && (
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent/30 transition-all outline-none"
                  />
                </div>
              )}
              
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent/30 transition-all outline-none"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent/30 transition-all outline-none"
                />
              </div>

              {authError && (
                <p className="text-destructive text-xs font-bold px-2">{authError}</p>
              )}

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-16 text-lg font-bold bg-brand-primary text-white rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-primary/20 group"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {isRegistering ? 'Register Now' : 'Sign In'} <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <button 
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-sm font-bold text-slate-500 hover:text-brand-accent transition-colors"
              >
                {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register"}
              </button>
            </div>
          </motion.div>
        </div>

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
