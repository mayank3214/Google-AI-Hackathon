'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, firebaseError } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';

interface AuthContextType {
  user: User | null;
}

const AuthContext = createContext<AuthContextType>({ user: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If Firebase failed to initialize, auth will be undefined.
    if (!auth) {
        setLoading(false);
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Don't redirect if still loading or if Firebase is not configured.
    if (loading || !auth) return;

    const isAuthPage = pathname === '/';
    
    if (!user && !isAuthPage) {
      router.push('/');
    } else if (user && isAuthPage) {
      router.push('/story-creator');
    }
  }, [user, loading, pathname, router]);

  if (firebaseError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8 text-foreground">
          <div className="text-center max-w-2xl bg-card p-8 rounded-xl border border-destructive/50 shadow-lg">
              <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
              <h1 className="mt-4 text-3xl font-headline font-bold text-destructive">Firebase Setup Incomplete</h1>
              <p className="mt-4 text-lg text-muted-foreground">
                  There was a problem connecting to Firebase. This usually happens when the
                  Firebase environment variables are missing or incorrect.
              </p>
              <div className="mt-6 text-left bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto text-destructive">
                  <p className="font-bold mb-2">Error Details:</p>
                  <code>{firebaseError.message}</code>
              </div>
              <p className="mt-6 text-lg text-muted-foreground">
                  Please copy your Firebase project configuration into the <code>.env</code> file to continue.
              </p>
          </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // Prevent flash of content during redirects ONLY if auth is configured
  if (auth) {
    const isAuthPage = pathname === '/';
    if ((!user && !isAuthPage) || (user && isAuthPage)) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-background">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
      );
    }
  }

  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
