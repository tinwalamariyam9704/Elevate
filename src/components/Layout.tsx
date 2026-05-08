import React from 'react';
import { LogOut, User as UserIcon, Lightbulb, Sparkles, MessageSquare } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { auth } from '../lib/firebase';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { motion } from 'motion/react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile } = useUser();

  const handleSignOut = () => {
    auth.signOut();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-brand-accent p-1.5 rounded-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-black text-2xl tracking-tighter text-slate-900">ELEVATE</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="text-sm font-medium hover:text-brand-accent transition-colors">Resources</a>
            <a href="#" className="text-sm font-medium hover:text-brand-accent transition-colors">Insights</a>
            <a href="#" className="text-sm font-medium hover:text-brand-accent transition-colors">Roadmaps</a>
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar h-10 w-10>
                      <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                      <AvatarFallback className="bg-brand-accent/10 text-brand-accent">
                        {user.displayName?.charAt(0) || user.email?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {}}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4 text-red-500" />
                    <span className="text-red-500">Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button size="sm" onClick={() => {}} className="bg-brand-primary">Sign In</Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t py-8 bg-white">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-lg opacity-20 tracking-tighter">ELEVATE</span>
            <span className="text-xs text-muted-foreground">© 2026 Strategic Career Lifecycle</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-brand-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-brand-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-brand-primary transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
