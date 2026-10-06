import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import Brand from '../components/Brand';
import withAuth from '../utils/withAuth';

const formatDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

function History() {
    const { getHistoryOfUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const data = await getHistoryOfUser();
                if (Array.isArray(data)) setMeetings([...data].reverse());
            } catch (e) { /* show empty state */ }
            setLoading(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="page">
            <div className="container">
                <nav className="nav">
                    <Brand />
                    <button className="btn btn-dark btn-sm" onClick={() => navigate('/home')}>Dashboard</button>
                </nav>

                <div className="hist-head">
                    <span className="eyebrow">Activity</span>
                    <h1 style={{ marginTop: 14 }}>Meeting history</h1>
                </div>

                {loading ? (
                    <p className="muted">Loading your meetings…</p>
                ) : meetings.length === 0 ? (
                    <div className="card empty">
                        <h3>No meetings yet</h3>
                        <p className="muted" style={{ marginBottom: 20 }}>Meetings you start or join will appear here.</p>
                        <button className="btn btn-gold" onClick={() => navigate('/home')}>Start a meeting</button>
                    </div>
                ) : (
                    <div className="hist-list">
                        {meetings.map((m) => (
                            <div className="card hist-item" key={m._id}>
                                <div>
                                    <div className="hist-code">{m.meetingCode}</div>
                                    <div className="muted" style={{ fontSize: '.88rem' }}>{formatDate(m.date)}</div>
                                </div>
                                <button className="btn btn-line btn-sm" onClick={() => navigate(`/${m.meetingCode}`)}>Rejoin</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default withAuth(History);