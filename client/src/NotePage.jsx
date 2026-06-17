import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { ArrowLeft, Check, RefreshCw, Eye, Users, UserPlus, Link, X } from 'lucide-react';
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
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareEmail, setShareEmail] = useState('');
    const [shareRole, setShareRole] = useState('viewer');
    
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
        socketRef.current.emit('join-note', {
            noteId: id,
            user: { id: user.id, name: user.name }
        });
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
                    setNote(data.note); // Set entire note to get sharedWith and creatorName easily
                    const userIsCreator = data.note.creatorId === userId;
                    const sharedUser = data.note.sharedWith && data.note.sharedWith.find(s => (typeof s === 'object' ? s.email === user.email : s === user.email));
                    const userIsEditor = sharedUser ? (typeof sharedUser === 'object' ? sharedUser.role === 'editor' : true) : false;
                    
                    setIsCreator(userIsCreator);
                    setCanEdit(userIsCreator || userIsEditor);
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

    const handleShareClick = () => {
        setShowShareModal(true);
    };

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
    };

    const handleInvite = async () => {
        if (!shareEmail) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5001/notes/${id}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ email: shareEmail.trim(), role: shareRole })
            });
            const data = await res.json();
            if (res.ok) {
                setShareEmail('');
                setNote(prev => {
                    const newShared = [...(prev.sharedWith || [])];
                    const idx = newShared.findIndex(s => (typeof s === 'object' ? s.email === shareEmail.trim() : s === shareEmail.trim()));
                    if (idx > -1) newShared[idx] = { email: shareEmail.trim(), role: shareRole };
                    else newShared.push({ email: shareEmail.trim(), role: shareRole });
                    return { ...prev, sharedWith: newShared };
                });
            } else {
                alert(data.message);
            }
        } catch(err) {
            alert('Failed to invite.');
        }
    };

    const updateCollaboratorRole = async (emailToUpdate, newRole) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`http://localhost:5001/notes/${id}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ email: emailToUpdate, role: newRole })
            });
            setNote(prev => {
                const newShared = [...(prev.sharedWith || [])];
                const idx = newShared.findIndex(s => (typeof s === 'object' ? s.email === emailToUpdate : s === emailToUpdate));
                if (idx > -1) newShared[idx] = { email: emailToUpdate, role: newRole };
                return { ...prev, sharedWith: newShared };
            });
        } catch (error) {
            console.error('Failed to update role', error);
        }
    };

    const removeCollaborator = async (emailToRemove) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`http://localhost:5001/notes/${id}/share/${emailToRemove}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNote(prev => {
                const newShared = prev.sharedWith.filter(s => (typeof s === 'object' ? s.email !== emailToRemove : s !== emailToRemove));
                return { ...prev, sharedWith: newShared };
            });
        } catch (error) {
            console.error('Failed to remove collaborator', error);
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
                        <button className="btn-share" onClick={handleShareClick}>
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
                                        title={user?.name || 'Anonymous'}
                                        style={{ zIndex: 3 - index }}
                                    >
                                        {user?.name?.charAt(0).toUpperCase() || 'U'}
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

            {showShareModal && (
                <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Share "{note.title || 'Untitled Document'}"</h2>
                            <button className="btn-close-modal" onClick={() => setShowShareModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="share-input-group">
                            <input 
                                type="email" 
                                placeholder="Add people by email..." 
                                value={shareEmail} 
                                onChange={e => setShareEmail(e.target.value)}
                                className="share-email-input"
                            />
                            <select 
                                value={shareRole} 
                                onChange={e => setShareRole(e.target.value)}
                                className="share-role-select"
                            >
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                            </select>
                            <button className="btn-invite" onClick={handleInvite}>Invite</button>
                        </div>
                        
                        <div className="collaborators-list">
                            <h4>People with access</h4>
                            
                            <div className="collaborator-item">
                                <div className="collab-info">
                                    <div className="collab-avatar">{note.creatorName?.charAt(0).toUpperCase() || 'U'}</div>
                                    <div className="collab-details">
                                        <span className="collab-name">{note.creatorName} (You)</span>
                                        <span className="collab-email">Owner</span>
                                    </div>
                                </div>
                                <span className="collab-role-text">Owner</span>
                            </div>
                            
                            {note.sharedWith && note.sharedWith.map((userObj, idx) => {
                                const email = typeof userObj === 'object' ? userObj.email : userObj;
                                const role = typeof userObj === 'object' ? userObj.role : 'editor';
                                
                                return (
                                    <div className="collaborator-item" key={idx}>
                                        <div className="collab-info">
                                            <div className="collab-avatar">{email.charAt(0).toUpperCase()}</div>
                                            <div className="collab-details">
                                                <span className="collab-email">{email}</span>
                                            </div>
                                        </div>
                                        <div className="collab-actions">
                                            <select 
                                                value={role} 
                                                onChange={(e) => updateCollaboratorRole(email, e.target.value)}
                                                className="collab-role-dropdown"
                                            >
                                                <option value="viewer">Viewer</option>
                                                <option value="editor">Editor</option>
                                            </select>
                                            <button className="btn-remove-access" onClick={() => removeCollaborator(email)}>Remove</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="modal-footer">
                            <button className="btn-copy-link" onClick={copyLink}>
                                <Link size={14} /> Copy link
                            </button>
                            <button className="btn-done" onClick={() => setShowShareModal(false)}>Done</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotePage;