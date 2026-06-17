import express from 'express';
import dotenv from 'dotenv';
import connectDB from './connectDB.js'
import morgan from 'morgan';
import cors from 'cors';
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { ObjectId } from 'mongodb';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(express.json())
app.use(morgan('dev'));
app.use(cors({ origin: allowedOrigins, credentials: true }));

const db = await connectDB();

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Map of room (noteId) -> Map(socket.id -> userData)
const roomUsers = new Map();

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-note', ({ noteId, user }) => {
        socket.join(`note-${noteId}`);
        socket.noteId = noteId; // Store for disconnect
        
        if (!roomUsers.has(noteId)) {
            roomUsers.set(noteId, new Map());
        }
        roomUsers.get(noteId).set(socket.id, user);
        
        io.to(`note-${noteId}`).emit('online-users', Array.from(roomUsers.get(noteId).values()));
        console.log(`User ${socket.id} joined note ${noteId}`);
    });

    socket.on('leave-note', (noteId) => {
        socket.leave(`note-${noteId}`);
        if (roomUsers.has(noteId)) {
            roomUsers.get(noteId).delete(socket.id);
            io.to(`note-${noteId}`).emit('online-users', Array.from(roomUsers.get(noteId).values()));
        }
        console.log(`User ${socket.id} left note ${noteId}`);
    });

    socket.on('note-update', async ({ noteId, title, content, userId }) => {
        try {
            await db.collection('notes').updateOne(
                { _id: new ObjectId(noteId) },
                { 
                    $set: { 
                        title, 
                        content, 
                        updatedAt: new Date() 
                    } 
                }
            );
            
            socket.to(`note-${noteId}`).emit('note-updated', { 
                noteId, 
                title, 
                content 
            });
        } catch (error) {
            console.error('Error updating note:', error);
        }
    });

    socket.on('disconnect', () => {
        if (socket.noteId && roomUsers.has(socket.noteId)) {
            roomUsers.get(socket.noteId).delete(socket.id);
            io.to(`note-${socket.noteId}`).emit('online-users', Array.from(roomUsers.get(socket.noteId).values()));
        }
        console.log('User disconnected:', socket.id);
    });
});

app.post('/auth/signup', async (req, res) =>{
    try {
        const body = req.body;
        const user = await db.collection('users').find({ email: body.email }).toArray();
        if (user.length) {
            res.status(409).json({ message: 'User already exists' });
            return;
        }
        let password = body.password;
        await bcrypt.hash(password, 3).then((hash) => {
            password = hash;
        })
        await db.collection('users').insertOne({ ...body, password });
        res.status(200).json({ message: 'Signup successful' });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Server error' });
    }
})

app.post('/auth/login', async (req, res) =>{
    try {
        const body = req.body;
        const user = await db.collection('users').find({ email: body.email }).toArray();
        if (!user.length) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        bcrypt.compare(body.password, user[0].password).then((result) => {
            if (!result) {
                res.status(401).json({ message: 'Wrong password entered' });
                return;
            }
            const payload = { 
                email: user[0].email, 
                id: user[0]._id.toString(), 
                isCreator: user[0].isCreator, 
                name: user[0].name 
            }
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2d' });
            res.status(200).json({ message: "Login successful", token, user: payload });
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Server error' });
    }
})

app.get('/notes', verifyToken, async (req, res) =>{
    try {
        const notes = await db.collection('notes')
            .find({ 
                $or: [
                    { creatorId: req.user.id },
                    { sharedWith: req.user.email }
                ]
            })
            .sort({ createdAt: -1 })
            .toArray();
        res.status(200).json({ notes });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/notes/:id', verifyToken, async (req, res) => {
    try {
        const note = await db.collection('notes').findOne({ 
            _id: new ObjectId(req.params.id) 
        });
        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }
        
        // Ensure user has access
        const hasAccess = note.creatorId === req.user.id || (note.sharedWith && note.sharedWith.includes(req.user.email));
        if (!hasAccess) {
             return res.status(403).json({ message: 'Not authorized to view this note' });
        }
        
        res.status(200).json({ note });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/notes', verifyToken, async (req, res) => {
    try {
        const { title, content } = req.body;
        const newNote = {
            title: title || 'Untitled Note',
            content: content || '',
            creatorId: req.user.id,
            creatorName: req.user.name,
            sharedWith: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const result = await db.collection('notes').insertOne(newNote);
        newNote._id = result.insertedId;
        res.status(201).json({ message: 'Note created', note: newNote });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/notes/:id/share', verifyToken, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        
        const note = await db.collection('notes').findOne({ 
            _id: new ObjectId(req.params.id) 
        });
        
        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }
        
        if (note.creatorId !== req.user.id) {
            return res.status(403).json({ message: 'Only the creator can share this note' });
        }
        
        // Avoid adding the creator's own email or duplicates
        if (email === req.user.email || (note.sharedWith && note.sharedWith.includes(email))) {
            return res.status(400).json({ message: 'User is already added' });
        }
        
        await db.collection('notes').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $addToSet: { sharedWith: email } }
        );
        
        res.status(200).json({ message: `Successfully shared with ${email}` });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.delete('/notes/:id', verifyToken, async (req, res) => {
    try {
        const note = await db.collection('notes').findOne({ 
            _id: new ObjectId(req.params.id) 
        });
        
        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }
        
        if (note.creatorId !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this note' });
        }
        
        await db.collection('notes').deleteOne({ _id: new ObjectId(req.params.id) });
        res.status(200).json({ message: 'Note deleted' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error' });
    }
});

httpServer.listen(process.env.PORT, () => {
    console.log("App is running now..");
});