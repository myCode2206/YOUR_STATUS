import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { RiFireFill, RiArrowRightLine, RiCheckboxCircleFill, RiGoogleFill } from 'react-icons/ri';
import toast from 'react-hot-toast';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

const FEATURES = [
  'Real-time activity tracking',
  'Weekly leaderboards with streaks',
  'Study groups & social feed',
  'Heatmaps & deep analytics',
];

export default function Landing() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', username: '', displayName: '' });
  const { login, register, loginWithGoogle, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const action = isLogin ? login(formData.email, formData.password) : register(formData);
    const result = await action;
    if (result.success) {
      toast.success('Welcome to Your Status! 🔥');
      navigate('/dashboard');
    } else {
      toast.error(result.message);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) {
      toast.error('Firebase Auth is not configured. Add your API key to environment variables!');
      return;
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const loginResult = await loginWithGoogle(idToken);
      if (loginResult.success) {
        toast.success('Welcome to Your Status! 🚀');
        navigate('/dashboard');
      } else {
        toast.error(loginResult.message);
      }
    } catch (error) {
      console.error('Google login error:', error);
      toast.error(error.message || 'Google Sign-in failed');
    }
  };

  return (
    <div className="landing-page">
      {/* LEFT — Hero */}
      <div className="landing-left">
        <div className="landing-badge">
          <RiFireFill /> Your Status App
        </div>

        <h1 className="landing-title">
          Being an ordinary is<br />
          <span className="gradient-text">not an option</span> 💥
        </h1>

        <p className="landing-subtitle">
          Track your activities, share with your study group, dominate the leaderboard, and unlock your true potential.
        </p>

        <ul className="landing-features">
          {FEATURES.map((f) => (
            <li key={f}>
              <RiCheckboxCircleFill style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              {f}
            </li>
          ))}
        </ul>

        <div className="landing-glow" />
      </div>

      {/* RIGHT — Auth Form */}
      <div className="landing-right">
        <div className="landing-form-card glass-card">
          <div className="landing-mascot-wrap">
            <img
              src="/images/Naruto.jpg"
              alt="Naruto"
              className="landing-mascot"
            />
          </div>

          <h2 className="landing-form-title">
            {isLogin ? 'Welcome Back' : 'Join the Elite'}
          </h2>

          <form onSubmit={handleSubmit} className="landing-form">
            {!isLogin && (
              <>
                <div className="input-group">
                  <label className="input-label">Username</label>
                  <input className="input" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Display Name</label>
                  <input className="input" required value={formData.displayName} onChange={e => setFormData({ ...formData, displayName: e.target.value })} />
                </div>
              </>
            )}

            <div className="input-group">
              <label className="input-label">Email</label>
              <input type="email" className="input" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <input type="password" className="input" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
            </div>

            <button type="submit" className="btn btn-primary btn-lg landing-submit" disabled={isLoading}>
              {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              {!isLoading && <RiArrowRightLine />}
            </button>
          </form>

          {/* Google Sign-in Divider & Button */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', width: '100%' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
            <span style={{ padding: '0 12px', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
          </div>

          <button 
            type="button" 
            className="btn btn-ghost w-full" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: 10,
              padding: '12px 0',
              border: '1px solid var(--color-border-strong)',
              borderRadius: 'var(--radius-lg)'
            }}
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <RiGoogleFill size={18} style={{ color: '#4285F4' }} />
            <span>Continue with Google</span>
          </button>

          <p className="landing-switch">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
