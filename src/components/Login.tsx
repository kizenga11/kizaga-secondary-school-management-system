import React, { useState, useEffect } from 'react';
import { User } from '../types.ts';
import { motion } from 'motion/react';
import { Lock, Mail, Loader2, Eye, EyeOff, GraduationCap } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface LoginProps {
  onLogin: (user: User, token: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const schoolLogo = (() => {
    try {
      const raw = localStorage.getItem('school_settings');
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.school_logo || '';
    } catch {
      return '';
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
        // Handle specific auth errors
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please try again.');
        }
        if (authError.message.includes('User not found')) {
          throw new Error('No account found with this email.');
        }
        throw new Error(authError.message);
      }

      if (!data.user) {
        throw new Error('Login failed. Please try again.');
      }

      // Check if user exists in public.users table
      let { data: localUser, error: userError } = await supabase
        .from('users')
        .select('id, full_name, role, email')
        .eq('user_id', data.user.id)
        .single();

      // If no local user record, check by email
      if (userError || !localUser) {
        const { data: userByEmail } = await supabase
          .from('users')
          .select('id, full_name, role, email')
          .eq('email', email.toLowerCase())
          .single();

        if (userByEmail) {
          // Link existing user to auth
          await supabase
            .from('users')
            .update({ user_id: data.user.id })
            .eq('id', userByEmail.id);
          
          localUser = userByEmail;
        } else {
          // Auto-create user with default role
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              user_id: data.user.id,
              full_name: data.user.email?.split('@')[0] || 'User',
              email: email.toLowerCase(),
              role: 'teacher',
            })
            .select('id, full_name, role, email')
            .single();

          if (createError) {
            await supabase.auth.signOut();
            throw new Error('Unable to create user profile. Contact admin.');
          }
          
          localUser = newUser;
        }
      }

      const user: User = {
        id: localUser.id,
        full_name: localUser.full_name,
        email: localUser.email || email,
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden"
      >
        {/* Header */}
        <div className="bg-[#064e3b] p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          {schoolLogo ? (
            <img src={schoolLogo} alt="School Logo" className="w-16 h-16 object-contain mx-auto mb-3 rounded-full" />
          ) : (
            <div className="w-16 h-16 mx-auto mb-3 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <GraduationCap size={32} className="text-emerald-400" />
            </div>
          )}
          <h1 className="text-3xl font-black text-white leading-tight tracking-tight relative z-10 break-words">
            {schoolName.toUpperCase()}<br/>
            <span className="text-emerald-400">RMS</span>
          </h1>
          <p className="text-[10px] mt-3 uppercase tracking-[0.25em] text-slate-400 font-semibold relative z-10">
            Secure Academic Portal
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-red-600 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Username / Email Field */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Username / Email
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-blue-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-10 bg-blue-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#022c22] hover:bg-[#064e3b] text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <span className="text-xs uppercase tracking-wider">Sign In to Dashboard</span>
            )}
          </button>

          {/* Footer */}
          <p className="text-center text-[10px] text-slate-400 uppercase tracking-widest font-medium pt-2">
            Contact ICT for credentials reset
          </p>
        </form>
      </motion.div>
    </div>
  );
}