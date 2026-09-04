import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import {
  Building2,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  LogIn
} from 'lucide-react';

import { auth, googleAuthProvider } from '../lib/firebase';
import { signInWithPopup, signInAnonymously } from 'firebase/auth';
interface LoginPageProps {
  users: UserProfile[];
  onLogin: (user: UserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ users = [], onLogin }) => {
  // Sign-In Form State
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // UI Feedback States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);

  // Handle Sign In Submit
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setForgotMsg(null);

    if (!loginIdentifier.trim()) {
      setErrorMsg('Please enter your username, employee ID, or email address.');
      return;
    }
    if (!loginPassword) {
      setErrorMsg('Please enter your account password.');
      return;
    }

    setIsLoading(true);
    
    try {
      // await signInAnonymously(auth);
      
      const idLower = loginIdentifier.trim().toLowerCase();

      
      // Strict match by email, username, employee ID, account ID, or full name
      const matchedUser = users.find(
        (u) =>
          u.status !== 'departed' &&
          (u.email?.toLowerCase() === idLower ||
            u.username?.toLowerCase() === idLower ||
            u.employeeId?.toLowerCase() === idLower ||
            u.id.toLowerCase() === idLower ||
            u.name.toLowerCase() === idLower)
      );

      if (!matchedUser) {
        setErrorMsg(`Account "${loginIdentifier}" not found. Please contact your Facility Manager to register a staff account.`);
        return;
      }

      const activePassword = matchedUser.password || '123456';
      if (loginPassword !== activePassword) {
        setErrorMsg(`Incorrect password for ${matchedUser.name}. If you changed your password in Profile Settings, please enter your new password.`);
        return;
      }

      // Password and Identity Match
      onLogin(matchedUser);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to authenticate');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick 1-Click Demo Sign-In
  const handleQuickDemoLogin = async (user: UserProfile) => {
    setLoginIdentifier(user.username || user.email || user.name);
    setLoginPassword(user.password || '123456');
    setErrorMsg(null);
    setIsLoading(true);

    try {
      // await signInAnonymously(auth);
      onLogin(user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to authenticate anonymously');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => { try { setIsLoading(true); setErrorMsg(null); const result = await signInWithPopup(auth, googleAuthProvider); const gUser = result.user; const matchedUser = users.find(u => u.email === gUser.email); if (matchedUser) { onLogin(matchedUser); } else { const dummyUser = { ...users[0], name: gUser.displayName || 'Google User', email: gUser.email || '', avatar: gUser.photoURL || users[0].avatar }; onLogin(dummyUser); } } catch (error: any) { setErrorMsg(error.message || 'Failed to sign in with Google'); } finally { setIsLoading(false); } };

  return (
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.08),rgba(255,255,255,0))] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans text-slate-900">
      
      {/* Company Branding & Logo Header */}
      <div className="text-center max-w-md mx-auto mb-6 space-y-2">
        <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-4 ring-indigo-50 mb-1">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          Insulet <span className="text-indigo-600 font-extrabold">MALAYSIA</span>
        </h1>
      </div>

      {/* Main Standard Authentication Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/70 space-y-6 relative overflow-hidden">
        
        {/* Decorative Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600"></div>

        {/* Portal Sign-In Header */}
        <div className="border-b border-slate-100 pb-2.5">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <LogIn className="w-5 h-5 text-indigo-600" />
            <span>Portal Sign In</span>
          </h2>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Forgot Password Feedback Banner */}
        {forgotMsg && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{forgotMsg}</span>
          </div>
        )}

        {/* SIGN IN FORM */}
        <form onSubmit={handleSignInSubmit} className="space-y-4">
          
          {/* Username / Email */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" /> Username, ID, or Email
            </label>
            <input
              type="text"
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              placeholder="Enter username"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-600" /> Account Password
              </label>
              <button
                type="button"
                onClick={() => setForgotMsg('Password reset requests are processed by your Facility Manager.')}
                className="text-[11px] font-semibold text-indigo-600 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showLoginPassword ? 'text' : 'password'}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <label htmlFor="remember" className="text-xs text-slate-600 font-medium select-none cursor-pointer">
              Remember my login credentials on this device
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isLoading ? (
              <span>Verifying Credentials...</span>
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          
          <div className="relative flex items-center justify-center my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <span className="relative bg-white px-3 text-[10px] uppercase font-bold text-slate-400">Or continue with</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full py-3 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign In with Google
          </button>

        </form>

        {/* Quick Demo Shortcuts Selector */}
        <div className="pt-3 border-t border-slate-100 text-center space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
            ⚡ Quick 1-Click Employee Sign-In (Demo Testing):
          </span>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {users.slice(0, 7).map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleQuickDemoLogin(u)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title={`Sign in as ${u.name} (${u.role})`}
              >
                <img src={u.avatar} alt={u.name} className="w-4 h-4 rounded-full object-cover shrink-0" />
                <span>{u.name.split(' ')[0]}</span>
                <span className={`text-[9px] font-black uppercase px-1 py-0.2 rounded ${
                  u.role === 'it'
                    ? 'bg-purple-200 text-purple-900'
                    : u.role === 'administrator'
                    ? 'bg-sky-200 text-sky-900'
                    : u.role === 'manager'
                    ? 'bg-indigo-200 text-indigo-900'
                    : u.role === 'supervisor'
                    ? 'bg-amber-200 text-amber-900'
                    : 'bg-emerald-200 text-emerald-900'
                }`}>
                  {u.role === 'it' ? 'IT' : u.role === 'administrator' ? 'ADM' : u.role === 'manager' ? 'MGR' : u.role === 'supervisor' ? 'SUP' : 'PIC'}
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Footer Branding */}
      <div className="mt-6 text-center text-[11px] text-slate-500 font-medium">
        Insulet MALAYSIA • Standard Unified Employee Login Portal
      </div>

    </div>
  );
};
