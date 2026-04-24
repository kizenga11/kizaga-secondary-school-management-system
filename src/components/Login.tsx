import React, { useState, useEffect } from 'react';
import { User } from '../types.ts';
import { motion } from 'motion/react';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface LoginProps {
  onLogin: (user: User, token: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [configured, setConfigured] = useState(true);

  const schoolName = (() => {
    try {
      const raw = localStorage.getItem('school_settings');
      const parsed = raw ? JSON.parse(raw) : null;
      const n = String(parsed?.school_name || '').trim();
      return n || 'School';
    } catch {
      return 'School';
    }
  })();

  useEffect(() => {
    setConfigured(isSupabaseConfigured());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!configured) {
      setError('Supabase not configured. Please set environment variables.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!data.user) {
        throw new Error('Login failed');
      }

      // Get user role from public.users table
      const { data: localUser, error: userError } = await supabase
        .from('users')
        .select('id, full_name, role')
        .eq('user_id', data.user.id)
        .single();

      if (userError || !localUser) {
        await supabase.auth.signOut();
        throw new Error('User not registered in system. Contact admin to create account.');
      }

      const user: User = {
        id: localUser.id,
        full_name: localUser.full_name,
        role: localUser.role,
      };

      const token = data.session?.access_token || '';
      
      onLogin(user, token);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200"
      >
        <div className="bg-brand-sidebar p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <h1 className="text-3xl font-black text-white leading-tight tracking-tighter relative z-10 break-words">{schoolName.toUpperCase()}<br/><span className="text-brand-primary">RMS</span></h1>
          <p className="text-[10px] mt-2 uppercase tracking-[0.2em] text-slate-400 font-bold relative z-10">Secure Academic Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-md text-red-700 text-[11px] font-bold uppercase tracking-tight">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="label-app">Username / Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-app pl-10"
                  placeholder="admin@kitukutu.sc.tz"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label-app">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-app pl-10"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-dark w-full py-3.5 mt-2 flex items-center justify-center space-x-2"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <span className="text-xs">Sign In to Dashboard</span>}
          </button>
          
          <p className="text-center text-[10px] text-slate-400 uppercase tracking-widest font-medium">
            Contact ICT for credentials reset
          </p>
        </form>
      </motion.div>
    </div>
  );
}