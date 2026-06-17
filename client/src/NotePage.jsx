import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { ArrowLeft, Check, RefreshCw, Eye, Users, UserPlus } from 'lucide-react';
import './NotePage.css';

const NotePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [note, setNote] = useState({ title: '', content: '' });
    const [viewers, setViewers] = useState(0);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [isCreator, setIsCreator] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const socketRef = useRef(null);
    const saveTimeoutRef = useRef(null);
    const currentUserRef = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        currentUserRef.current = user;

        if (!token) {
            navigate('/login');
            return;
        }

        socketRef.current = io('http://localhost:5001');

        socketRef.current.emit('user-online', { 
            id: user.id, 
            name: user.name 
        });

        socketRef.current.emit('join-note', id);

        socketRef.current.on('online-users', (users) => {
            setOnlineUsers(users);
            setViewers(users.length);
        });

        socketRef.current.on('note-updated', (data) => {
            if (data.noteId === id) {
                setNote({
                    title: data.title,
                    content: data.content
                });
            }
        });

        const fetchNote = async (token, userId) => {
            try {
                const response = await fetch(`http://localhost:5001/notes/${id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();
                if (data.note) {
                    setNote({
                        title: data.note.title,
                        content: data.note.content
                    });
                    const userIsCreator = data.note.creatorId === userId;
                    const userIsShared = data.note.sharedWith && data.note.sharedWith.includes(user.email);
                    setIsCreator(userIsCreator);
                    setCanEdit(userIsCreator || userIsShared);
                }
            } catch (error) {
                console.error('Error fetching note:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNote(token, user.id);

        return () => {
            if (socketRef.current) {
                socketRef.current.emit('leave-note', id);
                socketRef.current.disconnect();
            }
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [id, navigate]);

    const handleTitleChange = (e) => {
        const newTitle = e.target.value;
        setNote(prev => ({ ...prev, title: newTitle }));
        
        if (canEdit) {
            debouncedSave(newTitle, note.content);
        }
    };

    const handleContentChange = (e) => {
        const newContent = e.target.value;
        setNote(prev => ({ ...prev, content: newContent }));
        
        if (canEdit) {
            debouncedSave(note.title, newContent);
        }
    };

    const debouncedSave = (title, content) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        setIsSaving(true);

        saveTimeoutRef.current = setTimeout(() => {
            saveNote(title, content);
        }, 500);
    };

    const saveNote = (title, content) => {
        if (socketRef.current && canEdit) {
            socketRef.current.emit('note-update', {
                noteId: id,
                title,
                content,
                userId: currentUserRef.current.id
            });
            
            setTimeout(() => setIsSaving(false), 300);
        }
    };

    const handleBack = () => {
        navigate('/');
    };

    const handleShare = async () => {
        const email = prompt("Enter the exact email address to share this document with:");
        if (!email) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5001/notes/${id}/share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email: email.trim() })
            });
            const data = await res.json();
            alert(data.message);
        } catch(err) {
            alert('Failed to share document.');
        }
    };

    if (loading) {
        return (
            <div className="editor-layout">
                <div className="loading">Loading document...</div>
            </div>
        );
    }

    return (
        <div className="editor-layout">
            {/* Top Navbar */}
            <nav className="editor-nav">
                <div className="nav-left">
                    <button className="btn-back-nav" onClick={handleBack}>
                        <ArrowLeft size={16} />
                        Dashboard
                    </button>
                </div>
                
                <div className="nav-center">
                    {isSaving ? (
                        <div className="status-badge saving">
                            <RefreshCw size={14} className="spin" /> 
                            <span>Saving...</span>
                        </div>
                    ) : canEdit ? (
                        <div className="status-badge saved">
                            <Check size={14} /> 
                            <span>Saved to cloud</span>
                        </div>
                    ) : (
                        <div className="status-badge readonly">
                            <Eye size={14} /> 
                            <span>Read Only</span>
                        </div>
                    )}
                </div>

                <div className="nav-right">
                    {isCreator && (
                        <button className="btn-share" onClick={handleShare}>
                            <UserPlus size={16} /> Share
                        </button>
                    )}
                    {onlineUsers.length > 0 && (
                        <div className="viewers-stack">
                            <Users size={16} className="users-icon" />
                            <div className="avatars">
                                {onlineUsers.slice(0, 3).map((user, index) => (
                                    <div 
                                        key={index} 
                                        className="avatar-small" 
                                        title={user.name || 'Anonymous'}
                                        style={{ zIndex: 3 - index }}
                                    >
                                        {user.name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                ))}
                                {onlineUsers.length > 3 && (
                                    <div className="avatar-small more" style={{ zIndex: 0 }}>
                                        +{onlineUsers.length - 3}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            {/* Main Editor Canvas */}
            <main className="editor-main">
                <div className="editor-container">
                    <input
                        type="text"
                        className="editor-title"
                        placeholder="Untitled Document"
                        value={note.title}
                        onChange={handleTitleChange}
                        disabled={!canEdit}
                    />
                    <textarea
                        className="editor-content"
                        placeholder={canEdit ? "Start typing..." : "This document is read-only."}
                        value={note.content}
                        onChange={handleContentChange}
                        disabled={!canEdit}
                    />
                </div>
            </main>
        </div>
    );
};

export default NotePage;