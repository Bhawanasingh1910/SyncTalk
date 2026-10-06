import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Brand from '../components/Brand';

const clean = (v) => v.trim().replace(/[^a-zA-Z0-9_-]/g, '');

export default function LandingPage() {
    const navigate = useNavigate();
    const [code, setCode] = useState('');
    const isLoggedIn = !!localStorage.getItem('token');

    const joinAsGuest = (e) => {
        e.preventDefault();
        const c = clean(code);
        if (c) navigate(`/${c}`);
    };

    return (
        <div className="page">
            <div className="container">
                <nav className="nav">
                    <Brand />
                    <div className="nav-actions">
                        {isLoggedIn ? (
                            <button className="btn btn-dark btn-sm" onClick={() => navigate('/home')}>Open dashboard</button>
                        ) : (
                            <>
                                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/auth')}>Register</button>
                                <button className="btn btn-dark btn-sm" onClick={() => navigate('/auth')}>Login</button>
                            </>
                        )}
                    </div>
                </nav>

                <section className="hero">
                    <div>
                        <span className="eyebrow">Video meetings, refined</span>
                        <h1>Conversations that feel <em>close</em>, wherever you are.</h1>
                        <p className="lead">SyncTalk brings crystal-clear video, live chat and screen sharing into one calm, elegant space. No downloads. Just a meeting code.</p>
                        <div className="hero-cta">
                            <button className="btn btn-gold" onClick={() => navigate(isLoggedIn ? '/home' : '/auth')}>Get started</button>
                        </div>
                        <form className="join-inline" onSubmit={joinAsGuest}>
                            <input className="input" placeholder="Have a code? Join as guest" value={code} onChange={(e) => setCode(e.target.value)} />
                            <button className="btn btn-line" type="submit">Join</button>
                        </form>
                    </div>

                    <div className="mock" aria-hidden="true">
                        <div className="mock-grid">
                            {['A', 'S', 'M', 'R'].map((l) => (
                                <div className="mock-tile" key={l}><div className="mock-av">{l}</div></div>
                            ))}
                        </div>
                        <div className="mock-bar"><i /><i /><i /><i /></div>
                    </div>
                </section>

                <section className="features">
                    {[
                        ['Crystal-clear calls', 'Peer-to-peer video and audio for smooth, low-latency conversations.'],
                        ['Chat & screen share', 'Message everyone in the room and present your screen in one click.'],
                        ['Meeting history', 'Every code you join is saved, so rejoining takes a single tap.']
                    ].map(([t, d]) => (
                        <div className="card feature" key={t}>
                            <div className="dot" />
                            <h3>{t}</h3>
                            <p className="muted">{d}</p>
                        </div>
                    ))}
                </section>

                <footer className="footer muted">© {new Date().getFullYear()} SyncTalk. Crafted with care.</footer>
            </div>
        </div>
    );
}