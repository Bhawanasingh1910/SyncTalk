import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import withAuth from '../utils/withAuth';
import { AuthContext } from '../contexts/AuthContext';
import Brand from '../components/Brand';

const clean = (v) => v.trim().replace(/[^a-zA-Z0-9_-]/g, '');
const randomCode = () => Math.random().toString(36).slice(2, 8);

function HomeComponent() {
    const navigate = useNavigate();
    const { addToUserHistory } = useContext(AuthContext);
    const [meetingCode, setMeetingCode] = useState('');
    const [busy, setBusy] = useState(false);

    const go = async (rawCode) => {
        const code = clean(rawCode);
        if (!code) return;
        setBusy(true);
        try { await addToUserHistory(code); } catch (e) { /* history is optional; never block joining */ }
        navigate(`/${code}`);
    };

    const logout = () => {
        localStorage.removeItem('token');
        navigate('/auth');
    };

    return (
        <div className="page">
            <div className="container">
                <nav className="nav">
                    <Brand />
                    <div className="nav-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/history')}>History</button>
                        <button className="btn btn-dark btn-sm" onClick={logout}>Logout</button>
                    </div>
                </nav>

                <section className="home-main">
                    <div>
                        <span className="eyebrow">Your dashboard</span>
                        <h1>Start a meeting, or step into one.</h1>
                        <p className="muted" style={{ fontSize: '1.1rem', maxWidth: 460 }}>Create a fresh room in one click and share the code, or enter a code you've been given.</p>
                    </div>

                    <div className="card join-card">
                        <h3>Join a meeting</h3>
                        <form className="join-row" onSubmit={(e) => { e.preventDefault(); go(meetingCode); }}>
                            <input className="input" placeholder="Enter meeting code" value={meetingCode} onChange={(e) => setMeetingCode(e.target.value)} />
                            <button className="btn btn-gold" type="submit" disabled={busy || !clean(meetingCode)}>Join</button>
                        </form>
                        <div className="divider">or</div>
                        <button className="btn btn-dark" style={{ width: '100%' }} disabled={busy} onClick={() => go(randomCode())}>New meeting</button>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default withAuth(HomeComponent);