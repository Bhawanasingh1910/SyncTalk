import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import styles from '../styles/videoComponent.module.css';
import server from '../environment';
import Brand from '../components/Brand';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';

let connections = {};

const peerConfigConnections = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

const silence = () => {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
};

const black = ({ width = 640, height = 480 } = {}) => {
    const canvas = Object.assign(document.createElement('canvas'), { width, height });
    canvas.getContext('2d').fillRect(0, 0, width, height);
    const stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
};

const blackSilence = () => new MediaStream([black(), silence()]);

export default function VideoMeetComponent() {
    const socketRef = useRef();
    const socketIdRef = useRef();
    const localVideoref = useRef();
    const videoRef = useRef([]);
    const chatOpenRef = useRef(false);
    const chatEndRef = useRef();

    const [videoAvailable, setVideoAvailable] = useState(true);
    const [audioAvailable, setAudioAvailable] = useState(true);
    const [screenAvailable, setScreenAvailable] = useState(false);

    const [video, setVideo] = useState();
    const [audio, setAudio] = useState();
    const [screen, setScreen] = useState();

    const [showChat, setShowChat] = useState(false);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [newMessages, setNewMessages] = useState(0);

    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername] = useState('');
    const [connected, setConnected] = useState(false);
    const [videos, setVideos] = useState([]);

    chatOpenRef.current = showChat;

    /* ---------- permissions + local preview (runs ONCE) ---------- */
    const getPermissions = async () => {
        let stream = null, hasVideo = false, hasAudio = false;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            hasVideo = hasAudio = true;
        } catch (e1) {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                hasVideo = true;
            } catch (e2) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    hasAudio = true;
                } catch (e3) { console.log('No camera/mic available', e3); }
            }
        }
        setVideoAvailable(hasVideo);
        setAudioAvailable(hasAudio);
        setScreenAvailable(!!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia));
        if (stream) {
            window.localStream = stream;
            if (localVideoref.current) localVideoref.current.srcObject = stream;
        }
    };

    useEffect(() => {
        getPermissions();
        return () => {
            try { window.localStream && window.localStream.getTracks().forEach((t) => t.stop()); } catch (e) { }
            Object.values(connections).forEach((pc) => { try { pc.close(); } catch (e) { } });
            connections = {};
            if (socketRef.current) socketRef.current.disconnect();
            window.localStream = undefined;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ---------- helpers to (re)offer our stream to all peers ---------- */
    const renegotiate = () => {
        for (const id in connections) {
            if (id === socketIdRef.current) continue;
            try { connections[id].addStream(window.localStream); } catch (e) { }
            // eslint-disable-next-line no-loop-func
            connections[id].createOffer().then((description) =>
                connections[id].setLocalDescription(description).then(() => {
                    socketRef.current.emit('signal', id, JSON.stringify({ sdp: connections[id].localDescription }));
                })
            ).catch((e) => console.log(e));
        }
    };

    const getUserMediaSuccess = (stream) => {
        try { window.localStream.getTracks().forEach((t) => t.stop()); } catch (e) { }
        window.localStream = stream;
        if (localVideoref.current) localVideoref.current.srcObject = stream;
        renegotiate();

        stream.getTracks().forEach((track) => {
            track.onended = () => {
                setVideo(false);
                setAudio(false);
                try { localVideoref.current.srcObject.getTracks().forEach((t) => t.stop()); } catch (e) { }
                window.localStream = blackSilence();
                if (localVideoref.current) localVideoref.current.srcObject = window.localStream;
                renegotiate();
            };
        });
    };

    const getUserMedia = () => {
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({ video: !!(video && videoAvailable), audio: !!(audio && audioAvailable) })
                .then(getUserMediaSuccess)
                .catch((e) => console.log(e));
        } else {
            try { localVideoref.current.srcObject.getTracks().forEach((t) => t.stop()); } catch (e) { }
        }
    };

    useEffect(() => {
        if (video !== undefined && audio !== undefined) getUserMedia();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [video, audio]);

    /* ---------- screen share ---------- */
    const getDisplayMediaSuccess = (stream) => {
        try { window.localStream.getTracks().forEach((t) => t.stop()); } catch (e) { }
        window.localStream = stream;
        if (localVideoref.current) localVideoref.current.srcObject = stream;
        renegotiate();

        stream.getTracks().forEach((track) => {
            track.onended = () => setScreen(false); // effect below restores the camera
        });
    };

    useEffect(() => {
        if (screen === true) {
            navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                .then(getDisplayMediaSuccess)
                .catch((e) => { console.log(e); setScreen(false); });
        } else if (screen === false) {
            getUserMedia();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [screen]);

    /* ---------- signalling ---------- */
    const gotMessageFromServer = (fromId, msg) => {
        const signal = JSON.parse(msg);
        const pc = connections[fromId];
        if (fromId === socketIdRef.current || !pc) return;

        if (signal.sdp) {
            pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                if (signal.sdp.type === 'offer') {
                    pc.createAnswer().then((description) =>
                        pc.setLocalDescription(description).then(() => {
                            socketRef.current.emit('signal', fromId, JSON.stringify({ sdp: pc.localDescription }));
                        })
                    ).catch((e) => console.log(e));
                }
            }).catch((e) => console.log(e));
        }
        if (signal.ice) {
            pc.addIceCandidate(new RTCIceCandidate(signal.ice)).catch((e) => console.log(e));
        }
    };

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prev) => [...prev, { sender, data, mine: socketIdSender === socketIdRef.current }]);
        if (socketIdSender !== socketIdRef.current && !chatOpenRef.current) {
            setNewMessages((n) => n + 1);
        }
    };

    const connectToSocketServer = () => {
        socketRef.current = io(server);

        socketRef.current.on('signal', gotMessageFromServer);
        socketRef.current.on('chat-message', addMessage);

        socketRef.current.on('connect', () => {
            socketIdRef.current = socketRef.current.id;
            setConnected(true);
            socketRef.current.emit('join-call', window.location.href);
        });
        socketRef.current.on('disconnect', () => setConnected(false));

        socketRef.current.on('user-left', (id) => {
            try { connections[id] && connections[id].close(); } catch (e) { }
            delete connections[id];
            videoRef.current = videoRef.current.filter((v) => v.socketId !== id);
            setVideos((vs) => vs.filter((v) => v.socketId !== id));
        });

        socketRef.current.on('user-joined', (id, clients) => {
            clients.forEach((socketListId) => {
                // never rebuild an existing connection, and never connect to ourselves
                if (socketListId === socketIdRef.current || connections[socketListId]) return;

                const pc = new RTCPeerConnection(peerConfigConnections);
                connections[socketListId] = pc;

                pc.onicecandidate = (event) => {
                    if (event.candidate != null) {
                        socketRef.current.emit('signal', socketListId, JSON.stringify({ ice: event.candidate }));
                    }
                };

                pc.onaddstream = (event) => {
                    const exists = videoRef.current.find((v) => v.socketId === socketListId);
                    setVideos((vs) => {
                        const updated = exists
                            ? vs.map((v) => (v.socketId === socketListId ? { ...v, stream: event.stream } : v))
                            : [...vs, { socketId: socketListId, stream: event.stream }];
                        videoRef.current = updated;
                        return updated;
                    });
                };

                if (window.localStream === undefined || window.localStream === null) {
                    window.localStream = blackSilence();
                }
                pc.addStream(window.localStream);
            });

            // the newcomer is the one who sends offers
            if (id === socketIdRef.current) renegotiate();
        });
    };

    /* ---------- UI handlers ---------- */
    const connect = () => {
        if (!username.trim()) setUsername('Guest');
        setAskForUsername(false);
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    };

    const handleEndCall = () => {
        try { localVideoref.current.srcObject.getTracks().forEach((t) => t.stop()); } catch (e) { }
        window.location.href = '/';
    };

    const toggleChat = () => {
        setShowChat((s) => !s);
        setNewMessages(0);
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!message.trim() || !socketRef.current) return;
        socketRef.current.emit('chat-message', message.trim(), username.trim() || 'Guest');
        setMessage('');
    };

    useEffect(() => {
        if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [messages, showChat]);

    const roomCode = decodeURIComponent(window.location.pathname.replace('/', ''));

    /* ---------- LOBBY ---------- */
    if (askForUsername) {
        return (
            <div className={styles.lobby}>
                <div className={styles.lobbyCard}>
                    <div className={styles.preview}>
                        <video ref={localVideoref} autoPlay muted playsInline />
                    </div>
                    <form className={styles.lobbyForm} onSubmit={(e) => { e.preventDefault(); connect(); }}>
                        <Brand />
                        <h2 style={{ marginTop: 22 }}>Ready to join?</h2>
                        <p className="muted" style={{ marginBottom: 18 }}>Room <b>{roomCode}</b></p>
                        <label className="field"><span>Your name</span>
                            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. Bhawana" autoFocus />
                        </label>
                        <button className="btn btn-gold" type="submit">Join meeting</button>
                        {!videoAvailable && !audioAvailable && (
                            <p className="error" style={{ marginTop: 12 }}>Camera and microphone are unavailable or blocked. You can still join and chat.</p>
                        )}
                    </form>
                </div>
            </div>
        );
    }

    /* ---------- MEETING ROOM ---------- */
    return (
        <div className={styles.room}>
            <div className={styles.stage}>
                <div className={styles.top}>
                    <Brand light />
                    <span className={styles.pill}>Room · {roomCode}</span>
                    <span className={styles.status}>{connected ? `● ${videos.length + 1} in call` : 'Connecting… (server may take a few seconds to wake)'}</span>
                </div>

                <div className={styles.grid}>
                    <div className={styles.tile}>
                        <video className={styles.mirror} ref={localVideoref} autoPlay muted playsInline />
                        <span className={styles.label}>{username || 'You'} (You)</span>
                    </div>
                    {videos.map((v, i) => (
                        <div className={styles.tile} key={v.socketId}>
                            <video
                                data-socket={v.socketId}
                                ref={(ref) => { if (ref && v.stream && ref.srcObject !== v.stream) ref.srcObject = v.stream; }}
                                autoPlay
                                playsInline
                            />
                            <span className={styles.label}>Participant {i + 1}</span>
                        </div>
                    ))}
                </div>

                <div className={styles.controls}>
                    <button className={`${styles.ctl} ${video ? '' : styles.ctlOff}`} onClick={() => setVideo(!video)} title="Camera">
                        {video ? <VideocamIcon /> : <VideocamOffIcon />}
                    </button>
                    <button className={`${styles.ctl} ${audio ? '' : styles.ctlOff}`} onClick={() => setAudio(!audio)} title="Microphone">
                        {audio ? <MicIcon /> : <MicOffIcon />}
                    </button>
                    {screenAvailable && (
                        <button className={`${styles.ctl} ${screen ? styles.ctlOff : ''}`} onClick={() => setScreen(!screen)} title="Share screen">
                            {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                        </button>
                    )}
                    <button className={`${styles.ctl} ${showChat ? styles.ctlOff : ''}`} onClick={toggleChat} title="Chat">
                        <ChatIcon />
                        {newMessages > 0 && <span className={styles.badge}>{newMessages > 99 ? '99+' : newMessages}</span>}
                    </button>
                    <button className={`${styles.ctl} ${styles.end}`} onClick={handleEndCall} title="Leave">
                        <CallEndIcon />
                    </button>
                </div>
            </div>

            {showChat && (
                <aside className={styles.chat}>
                    <div className={styles.chatHead}>
                        <h3>Chat</h3>
                        <button onClick={toggleChat} aria-label="Close chat"><CloseIcon /></button>
                    </div>
                    <div className={styles.chatBody}>
                        {messages.length === 0 && <p className="muted">No messages yet. Say hello 👋</p>}
                        {messages.map((m, i) => (
                            <div key={i} className={`${styles.msg} ${m.mine ? styles.msgMine : ''}`}>
                                <b>{m.mine ? 'You' : m.sender}</b>
                                {m.data}
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <form className={styles.chatForm} onSubmit={sendMessage}>
                        <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message…" />
                        <button className={styles.send} type="submit">Send</button>
                    </form>
                </aside>
            )}
        </div>
    );
}