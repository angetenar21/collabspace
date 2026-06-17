import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Plus, FileText, LogOut, Search, Trash2, FilePlus2, Link } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (!token) {
            navigate('/login');
            return;
        }

        setUserName(user.name || 'User');
        fetchNotes(token);
    }, [navigate]);

    const fetchNotes = async (token) => {
        try {
            const response = await fetch('http://localhost:5001/notes', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            setNotes(data.notes || []);
        } catch (error) {
            console.error('Error fetching notes:', error);
        } finally {
            setLoading(false);
        }
    };

    const createNewNote = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch('http://localhost:5001/notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: '',
                    content: ''
                })
            });
            const data = await response.json();
            if (data.note) {
                navigate(`/note/${data.note._id}`);
            }
        } catch (error) {
            console.error('Error creating note:', error);
        }
    };

    const deleteNote = async (noteId, e) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this note?')) return;
        
        const token = localStorage.getItem('token');
        try {
            await fetch(`http://localhost:5001/notes/${noteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setNotes(notes.filter(note => note._id !== noteId));
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const joinNote = () => {
        const url = prompt('Enter the copied link to the note space:');
        if (!url) return;
        
        let id;
        try {
            if (url.includes('/note/')) {
                id = url.split('/note/')[1];
            } else {
                id = url; // fallback if they just paste the ID
            }
            if (id) navigate(`/note/${id}`);
            else alert('Invalid link format');
        } catch (err) {
            alert('Invalid link format');
        }
    };

    const resolveRequest = async (noteId, email, approved, role = 'viewer') => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`http://localhost:5001/notes/${noteId}/resolve-access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ email, approved, role })
            });
            fetchNotes(token); // refresh notes to clear the request
        } catch (error) {
            console.error('Error resolving request:', error);
        }
    };

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const notesWithRequests = notes.filter(n => n.creatorId === currentUser.id && n.accessRequests && n.accessRequests.length > 0);

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="dashboard-layout">
                <div className="loading">Loading your workspace...</div>
            </div>
        );
    }

    return (
        <div className="dashboard-layout">
            {/* Left Sidebar */}
            <aside className="dashboard-sidebar">
                <div className="sidebar-brand">
                    <div className="brand-logo">
                        <LayoutDashboard size={20} color="#fff" />
                    </div>
                    <span className="brand-text">CollabSpace</span>
                </div>
                
                <button className="sidebar-new-btn" onClick={createNewNote} style={{marginBottom: '12px'}}>
                    <Plus size={18} />
                    New Note
                </button>
                <button className="sidebar-new-btn" onClick={joinNote} style={{backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)'}}>
                    <Link size={18} />
                    Join via Link
                </button>

                <nav className="sidebar-nav">
                    <button className="nav-item active">
                        <FileText size={18} />
                        All Notes
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile">
                        <div className="avatar">{userName.charAt(0).toUpperCase()}</div>
                        <span className="user-name-text">{userName}</span>
                    </div>
                    <button className="btn-logout-icon" onClick={handleLogout} title="Logout">
                        <LogOut size={18} />
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="dashboard-main">
                <header className="main-header">
                    <div className="header-search">
                        <Search size={18} className="search-icon" />
                        <input type="text" placeholder="Search notes..." />
                    </div>
                </header>

                <div className="main-content">
                    {notesWithRequests.length > 0 && (
                        <div className="access-requests-section" style={{marginBottom: '32px'}}>
                            <h2 style={{fontSize: '16px', fontWeight: '600', color: '#e65100', marginBottom: '16px'}}>Pending Access Requests</h2>
                            {notesWithRequests.map(note => (
                                note.accessRequests.map(email => (
                                    <div key={`${note._id}-${email}`} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff3e0', padding: '12px 16px', borderRadius: '8px', marginBottom: '8px'}}>
                                        <div style={{fontSize: '14px', color: '#333'}}>
                                            <strong>{email}</strong> requested access to <strong>{note.title || 'Untitled'}</strong>
                                        </div>
                                        <div style={{display: 'flex', gap: '8px'}}>
                                            <button onClick={() => resolveRequest(note._id, email, true, 'viewer')} style={{padding: '6px 12px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500'}}>Approve (Viewer)</button>
                                            <button onClick={() => resolveRequest(note._id, email, true, 'editor')} style={{padding: '6px 12px', background: 'var(--accent-black)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500'}}>Approve (Editor)</button>
                                            <button onClick={() => resolveRequest(note._id, email, false)} style={{padding: '6px 12px', background: 'transparent', color: '#e53935', border: '1px solid #e53935', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500'}}>Deny</button>
                                        </div>
                                    </div>
                                ))
                            ))}
                        </div>
                    )}

                    <h1 className="page-title">Recent Notes</h1>
                    
                    <div className="notes-grid">
                        {notes.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon-wrapper">
                                    <FilePlus2 size={48} strokeWidth={1} />
                                </div>
                                <h3>No notes yet</h3>
                                <p>Create your first document to get started.</p>
                                <button className="btn-create-first" onClick={createNewNote}>
                                    <Plus size={18} />
                                    Create Document
                                </button>
                            </div>
                        ) : (
                            notes.map(note => (
                                <div 
                                    key={note._id} 
                                    className="note-card"
                                    onClick={() => navigate(`/note/${note._id}`)}
                                >
                                    <div className="note-card-body">
                                        <h3 className="note-title">
                                            {note.title || 'Untitled'}
                                            {note.creatorId !== JSON.parse(localStorage.getItem('user') || '{}').id && (
                                                <span className="badge-shared">Shared</span>
                                            )}
                                        </h3>
                                        <p className="note-preview">
                                            {note.content ? 
                                                (note.content.length > 120 ? 
                                                    note.content.substring(0, 120) + '...' : 
                                                    note.content) 
                                                : 'Empty document'}
                                        </p>
                                    </div>
                                    <div className="note-card-footer">
                                        <span className="note-date">{formatDate(note.updatedAt)}</span>
                                        <button 
                                            className="btn-delete"
                                            onClick={(e) => deleteNote(note._id, e)}
                                            title="Delete Note"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;