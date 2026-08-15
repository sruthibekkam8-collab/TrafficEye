const express = require('express');
const multer = require('multer');
const path = require('path');
const Datastore = require('nedb-promises');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Ensure folders exist for database and images
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');
if (!fs.existsSync('./database')) fs.mkdirSync('./database');

// Databases
const reportsDB = Datastore.create({ filename: 'database/reports.db', autoload: true });
const withdrawalsDB = Datastore.create({ filename: 'database/withdrawals.db', autoload: true });

app.use(express.json());
app.use(express.static(__dirname + '/../Frontend')); 
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, `evidence-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// API: Receive violation reports
app.post('/api/report', upload.single('evidence'), async (req, res) => {
    try {
        const { violationType, citizenId } = req.body;
        await reportsDB.insert({
            citizenId: citizenId || 'TE-882910',
            violationType,
            evidencePath: req.file ? req.file.path : null,
            status: 'Verified', 
            reward: 150.00,
            timestamp: new Date()
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// API: Get current reward totals
app.get('/api/stats/:citizenId', async (req, res) => {
    try {
        const reports = await reportsDB.find({ citizenId: req.params.citizenId });
        const incentive = reports.reduce((sum, r) => sum + r.reward, 0);
        res.json({ incentive: incentive.toFixed(2) });
    } catch (err) {
        res.status(500).json({ incentive: "0.00" });
    }
});

// API: Handle UPI Withdrawal Requests (NEW)
app.post('/api/withdraw', async (req, res) => {
    try {
        const { citizenId, upiId, amount } = req.body;

        // Save the request to the withdrawal database
        await withdrawalsDB.insert({
            citizenId,
            upiId,
            amount,
            status: 'Pending',
            timestamp: new Date()
        });

        console.log(`✅ Withdrawal Request Saved: ₹${amount} for ${upiId}`);
        res.json({ success: true, message: "Withdrawal request saved!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Database error" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`👉 Open http://localhost:${PORT}/dashboard.html`);
});
