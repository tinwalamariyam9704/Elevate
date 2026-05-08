import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { getCareerSuggestions, getDetailedRoadmap } from '../services/gemini';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { 
  Briefcase, 
  ChevronRight, 
  Sparkles, 
  ShieldCheck, 
  Map, 
  TrendingUp, 
  IndianRupee,
  BrainCircuit,
  MessageSquare,
  Compass,
  GraduationCap,
  Clock,
  Search,
  ArrowRight
} from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import ChatBot from './ChatBot';

export default function Dashboard() {
  const { profile, user } = useUser();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSuggestion, setActiveSuggestion] = useState<any>(null);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedMilestones, setCompletedMilestones] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("roadmap");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeSuggestion && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeSuggestion]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!user) return;
      setError(null);
      
      const assessmentPath = `users/${user.uid}/assessments/latest`;
      try {
        let assessmentSnap;
        try {
          assessmentSnap = await getDoc(doc(db, 'users', user.uid, 'assessments', 'latest'));
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, assessmentPath);
        }

        if (assessmentSnap?.exists()) {
          const data = assessmentSnap.data();
          const results = data.results || [];
          
          // Force refresh if old cache is missing salary/demand info
          const isIncomplete = results.length > 0 && (!results[0].averageSalary || !results[0].marketDemand);
          
          if (!isIncomplete) {
            setSuggestions(results);
            setLoading(false);
            return;
          }
        }

        // Generate new suggestions
        const results = await getCareerSuggestions(profile?.interests || {}); // Pass context
        setSuggestions(results);
          try {
          await setDoc(doc(db, 'users', user.uid, 'assessments', 'latest'), {
            userId: user.uid,
            results,
            createdAt: new Date().toISOString()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, assessmentPath);
        }
        setLoading(false);
      } catch (err: any) {
        console.error(err);
        setError(err.status === 429 ? "Daily AI quota exceeded. Please try again in an hour." : "Unable to generate paths. Please try again.");
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [user, profile]);

  const handleCustomSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;

    setIsSearching(true);
    setError(null);
    try {
      const response = await getCareerSuggestions({ manualQuery: searchQuery, profile });
      const customCareer = response[0] || { 
        name: searchQuery, 
        description: `Strategic analysis for ${searchQuery}`,
        futureProofScore: 85,
        aiImpactAnalysis: "Standard impact",
        averageSalary: "₹10L - ₹20L LPA",
        marketDemand: "High"
      };
      
      setSuggestions(prev => [customCareer, ...prev.filter(s => s.name !== customCareer.name)]);
      await fetchRoadmap(customCareer);
      setSearchQuery("");
    } catch (err) {
      console.error(err);
      setError("Failed to analyze this custom path. Try a more common job title.");
    } finally {
      setIsSearching(false);
    }
  };

  const fetchRoadmap = async (career: any, forceRefresh = false) => {
    setActiveSuggestion(career);
    setLoadingRoadmap(true);
    setRoadmap(null);
    setError(null);
    
    // Generate a simple ID for the career
    const careerId = career.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    try {
      // 1. Check if cached roadmap exists (if not forcing refresh)
      if (!forceRefresh) {
        const roadmapSnap = await getDoc(doc(db, 'users', user.uid, 'roadmaps', careerId));
        
        if (roadmapSnap.exists()) {
          const data = roadmapSnap.data();
          // Check if it's an old cache missing newer sections
          if (data.projectIdeas && data.projectIdeas.length > 0) {
            setRoadmap(data);
            setCompletedMilestones(data.completedMilestones || []);
            setLoadingRoadmap(false);
            return;
          }
          // If missing sections, we proceed to regenerate automatically or could prompt
        }
      }

      // 2. generate new one
      const result = await getDetailedRoadmap(career.name, profile);
      setRoadmap(result);
      setCompletedMilestones([]);

      // 3. Cache the result
      try {
        await setDoc(doc(db, 'users', user.uid, 'roadmaps', careerId), {
          ...result,
          careerName: career.name,
          completedMilestones: [],
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Failed to cache roadmap:", err);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.status === 429 ? "AI Quota reached. Try again shortly." : "Failed to load roadmap.");
    } finally {
      setLoadingRoadmap(false);
    }
  };

  const toggleMilestone = async (index: number) => {
    if (!user || !activeSuggestion) return;
    
    const newCompleted = completedMilestones.includes(index)
      ? completedMilestones.filter(i => i !== index)
      : [...completedMilestones, index];
    
    setCompletedMilestones(newCompleted);
    
    const careerId = activeSuggestion.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    try {
      await updateDoc(doc(db, 'users', user.uid, 'roadmaps', careerId), {
        completedMilestones: newCompleted,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to update progress:", err);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 pt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-3xl" />)}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 relative flex-1 flex flex-col">
      <div className="mb-16 flex flex-col md:flex-row justify-between items-end gap-10">
        <div>
          <div className="flex items-center gap-2 mb-3">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">System Live // Market Intelligence Activated</span>
          </div>
          <h1 className="text-5xl font-display font-black tracking-tighter mb-2 text-slate-900">Command Center</h1>
          <p className="text-slate-500 font-medium text-lg">Logged as <span className="text-brand-accent font-bold">{profile?.displayName || 'Strategic Asset'}</span></p>
        </div>
        
        <div className="flex flex-col items-end gap-4 w-full md:w-auto">
          <form onSubmit={handleCustomSearch} className="relative w-full md:w-[400px] group">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isSearching ? 'text-brand-accent animate-pulse' : 'text-slate-300 group-focus-within:text-brand-accent'}`} />
            <input 
              type="text"
              placeholder={isSearching ? "Synthesizing Market Data..." : "Explore a custom industry trajectory..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-[1.5rem] text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent/30 transition-all placeholder:text-slate-300 placeholder:font-medium"
              disabled={isSearching}
            />
          </form>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.href = '/assessment'}
              className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 h-10 px-6 font-bold text-[10px] uppercase tracking-widest transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 mr-2 text-brand-accent" />
              Recalibrate AI Profile
            </Button>
            <div className="px-4 h-10 rounded-xl bg-slate-900 text-white flex items-center gap-2 shadow-lg shadow-slate-900/20">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-accent" />
                <span className="text-[9px] font-black uppercase tracking-widest">{profile?.userType || 'Professional'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1">
        {/* Sidebar: All Suggestions */}
        <div className="lg:col-span-4 space-y-4 h-full relative">
          <div className="sticky top-24 pt-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-accent animate-pulse" />
                <h2 className="text-xl font-bold font-display tracking-tight text-slate-900">Career Trajectories</h2>
              </div>
              <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold border-none">
                {suggestions.length} Total
              </Badge>
            </div>
            
            <AnimatePresence mode="popLayout">
              {error && !activeSuggestion && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="p-6 rounded-3xl border-2 border-red-100 bg-red-50 text-red-600 text-sm font-medium mb-4"
                >
                  {error}
                </motion.div>
              )}

              <motion.div 
                layout
                className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar"
              >
                {suggestions.map((career, idx) => (
                  <motion.div
                    key={career.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => fetchRoadmap(career)}
                    className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 relative overflow-hidden group ${
                      activeSuggestion?.name === career.name 
                      ? 'border-brand-accent bg-white shadow-xl shadow-brand-accent/10' 
                      : 'border-slate-100 bg-white hover:border-brand-accent/30 shadow-sm'
                    }`}
                  >
                    {activeSuggestion?.name === career.name && (
                      <motion.div 
                        layoutId="active-indicator"
                        className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand-accent"
                      />
                    )}
                    <div className="flex justify-between items-start mb-6">
                      <div className={`p-4 rounded-xl transition-all duration-500 ${activeSuggestion?.name === career.name ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                        <Briefcase className="w-6 h-6" />
                      </div>
                      <Badge className={`border-none px-3 py-1 font-black uppercase text-[8px] tracking-widest rounded-lg ${
                        career.futureProofScore > 85 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {career.futureProofScore}% Synergy
                      </Badge>
                    </div>
                    <h3 className="font-display font-black text-xl leading-[1.1] mb-3 group-hover:text-brand-accent transition-colors tracking-tight uppercase">{career.name}</h3>
                    
                    <div className="flex items-center gap-4 mt-6 pt-6 border-t border-slate-50">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Demand</span>
                        <div className="flex items-center gap-1.5">
                           <TrendingUp className="w-3 h-3 text-emerald-500" />
                           <span className="text-[10px] font-bold text-slate-600">{career.marketDemand || 'Elite'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Cap</span>
                        <div className="flex items-center gap-1.5">
                           <IndianRupee className="w-3 h-3 text-brand-accent" />
                           <span className="text-[10px] font-bold text-slate-600">{career.averageSalary?.split('-')[0] || '₹12L+'}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Main: Details & Roadmap */}
        <div ref={scrollRef} className="lg:col-span-8 h-full">
          {activeSuggestion ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={activeSuggestion.name}
              className="glass-card rounded-[2.5rem] p-8 md:p-12 min-h-full"
            >
              <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12 relative">
                <div className="flex-1">
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 mb-4"
                  >
                    <div className="px-3 py-1 bg-brand-accent/10 rounded-full text-[10px] font-bold text-brand-accent uppercase tracking-widest flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                      Dynamic Strategy
                    </div>
                  </motion.div>
                  
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <h2 className="text-5xl font-display font-black leading-[1.05] tracking-tight text-slate-900">{activeSuggestion.name}</h2>
                    <div className="flex gap-2">
                       <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-[10px] font-bold uppercase tracking-widest border-slate-200 text-slate-500 h-10 rounded-2xl px-6 hover:bg-slate-50"
                      >
                        Share Strategy
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => fetchRoadmap(activeSuggestion, true)}
                        className="text-[10px] font-bold uppercase tracking-widest bg-brand-accent text-white hover:bg-brand-accent/90 border-none h-10 rounded-2xl px-6"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-2" />
                        Regenerate
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-xl text-slate-500 leading-relaxed font-light max-w-2xl">
                    {activeSuggestion.description}
                  </p>

                  <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: { transition: { staggerChildren: 0.1 } }
                    }}
                    className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4"
                  >
                    {[
                      { label: 'Demand', val: activeSuggestion.marketDemand || 'High', icon: TrendingUp, color: 'emerald' },
                      { label: 'Avg Salary', val: activeSuggestion.averageSalary || '₹12L+', icon: IndianRupee, color: 'blue' },
                      { label: 'Balance', val: activeSuggestion.workLifeBalance || 'Stable', icon: Clock, color: 'amber' },
                      { label: 'Growth', val: activeSuggestion.growthPotential || 'High', icon: Sparkles, color: 'purple' }
                    ].map((item, i) => (
                      <motion.div 
                        key={i}
                        variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                        className={`p-4 rounded-3xl bg-${item.color}-500/[0.03] border border-${item.color}-500/10 flex flex-col items-center text-center`}
                      >
                        <div className={`p-2 bg-white rounded-xl shadow-sm mb-3 text-${item.color}-600`}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.label}</div>
                        <div className={`text-sm font-bold text-slate-900 line-clamp-1`}>{item.val}</div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
                
                <div className="w-full md:w-auto p-8 bg-slate-9 engagement-card rounded-[2.5rem] border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-brand-accent/5 opacity-50" />
                  <div className="relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-widest mb-4 text-slate-400 text-center">AI Resilience</div>
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90">
                        <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />
                        <motion.circle 
                          initial={{ strokeDashoffset: 301 }}
                          animate={{ strokeDashoffset: 301 - (301 * activeSuggestion.futureProofScore) / 100 }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          cx="56" cy="56" r="48" 
                          stroke="currentColor" strokeWidth="10" 
                          fill="transparent" 
                          className="text-brand-accent"
                          strokeDasharray={301}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-3xl font-display font-black text-brand-accent">{activeSuggestion.futureProofScore}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-12 p-1 bg-slate-100/50 rounded-[2rem] w-fit">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="bg-transparent h-12 gap-1 p-0">
                    {[
                      { id: 'roadmap', label: 'Roadmap', icon: Map },
                      { id: 'projects', label: 'Projects', icon: Compass },
                      { id: 'certifications', label: 'Certification', icon: GraduationCap },
                      { id: 'ai-impact', label: 'AI Risk', icon: BrainCircuit }
                    ].map(tab => (
                      <TabsTrigger 
                        key={tab.id}
                        value={tab.id} 
                        className="rounded-[1.5rem] px-8 h-10 data-[state=active]:bg-white data-[state=active]:shadow-xl data-[state=active]:shadow-brand-accent/5 font-bold text-xs uppercase tracking-widest transition-all"
                      >
                        <tab.icon className="w-3.5 h-3.5 mr-2" />
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Tabs value={activeTab} className="w-full">
                    <TabsContent value="roadmap" className="mt-0 outline-none">
                  {loadingRoadmap ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl w-full" />)}
                    </div>
                  ) : roadmap ? (
                    <div>
                      {roadmap.milestones && (
                        <div className="mb-10 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                           <div className="flex justify-between items-end mb-4">
                             <div>
                               <h4 className="font-bold text-sm text-slate-500 uppercase tracking-widest">Readiness Level</h4>
                               <div className="text-3xl font-display font-extrabold">{Math.round((completedMilestones.length / roadmap.milestones.length) * 100)}%</div>
                             </div>
                             <div className="text-xs font-bold text-brand-accent">{completedMilestones.length} of {roadmap.milestones.length} Completed</div>
                           </div>
                           <Progress value={(completedMilestones.length / roadmap.milestones.length) * 100} className="h-2 bg-slate-200" />
                        </div>
                      )}
                      <div className="space-y-6 relative ml-4 pl-8 border-l-2 border-slate-100">
                        {roadmap.milestones.map((step: any, i: number) => (
                          <div key={i} className="relative group">
                            <button 
                              onClick={() => toggleMilestone(i)}
                              className={`absolute -left-[54px] top-0 w-12 h-12 rounded-full border-4 flex items-center justify-center transition-all ${
                                completedMilestones.includes(i) 
                                ? 'bg-brand-accent border-brand-accent text-white' 
                                : 'bg-white border-slate-100 hover:border-brand-accent text-slate-300'
                              } shadow-sm`}
                            >
                              {completedMilestones.includes(i) ? <ShieldCheck className="w-5 h-5" /> : <span className="font-bold text-sm">{i + 1}</span>}
                            </button>
                            <div className={`mb-10 transition-opacity ${completedMilestones.includes(i) ? 'opacity-50' : 'opacity-100'}`}>
                              <h4 className="text-xl font-bold mb-2 flex items-center gap-2">
                                {step.title}
                                {completedMilestones.includes(i) && <Badge variant="outline" className="bg-green-50 text-green-600 border-none font-bold text-[8px] h-4">Completed</Badge>}
                              </h4>
                              <p className="text-muted-foreground mb-4 leading-relaxed">{step.description}</p>
                              <div className="flex flex-wrap gap-2">
                                {step.skillsToAcquire.map((skill: string) => (
                                  <Badge key={skill} variant="secondary" className="bg-slate-100 text-slate-600 border-none font-medium text-[10px] py-0.5 uppercase tracking-wider">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                              <div className="mt-4 flex items-center gap-4">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md">Time: {step.duration}</div>
                                {!completedMilestones.includes(i) && (
                                  <button 
                                    onClick={() => toggleMilestone(i)}
                                    className="text-[10px] font-bold text-brand-accent uppercase tracking-widest hover:underline"
                                  >
                                    Mark as Complete
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Select a path to generate your roadmap.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="projects" className="mt-0 outline-none">
                  <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  >
                    {roadmap?.projectIdeas?.map((project: any, i: number) => (
                      <motion.div 
                        key={i}
                        variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
                        className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 flex flex-col h-full hover:border-brand-accent/20 transition-all hover:shadow-xl hover:shadow-brand-accent/5 group"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:bg-brand-accent group-hover:text-white transition-colors duration-500">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <Badge className="bg-brand-accent/10 text-brand-accent border-none px-3 font-bold uppercase text-[9px] tracking-widest rounded-lg">
                            {project.difficulty}
                          </Badge>
                        </div>
                        <h4 className="text-2xl font-display font-bold mb-3">{project.title}</h4>
                        <p className="text-sm text-slate-500 leading-relaxed mb-6">{project.description}</p>
                        
                        <div className="mt-auto">
                          <div className="mb-6 p-5 bg-white/50 rounded-2xl border border-white/50 text-xs text-slate-600">
                            <span className="font-bold text-brand-accent uppercase block mb-1 text-[9px] tracking-widest">Key Outcome</span>
                            <span className="font-medium">{project.outcome}</span>
                          </div>
                          <Button className="w-full py-6 rounded-2xl font-bold text-xs uppercase tracking-widest bg-brand-accent hover:bg-brand-accent/90 transition-all">
                            Generate Full Brief
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                    {!roadmap?.projectIdeas && (
                      <div className="col-span-2 py-20 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                        <div className="p-4 bg-white rounded-full w-fit mx-auto mb-4 shadow-sm">
                          <Compass className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-medium">Select a path to generate high-impact project ideas.</p>
                      </div>
                    )}
                  </motion.div>
                </TabsContent>

                <TabsContent value="certifications" className="mt-0 outline-none">
                  <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
                    className="grid grid-cols-1 gap-4"
                  >
                    {roadmap?.certifications?.map((cert: any, i: number) => (
                      <motion.div 
                        key={i}
                        variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
                        className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 hover:border-brand-accent/20 transition-all group"
                      >
                        <div className="flex items-center gap-6">
                          <div className="p-4 bg-brand-accent/5 rounded-2xl group-hover:bg-brand-accent group-hover:text-white transition-colors duration-500">
                            <GraduationCap className="w-7 h-7" />
                          </div>
                          <div>
                            <h4 className="font-display font-bold text-xl mb-1">{cert.name}</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-brand-accent uppercase tracking-widest">{cert.provider}</span>
                              <div className="w-1 h-1 rounded-full bg-slate-200" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Value: {cert.value}</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="secondary" className="rounded-xl h-10 px-6 font-bold text-[10px] uppercase tracking-widest bg-slate-50 hover:bg-brand-accent hover:text-white transition-all">
                          View Details
                        </Button>
                      </motion.div>
                    ))}
                    {!roadmap?.certifications && (
                      <div className="py-20 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                        <div className="p-4 bg-white rounded-full w-fit mx-auto mb-4 shadow-sm">
                          <GraduationCap className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-medium">Verify your skills with industry-standard certifications.</p>
                      </div>
                    )}
                  </motion.div>
                </TabsContent>

                <TabsContent value="ai-impact" className="mt-0">
                  <div className="bg-slate-50 rounded-3xl p-8 border border-brand-accent/10">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-brand-accent/10 rounded-2xl">
                        <TrendingUp className="w-6 h-6 text-brand-accent" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold mb-4 italic">Strategic Analysis</h4>
                        <div className="prose prose-slate leading-relaxed text-slate-600">
                          {activeSuggestion.aiImpactAnalysis}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      ) : (
            <div className="h-full flex flex-col items-center justify-center glass-card rounded-[2.5rem] border-dashed border-2 border-slate-200">
              <div className="bg-slate-100 p-6 rounded-full mb-6">
                <Compass className="w-12 h-12 text-slate-300" />
              </div>
              <h3 className="text-2xl font-bold opacity-30">Select a path to begin analysis</h3>
            </div>
          )}
        </div>
      </div>

      {/* Floating Chat */}
      <ChatBot />
    </div>
  );
}
