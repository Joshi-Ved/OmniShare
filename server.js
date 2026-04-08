const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the static frontend (Your Stitch HTML App)
app.use(express.static(path.join(__dirname, 'stitch/app')));

// ── ADMIN & BACKEND API ENDPOINTS ───────────────────

// 1. Razorpay Order Creation
// The frontend checkout.html will call this securely instead of hardcoding keys
app.post('/api/create-order', async (req, res) => {
    try {
        const { amount, item_id } = req.body;
        // Logic to construct Razorpay order (backend to backend)
        // const order = await razorpayInstance.orders.create({ amount: amount*100, currency: "INR" });
        return res.json({
            success: true,
            order_id: "order_mock123",
            amount: amount,
            currency: "INR"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Admin Dashboard Live Stats (replacement for the simulated JS in admin.html)
app.get('/api/admin/metrics', (req, res) => {
    res.json({
        totalRevenue: 3450000,
        activeRentals: 42,
        pendingKYC: 15,
        newSignupsToday: 8
    });
});

// 3. Admin KYC DigiLocker Webhook receiver
app.post('/api/admin/kyc-webhook', (req, res) => {
    const payload = req.body;
    console.log("DigiLocker Verification Update received:", payload);
    // Here you would trigger WebSockets to update admin.html live
    res.sendStatus(200);
});

// ── FALLBACK ROUTING ───────────────────────────────

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'stitch/app', 'landing.html'));
});

// Catch-all (allows URLs like /plans instead of /plans.html)
app.get('/:page', (req, res) => {
    const page = req.params.page;
    if (!page.includes('.')) {
        res.sendFile(path.join(__dirname, 'stitch/app', `${page}.html`));
    } else {
        res.status(404).send('Not Found');
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 OmniShare Backend & Admin Server running at http://localhost:${PORT}`);
    console.log(`- Dashboard: http://localhost:${PORT}/admin.html`);
    console.log(`- API: http://localhost:${PORT}/api/admin/metrics`);
});
