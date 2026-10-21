import React, { useState } from 'react';
import axios from 'axios';
import { X, Mail, Lock, User, Sparkles, ArrowRight, KeyRound, ArrowLeft } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  // mode: 'auth' (login/signup) | 'forgot-email' | 'reset-password'
  const [view, setView] = useState('auth'); 
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState('form'); // 'form' ya 'otp' (signup ke liye)

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  // Form Reset Helper
  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setNewPassword('');
    setOtp('');
    setError('');
    setSuccessMsg('');
    setStep('form');
    setView('auth');
    setIsLogin(true);
  };

  // 1. Direct Login / Send Signup OTP
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    if (isLogin) {
      try {
        const response = await axios.post(
          'https://pricehunter-api-ox2s.onrender.com/api/auth/login',
          { email, password }
        );
        localStorage.setItem('user_token', response.data.token);
        localStorage.setItem('user_name', response.data.name);
        onAuthSuccess();
        onClose();
        resetForm();
      } catch (err) {
        setError(err.response?.data?.message || 'Login failed. Please check credentials.');
      } finally {
        setLoading(false);
      }
    } else {
      try {
        await axios.post(
          'https://pricehunter-api-ox2s.onrender.com/api/auth/send-otp',
          { email }
        );
        setSuccessMsg(`OTP sent to ${email}. Please check your inbox.`);
        setStep('otp');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to send OTP. Try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  // 2. Signup OTP Verification
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        'https://pricehunter-api-ox2s.onrender.com/api/auth/verify-otp-register',
        { name, email, password, otp }
      );
      localStorage.setItem('user_token', response.data.token);
      localStorage.setItem('user_name', response.data.name);
      onAuthSuccess();
      onClose();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Forgot Password: Send OTP
  const handleForgotEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      // Backend send-otp endpoint for password recovery
      await axios.post(
        'https://pricehunter-api-ox2s.onrender.com/api/auth/send-otp',
        { email }
      );
      setSuccessMsg(`Reset code sent to ${email}`);
      setView('reset-password');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Reset Password: Verify OTP & Save New Password
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const response = await axios.post(
        'https://pricehunter-api-ox2s.onrender.com/api/auth/reset-password',
        { email, otp, newPassword }
      );
      setSuccessMsg(response.data.message || 'Password reset successful!');
      setTimeout(() => {
        setView('auth');
        setIsLogin(true);
        setPassword('');
        setNewPassword('');
        setOtp('');
        setError('');
        setSuccessMsg('You can now log in with your new password.');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP or failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-7 sm:p-8">
        
        {/* Close Button */}
        <button
          onClick={() => {
            resetForm();
            onClose();
          }}
          className="absolute right-5 top-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles size={13} /> 
            {view === 'forgot-email' || view === 'reset-password'
              ? 'Account Recovery'
              : isLogin
              ? 'Welcome Back'
              : 'Join PriceHunter'}
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            {view === 'forgot-email'
              ? 'Reset Password'
              : view === 'reset-password'
              ? 'Set New Password'
              : step === 'otp'
              ? 'Enter Verification Code'
              : isLogin
              ? 'Log in to your account'
              : 'Create a free account'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {view === 'forgot-email'
              ? 'Enter your registered email to receive a reset OTP'
              : view === 'reset-password'
              ? 'Enter the code and choose a new password'
              : step === 'otp'
              ? 'Enter the 6-digit code sent to your email'
              : 'Unlimited live price tracking across all top stores'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            {successMsg}
          </div>
        )}

        {/* VIEW 1: NORMAL LOGIN / SIGNUP */}
        {view === 'auth' && (
          <>
            {step === 'form' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                      Full Name
                    </label>
                    <div className="relative flex items-center">
                      <User size={18} className="absolute left-3.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Devesh Kumar"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail size={18} className="absolute left-3.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                      Password
                    </label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => {
                          setView('forgot-email');
                          setError('');
                          setSuccessMsg('');
                        }}
                        className="text-xs text-blue-600 dark:text-sky-400 hover:underline cursor-pointer font-semibold"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <Lock size={18} className="absolute left-3.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  {loading ? 'Please wait...' : (
                    <>
                      {isLogin ? 'Log In' : 'Send Verification OTP'}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Signup OTP Form */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                    6-Digit OTP
                  </label>
                  <div className="relative flex items-center">
                    <KeyRound size={18} className="absolute left-3.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.trim())}
                      placeholder="123456"
                      className="w-full pl-10 pr-4 py-3 text-center tracking-widest text-lg font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('form');
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:underline pt-2 cursor-pointer"
                >
                  Back to registration
                </button>
              </form>
            )}

            {/* Toggle Login / Register */}
            {step === 'form' && (
              <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="text-blue-600 dark:text-sky-400 font-bold hover:underline cursor-pointer ml-1"
                >
                  {isLogin ? 'Sign Up' : 'Log In'}
                </button>
              </div>
            )}
          </>
        )}

        {/* VIEW 2: FORGOT PASSWORD (EMAIL INPUT) */}
        {view === 'forgot-email' && (
          <form onSubmit={handleForgotEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                Registered Email
              </label>
              <div className="relative flex items-center">
                <Mail size={18} className="absolute left-3.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {loading ? 'Sending Code...' : (
                <>
                  <span>Send Reset Code</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setView('auth');
                setError('');
                setSuccessMsg('');
              }}
              className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:underline pt-2 flex items-center justify-center gap-1 cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Log In
            </button>
          </form>
        )}

        {/* VIEW 3: RESET PASSWORD (OTP + NEW PASSWORD INPUT) */}
        {view === 'reset-password' && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                6-Digit Reset Code
              </label>
              <div className="relative flex items-center">
                <KeyRound size={18} className="absolute left-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.trim())}
                  placeholder="123456"
                  className="w-full pl-10 pr-4 py-3 text-center tracking-widest text-lg font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                New Password
              </label>
              <div className="relative flex items-center">
                <Lock size={18} className="absolute left-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
            </button>

            <button
              type="button"
              onClick={() => {
                setView('auth');
                setError('');
                setSuccessMsg('');
              }}
              className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:underline pt-2 flex items-center justify-center gap-1 cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Log In
            </button>
          </form>
        )}

      </div>
    </div>
  );
}