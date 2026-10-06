import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Brand({ light = false }) {
    const navigate = useNavigate();
    return (
        <div className="brand" onClick={() => navigate('/')} style={light ? { color: 'var(--cream)' } : undefined}>
            <svg viewBox="0 0 32 32" aria-hidden="true">
                <rect width="32" height="32" rx="9" fill={light ? '#FCF0DA' : '#4C4541'} />
                <path d="M10 7h11a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-6l-5 4v-4a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3z" fill="#F2C46A" />
            </svg>
            SyncTalk
        </div>
    );
}