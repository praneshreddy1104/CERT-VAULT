const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads folder
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Serve static files
app.use('/uploads', express.static('uploads'));

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/certvault')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// ========== SCHEMAS ==========
const UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String
});

const CertificateSchema = new mongoose.Schema({
    userId: String,
    certificateName: String,
    issuedBy: String,
    issueDate: String,
    fileUrl: String,
    fileName: String,
    uploadedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Certificate = mongoose.model('Certificate', CertificateSchema);

// ========== MULTER SETUP ==========
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// ========== AUTH MIDDLEWARE ==========
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, 'secret123');
        const user = await User.findById(decoded.userId);
        if (!user) throw new Error();
        req.userId = decoded.userId;
        next();
    } catch (e) {
        res.status(401).json({ message: 'Please login' });
    }
};

// ========== ROUTES ==========

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'Server running' });
});

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashed = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashed });
        await user.save();
        const token = jwt.sign({ userId: user._id }, 'secret123');
        res.json({ token, user: { id: user._id, username, email } });
    } catch (e) {
        res.status(400).json({ message: 'Error' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) throw new Error();
        const match = await bcrypt.compare(password, user.password);
        if (!match) throw new Error();
        const token = jwt.sign({ userId: user._id }, 'secret123');
        res.json({ token, user: { id: user._id, username: user.username, email } });
    } catch (e) {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

// ========== UPLOAD ROUTE - FIXED ==========
app.post('/api/upload', auth, upload.single('certificate'), async (req, res) => {
    console.log('🔥 UPLOAD ROUTE HIT!');
    console.log('File:', req.file);
    console.log('Body:', req.body);
    
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file' });
        }
        
        const { certificateName, issuedBy, issueDate } = req.body;
        
        const cert = new Certificate({
            userId: req.userId,
            certificateName,
            issuedBy,
            issueDate,
            fileUrl: `http://localhost:5000/uploads/${req.file.filename}`,
            fileName: req.file.originalname
        });
        
        await cert.save();
        
        res.json({ 
            message: '✅ Upload success!',
            certificate: cert 
        });
        
    } catch (e) {
        console.log('Error:', e);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get certificates
app.get('/api/certificates', auth, async (req, res) => {
    const certs = await Certificate.find({ userId: req.userId });
    res.json(certs);
});

// Delete certificate
app.delete('/api/certificates/:id', auth, async (req, res) => {
    await Certificate.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});

// ========== START ==========
app.listen(5000, () => {
    console.log('✅ Server on http://localhost:5000');
    console.log('📌 Upload URL: http://localhost:5000/api/upload');
});