'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import './login.css';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [errKey, setErrKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function fail(msg: string) {
    setError(msg);
    setErrKey((k) => k + 1); // re-trigger the shake/slide-in each time
    setBusy(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || done) return;
    if (!email || !password) return fail('Enter your email and password to continue.');
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.ok) {
        setDone(true);
        setTimeout(() => router.push('/'), 650); // let the success state play
        return;
      }
      fail(data.reason || 'Incorrect email or password.');
    } catch {
      fail('Could not reach the server. Try again.');
    }
  }

  return (
    <main className={done ? 'login-shell leaving' : 'login-shell'}>
      <header className="login-top">
        <img className="login-logo" src="/farmerlink.svg" alt="FarmerLink" />
        <div className="login-chrome"><span>English</span><span>Auto</span></div>
      </header>

      <section className="login-main">
        <div className="login-card">
          <div className="login-key">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="30" cy="18" r="9" stroke="#1b2ba6" strokeWidth="4.2" />
              <path d="M24 24 L11 37" stroke="#8a97e8" strokeWidth="4.2" strokeLinecap="round" />
              <path d="M15 33 l4.5 4.5" stroke="#8a97e8" strokeWidth="4.2" strokeLinecap="round" />
              <path d="M11 37 l3.5 3.5" stroke="#8a97e8" strokeWidth="4.2" strokeLinecap="round" />
            </svg>
          </div>
          <h1>Sign in</h1>
          <p>Sign in to your FarmerLink workspace.</p>

          {error && <div className="login-error" key={errKey}>{error}</div>}

          <form className="login-form" onSubmit={submit}>
            <label>
              Email address
              <div className="login-field">
                <Mail />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="name@organization.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </label>
            <label>
              Password
              <div className="login-field">
                <Lock />
                <input
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" className="toggle" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </label>

            <div className="login-row">
              <label className="remember"><input type="checkbox" defaultChecked />Remember me</label>
              <a href="#">Forgot password?</a>
            </div>

            <button className={'login-submit' + (done ? ' success' : '')} type="submit" disabled={busy || done}>
              {done ? (
                <><Check />Signed in</>
              ) : busy ? (
                <><span className="login-spinner" />Signing in…</>
              ) : (
                <>Sign in<ArrowRight /></>
              )}
            </button>
          </form>

          <p className="login-hint">
            Don&apos;t have access? <a href="#">Contact your administrator</a>
          </p>
        </div>
        <p className="login-ver">FarmerLink · Trust&amp;Trade pilot</p>
      </section>
    </main>
  );
}
