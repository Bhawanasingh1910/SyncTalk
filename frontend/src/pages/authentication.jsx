import React, { useContext, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import Brand from '../components/Brand';

export default function Authentication() {
    const { handleRegister, handleLogin } = useContext(AuthContext);

    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [loading, setLoading] = useState(false);

    const switchMode = (m) => { setMode(m); setError(''); setNotice(''); };

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setNotice('');
        if (!username.trim() || !password || (mode === 'register' && !name.trim())) {
            setError('Please fill in all fields.');
            return;
        }
        setLoading(true);
        try {
            if (mode === 'login') {
                await handleLogin(username.trim(), password);
            } else {
                const msg = await handleRegister(name.trim(), username.trim(), password);
                setNotice(`${msg || 'Account created'} — you can sign in now.`);
                setPassword('');
                setMode('login');
            }
        } catch (err) {
            setError(err?.response?.data?.message || 'Cannot reach the server. Please try again in a moment.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth">
            <aside className="auth-side">
                <Brand light />
                <div>
                    <h2>Meet with <em>clarity</em>, leave with confidence.</h2>
                    <p>Sign in to create meetings, keep your history and jump back into any conversation.</p>
                </div>
                <span style={{ opacity: .6, fontSize: '.85rem', position: 'relative', zIndex: 1 }}>SyncTalk · Video meetings, beautifully simple</span>
            </aside>

            <main className="auth-main page">
                <div className="card auth-card">
                    <h1>{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
                    <p className="muted">{mode === 'login' ? 'Sign in to continue to SyncTalk.' : 'Join SyncTalk in under a minute.'}</p>

                    <div className="tabs">
                        <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => switchMode('login')}>Sign In</button>
                        <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => switchMode('register')}>Sign Up</button>
                    </div>

                    <form onSubmit={submit} noValidate>
                        {mode === 'register' && (
                            <label className="field"><span>Full name</span>
                                <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoFocus />
                            </label>
                        )}
                        <label className="field"><span>Username</span>
                            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus={mode === 'login'} />
                        </label>
                        <label className="field"><span>Password</span>
                            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                        </label>

                        {error && <p className="error">{error}</p>}
                        {notice && <p className="success">{notice}</p>}

                        <button className="btn btn-gold" style={{ width: '100%' }} type="submit" disabled={loading}>
                            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create account'}
                        </button>
                        {loading && <p className="muted" style={{ fontSize: '.8rem', marginTop: 10, textAlign: 'center' }}>The server may take a few seconds to wake up.</p>}
                    </form>
                </div>
            </main>
        </div>
    );
}