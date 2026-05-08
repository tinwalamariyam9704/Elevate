import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  X, 
  User, 
  Bot, 
  Sparkles,
  RefreshCcw,
  Minus
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { chatWithCareerCoach } from '../services/gemini';
import ReactMarkdown from 'react-markdown';
import { useUser } from '../context/UserContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { addDoc, collection, query, orderBy, limit, onSnapshot, serverTimestamp, doc, getDoc } from 'firebase/firestore';

export default function ChatBot() {
  const { user, profile } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !isOpen) return;

    // Fetch assessment context
    const fetchAssessment = async () => {
      const docRef = doc(db, 'users', user.uid, 'assessments', 'latest');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setAssessment(docSnap.data());
      }
    };
    fetchAssessment();

    // Fetch history from Firebase
    const messagesPath = `users/${user.uid}/chats/default/messages`;
    const messagesRef = collection(db, 'users', user.uid, 'chats', 'default', 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, messagesPath);
    });

    return () => unsubscribe();
  }, [user, isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user) return;

    const userMsg = input.trim();
    setInput('');
    setLoading(true);
    setError(null);

    const messagesPath = `users/${user.uid}/chats/default/messages`;
    try {
      // Save user message to Firebase
      const messagesRef = collection(db, 'users', user.uid, 'chats', 'default', 'messages');
      try {
        await addDoc(messagesRef, {
          role: 'user',
          content: userMsg,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, messagesPath);
      }

      // Get AI response
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));
      
      const aiResponse = await chatWithCareerCoach(
        [
          ...history,
          { role: 'user', parts: [{ text: userMsg }] }
        ],
        {
          profile: {
            userType: profile?.userType,
            interests: profile?.interests,
            skills: profile?.skills,
          },
          latestAssessment: assessment?.results
        }
      );

      // Save AI message
      try {
        await addDoc(messagesRef, {
          role: 'assistant',
          content: aiResponse,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, messagesPath);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.status === 429 ? "AI coaching is briefly over-capacity. Please wait." : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-[400px] h-[600px] bg-white rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border-4 border-slate-50"
          >
            {/* Header */}
            <div className="p-6 bg-brand-primary text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-accent flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-display font-black leading-none mb-1 uppercase tracking-tighter text-lg">Elevate Coach</h4>
                  <div className="flex items-center gap-1.5 text-brand-accent">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80">Strategic Lifecycle Advisor</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsMinimized(true)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <Minus className="w-4 h-4" />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <ScrollArea className="flex-1 p-6" ref={scrollRef}>
              <div className="space-y-6">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <div className="bg-slate-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <Bot className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-sm text-balance text-muted-foreground">Hello {profile?.displayName?.split(' ')[0]}! I'm your AI career coach. Ask me anything about your roadmap or industry trends.</p>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={m.id || i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${
                      m.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-brand-accent text-white'
                    }`}>
                      {m.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    </div>
                    <div className={`max-w-[80%] p-5 rounded-[2rem] text-sm leading-relaxed ${
                      m.role === 'user' 
                      ? 'bg-slate-900 text-white rounded-tr-sm' 
                      : 'bg-slate-50 text-slate-800 rounded-tl-sm border border-slate-100'
                    }`}>
                      <div className="markdown-body prose prose-sm max-w-none prose-slate">
                        <ReactMarkdown>
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-brand-accent text-white flex items-center justify-center animate-pulse">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="bg-slate-50 p-4 rounded-3xl rounded-tl-sm animate-pulse flex gap-1">
                      <div className="w-1 h-1 bg-slate-300 rounded-full animate-bounce" />
                      <div className="w-1 h-1 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1 h-1 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
                {error && (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-red-600 text-[10px] text-center font-bold flex items-center justify-center gap-2">
                    <RefreshCcw className="w-3 h-3" />
                    {error}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-6 border-t bg-white">
              <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about your next step..."
                  className="bg-transparent border-none focus-visible:ring-0 h-10 text-sm"
                />
                <Button 
                  size="icon" 
                  onClick={handleSend} 
                  disabled={loading || !input.trim()}
                  className="bg-brand-primary rounded-xl h-10 w-10 shrink-0"
                >
                  <Send className="w-4 h-4 text-white" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col items-end gap-4">
        {isMinimized && (
           <Button
            onClick={() => setIsMinimized(false)}
            className="rounded-2xl bg-white border border-slate-200 shadow-xl text-brand-primary px-6 h-14 font-bold flex gap-2"
           >
            <Bot className="w-5 h-5 text-brand-accent" />
            Resume Coaching
           </Button>
        )}
        
        {!isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="w-16 h-16 rounded-[2rem] bg-brand-primary shadow-2xl hover:shadow-brand-accent/20 transition-all group overflow-hidden"
            >
              <div className="absolute inset-0 bg-brand-accent opacity-0 group-hover:opacity-10 transition-opacity" />
              <MessageSquare className="w-8 h-8 text-white relative z-10" />
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
