/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useUser, UserProvider } from './context/UserContext';
import Layout from './components/Layout';
import Landing from './components/Landing';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import { Toaster } from './components/ui/sonner';

function AppContent() {
  const { user, profile, loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Initializing Elevate HQ...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Layout>
        <Landing />
      </Layout>
    );
  }

  if (!profile?.onboardingCompleted) {
    return (
      <Layout>
        <Onboarding />
      </Layout>
    );
  }

  return (
    <Layout>
      <Dashboard />
    </Layout>
  );
}

export default function App() {
  return (
    <UserProvider>
      <AppContent />
      <Toaster position="top-right" />
    </UserProvider>
  );
}

