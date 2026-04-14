const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dbPath = path.join(__dirname, 'omnishare_backend', 'db.sqlite3');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Failed to open SQLite database:', err.message);
        return;
    }
    console.log('SQLite connected:', dbPath);
});

function runSql(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

function allSql(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
}

function getSql(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(row);
        });
    });
}

function normalizeListingStatus(status) {
    if (!status) return status;
    const value = String(status).toLowerCase();
    if (value === 'rented') return 'sold_out';
    return value;
}

function generateRef(prefix) {
    return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function daysBetweenInclusive(startDate, endDate) {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
        return 1;
    }
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.max(1, Math.floor((end - start) / oneDay) + 1);
}

async function ensureColumn(tableName, columnName, columnDefinition) {
    const columns = await allSql(`PRAGMA table_info(${tableName})`);
    const exists = columns.some((column) => column.name === columnName);
    if (!exists) {
        await runSql(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
    }
}

function formatDateLabel(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

async function initializeDatabase() {
    await runSql(`
        CREATE TABLE IF NOT EXISTS listing_reviews (
            id TEXT PRIMARY KEY,
            listing_id TEXT NOT NULL,
            listing_title TEXT NOT NULL,
            host_email TEXT NOT NULL,
            reviewer_name TEXT NOT NULL,
            reviewer_email TEXT NOT NULL,
            rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
            comment TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    `);
    await runSql('CREATE INDEX IF NOT EXISTS idx_listing_reviews_host_email ON listing_reviews(host_email)');
    await runSql('CREATE INDEX IF NOT EXISTS idx_listing_reviews_created_at ON listing_reviews(created_at DESC)');

    await runSql(`
        CREATE TABLE IF NOT EXISTS erp_bookings (
            id TEXT PRIMARY KEY,
            listing_id TEXT,
            renter TEXT NOT NULL,
            email TEXT NOT NULL,
            listing TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            status TEXT NOT NULL,
            amount INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `);

    await runSql(`
        CREATE TABLE IF NOT EXISTS erp_listings (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            category TEXT NOT NULL,
            status TEXT NOT NULL,
            item_condition TEXT NOT NULL,
            host TEXT NOT NULL,
            host_email TEXT DEFAULT '',
            price_per_day INTEGER DEFAULT 1000,
            deposit INTEGER DEFAULT 0,
            image_url TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `);

    await runSql(`
        CREATE TABLE IF NOT EXISTS erp_disputes (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            parties TEXT NOT NULL,
            issue TEXT NOT NULL,
            status TEXT NOT NULL,
            priority TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `);

    await ensureColumn('erp_bookings', 'listing_id', "TEXT DEFAULT ''");
    await ensureColumn('erp_listings', 'description', "TEXT DEFAULT ''");
    await ensureColumn('erp_listings', 'host_email', "TEXT DEFAULT ''");
    await ensureColumn('erp_listings', 'price_per_day', 'INTEGER DEFAULT 1000');
    await ensureColumn('erp_listings', 'deposit', 'INTEGER DEFAULT 0');
    await ensureColumn('erp_listings', 'image_url', "TEXT DEFAULT ''");
    await ensureColumn('erp_listings', 'created_at', "TEXT DEFAULT ''");
}

async function seedErpDataIfEmpty() {
    const bookingsCount = await getSql('SELECT COUNT(*) AS count FROM erp_bookings');
    if ((bookingsCount?.count || 0) === 0) {
        const now = new Date().toISOString();
        const rows = [
            ['BK001', 'Ananya M.', 'ananya.m@studio.in', 'Sony FX3', '2026-04-14', '2026-04-18', 'active', 15000, now, now],
            ['BK002', 'Rohit V.', 'rohit.v@capture.in', 'DJI Mavic 3', '2026-04-10', '2026-04-16', 'active', 8500, now, now],
            ['BK003', 'Meera S.', 'meera.s@adworks.co', 'Aputure Light', '2026-04-20', '2026-04-22', 'pending', 12000, now, now],
            ['BK004', 'Karan G.', 'karan.g@focuslab.in', 'Canon RF 50mm', '2026-04-05', '2026-04-09', 'returned', 3500, now, now],
            ['BK005', 'Nisha R.', 'nisha.r@podverse.in', 'Zoom H6', '2026-03-28', '2026-04-03', 'closed', 2800, now, now],
            ['BK006', 'Dev A.', 'dev.a@videoedge.in', 'DJI Ronin', '2026-04-12', '2026-04-25', 'active', 9500, now, now],
        ];
        for (const row of rows) {
            await runSql('INSERT INTO erp_bookings (id, renter, email, listing, start_date, end_date, status, amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', row);
        }
    }

    const listingsCount = await getSql('SELECT COUNT(*) AS count FROM erp_listings');
    if ((listingsCount?.count || 0) === 0) {
        const now = new Date().toISOString();
        const rows = [
            ['cam_fx3_001', 'Sony FX3 Cinema Camera', 'Premium full-frame cinema camera body', 'Cameras', 'sold_out', 'Excellent', 'Julian R.', 'julian.r@lens.co', 20500, 42000, '', now, now],
            ['drone_m3_002', 'DJI Mavic 3 Pro Drone', 'Professional drone with 5.1K recording', 'Drones', 'sold_out', 'Good', 'Julian R.', 'julian.r@lens.co', 9000, 12000, '', now, now],
            ['light_apu_003', 'Aputure 300D Light Kit', 'Complete lighting package for studio and set', 'Lighting', 'available', 'Excellent', 'Elena R.', 'elena.r@lens.co', 4000, 6000, '', now, now],
            ['lens_rf50_004', 'Canon RF 50mm Lens', 'Fast prime lens with high optical clarity', 'Lenses', 'available', 'Excellent', 'Elena R.', 'elena.r@lens.co', 3500, 5000, '', now, now],
            ['audio_zoom_005', 'Zoom H6 Audio Recorder', 'Field recorder kit with accessories', 'Audio', 'maintenance', 'Needs Repair', 'Marcus S.', 'marcus.s@lens.co', 2500, 3000, '', now, now],
            ['rig_ronin_006', 'DJI Ronin Stabilizer', '3-axis stabilizer for mirrorless cinema rigs', 'Stabilizers', 'sold_out', 'Good', 'Marcus S.', 'marcus.s@lens.co', 5500, 9000, '', now, now],
        ];
        for (const row of rows) {
            await runSql('INSERT INTO erp_listings (id, title, description, category, status, item_condition, host, host_email, price_per_day, deposit, image_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', row);
        }
    }

    const disputesCount = await getSql('SELECT COUNT(*) AS count FROM erp_disputes');
    if ((disputesCount?.count || 0) === 0) {
        const now = new Date().toISOString();
        const rows = [
            ['DSP001', 'Damage Claim', 'Renter vs Host', 'Lens scratched', 'open', 'high', now],
            ['DSP002', 'Late Return', 'Renter vs Host', 'Item returned 6 hours late', 'pending', 'medium', now],
            ['DSP003', 'Non-Return', 'Host vs Renter', 'Booking item not returned', 'open', 'high', now],
            ['DSP004', 'Quality Issue', 'Renter vs Host', 'Item did not match description', 'resolved', 'low', now],
        ];
        for (const row of rows) {
            await runSql('INSERT INTO erp_disputes (id, type, parties, issue, status, priority, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', row);
        }
    }
}

initializeDatabase()
    .then(() => seedErpDataIfEmpty())
    .catch((error) => {
        console.error('Database initialization failed:', error.message);
    });

app.use(express.static(path.join(__dirname, 'stitch/app')));

app.post('/api/create-order', async (req, res) => {
    try {
        const { amount } = req.body;
        return res.json({ success: true, order_id: 'order_mock123', amount, currency: 'INR' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/metrics', (req, res) => {
    res.json({ totalRevenue: 3450000, activeRentals: 42, pendingKYC: 15, newSignupsToday: 8 });
});

app.post('/api/admin/kyc-webhook', (req, res) => {
    console.log('DigiLocker Verification Update received:', req.body);
    res.sendStatus(200);
});

app.post('/api/reviews/submit', async (req, res) => {
    try {
        const { listing_id, listing_title, host_email, reviewer_name, reviewer_email, rating, comment } = req.body;
        if (!listing_id || !listing_title || !host_email || !reviewer_name || !reviewer_email || !rating || !comment) {
            return res.status(400).json({ success: false, error: 'Missing required review fields' });
        }

        const parsedRating = Number(rating);
        if (Number.isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return res.status(400).json({ success: false, error: 'Rating must be a number between 1 and 5' });
        }

        const review = {
            id: `rev_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            listing_id,
            listing_title,
            host_email: String(host_email).toLowerCase(),
            reviewer_name,
            reviewer_email: String(reviewer_email).toLowerCase(),
            rating: parsedRating,
            comment,
            created_at: new Date().toISOString(),
        };

        await runSql(
            'INSERT INTO listing_reviews (id, listing_id, listing_title, host_email, reviewer_name, reviewer_email, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [review.id, review.listing_id, review.listing_title, review.host_email, review.reviewer_name, review.reviewer_email, review.rating, review.comment, review.created_at]
        );

        return res.json({ success: true, message: 'Review submitted and shared with admin and listing owner', routed_to_admin: true, routed_to_host: true, review });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/listings/public', async (req, res) => {
    try {
        const requestedStatus = String(req.query.status || '').toLowerCase();
        const params = [];
        let query = 'SELECT id, title, description, category, status, item_condition AS condition, host, host_email, price_per_day, deposit, image_url, created_at, updated_at FROM erp_listings';

        if (requestedStatus) {
            query += ' WHERE lower(status) = ?';
            params.push(requestedStatus);
        } else {
            query += " WHERE lower(status) IN ('available', 'sold_out', 'rented')";
        }

        query += ' ORDER BY datetime(updated_at) DESC';
        const rows = await allSql(query, params);
        const results = rows.map((row) => ({ ...row, status: normalizeListingStatus(row.status) }));
        return res.json({ success: true, count: results.length, results });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/listings/:id', async (req, res) => {
    try {
        const listing = await getSql('SELECT id, title, description, category, status, item_condition AS condition, host, host_email, price_per_day, deposit, image_url, created_at, updated_at FROM erp_listings WHERE id = ?', [req.params.id]);
        if (!listing) {
            return res.status(404).json({ success: false, error: 'Listing not found' });
        }
        return res.json({ success: true, listing: { ...listing, status: normalizeListingStatus(listing.status) } });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/listings', async (req, res) => {
    try {
        const title = String(req.body.title || '').trim();
        const description = String(req.body.description || '').trim();
        const category = String(req.body.category || '').trim();
        const condition = String(req.body.condition || 'Excellent').trim();
        const host = String(req.body.host || '').trim();
        const hostEmail = String(req.body.host_email || '').trim().toLowerCase();
        const pricePerDay = Number(req.body.price_per_day || 0);
        const deposit = Number(req.body.deposit || 0);
        const imageUrl = String(req.body.image_url || '').trim();

        if (!title || !category || !host || !hostEmail || !Number.isFinite(pricePerDay) || pricePerDay <= 0) {
            return res.status(400).json({ success: false, error: 'title, category, host, host_email and valid price_per_day are required' });
        }

        const id = `lst_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const now = new Date().toISOString();
        await runSql(
            'INSERT INTO erp_listings (id, title, description, category, status, item_condition, host, host_email, price_per_day, deposit, image_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, title, description, category, 'pending_approval', condition, host, hostEmail, Math.round(pricePerDay), Math.max(0, Math.round(deposit)), imageUrl, now, now]
        );

        return res.status(201).json({
            success: true,
            message: 'Listing submitted for admin review',
            listing: {
                id,
                title,
                description,
                category,
                status: 'pending_approval',
                condition,
                host,
                host_email: hostEmail,
                price_per_day: Math.round(pricePerDay),
                deposit: Math.max(0, Math.round(deposit)),
                image_url: imageUrl,
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/host/listings', async (req, res) => {
    const email = String(req.query.email || '').toLowerCase();
    if (!email) {
        return res.status(400).json({ success: false, error: 'email query parameter is required' });
    }
    try {
        const rows = await allSql('SELECT id, title, description, category, status, item_condition AS condition, host, host_email, price_per_day, deposit, image_url, created_at, updated_at FROM erp_listings WHERE host_email = ? ORDER BY datetime(created_at) DESC', [email]);
        const results = rows.map((row) => ({ ...row, status: normalizeListingStatus(row.status) }));
        return res.json({ success: true, count: results.length, results });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/bookings/create', async (req, res) => {
    const listingId = String(req.body.listing_id || '').trim();
    const renterName = String(req.body.renter_name || 'Guest Renter').trim();
    const renterEmail = String(req.body.renter_email || 'guest@example.com').trim().toLowerCase();
    const startDate = String(req.body.start_date || '').trim();
    const endDate = String(req.body.end_date || '').trim();

    if (!listingId) {
        return res.status(400).json({ success: false, error: 'listing_id is required' });
    }

    try {
        const listing = await getSql('SELECT * FROM erp_listings WHERE id = ?', [listingId]);
        if (!listing) {
            return res.status(404).json({ success: false, error: 'Listing not found' });
        }

        const currentStatus = normalizeListingStatus(listing.status);
        if (currentStatus !== 'available') {
            return res.status(409).json({ success: false, error: 'Listing is not available (already sold out or unavailable)' });
        }

        const now = new Date();
        const defaultStart = now.toISOString().slice(0, 10);
        const defaultEndDate = new Date(now);
        defaultEndDate.setDate(defaultEndDate.getDate() + 2);
        const normalizedStart = startDate || defaultStart;
        const normalizedEnd = endDate || defaultEndDate.toISOString().slice(0, 10);
        const bookingDays = daysBetweenInclusive(normalizedStart, normalizedEnd);
        const amount = Math.max(0, Math.round((Number(listing.price_per_day) || 0) * bookingDays));

        const bookingId = `BK${String(Math.floor(Math.random() * 9000) + 1000)}`;
        const createdAt = new Date().toISOString();

        await runSql('BEGIN TRANSACTION');
        await runSql(
            'INSERT INTO erp_bookings (id, listing_id, renter, email, listing, start_date, end_date, status, amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [bookingId, listing.id, renterName, renterEmail, listing.title, normalizedStart, normalizedEnd, 'active', amount, createdAt, createdAt]
        );
        await runSql('UPDATE erp_listings SET status = ?, updated_at = ? WHERE id = ?', ['sold_out', createdAt, listing.id]);
        await runSql('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Booking created and listing marked as sold out',
            booking: {
                id: bookingId,
                listing_id: listing.id,
                listing: listing.title,
                renter: renterName,
                email: renterEmail,
                start_date: normalizedStart,
                end_date: normalizedEnd,
                status: 'active',
                amount,
            },
        });
    } catch (error) {
        await runSql('ROLLBACK').catch(() => undefined);
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/admin/listing-reviews', async (req, res) => {
    try {
        const results = await allSql('SELECT id, listing_id, listing_title, host_email, reviewer_name, reviewer_email, rating, comment, created_at FROM listing_reviews ORDER BY datetime(created_at) DESC');
        return res.json({ success: true, count: results.length, results });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/host/listing-reviews', async (req, res) => {
    const email = String(req.query.email || '').toLowerCase();
    if (!email) {
        return res.status(400).json({ success: false, error: 'email query parameter is required' });
    }
    try {
        const results = await allSql('SELECT id, listing_id, listing_title, host_email, reviewer_name, reviewer_email, rating, comment, created_at FROM listing_reviews WHERE host_email = ? ORDER BY datetime(created_at) DESC', [email]);
        return res.json({ success: true, count: results.length, results });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/admin/bookings', async (req, res) => {
    try {
        const results = await allSql('SELECT id, listing_id, renter, email, listing, start_date, end_date, status, amount, created_at, updated_at FROM erp_bookings ORDER BY datetime(created_at) DESC');
        return res.json({
            success: true,
            count: results.length,
            results: results.map((booking) => ({ ...booking, dates: `${formatDateLabel(booking.start_date)} - ${formatDateLabel(booking.end_date)}` })),
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/admin/bookings/:id/action', async (req, res) => {
    try {
        const { id } = req.params;
        const action = String(req.body.action || '').toLowerCase();
        const booking = await getSql('SELECT * FROM erp_bookings WHERE id = ?', [id]);
        if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

        let nextStatus = booking.status;
        let nextEndDate = booking.end_date;
        if ((action === 'approve' || action === 'confirm') && booking.status === 'pending') nextStatus = 'active';
        else if (action === 'reject' && booking.status === 'pending') nextStatus = 'closed';
        else if (action === 'mark-returned' && booking.status === 'active') nextStatus = 'returned';
        else if (action === 'extend-rental' && booking.status === 'active') {
            const date = new Date(`${booking.end_date}T00:00:00`);
            date.setDate(date.getDate() + 2);
            nextEndDate = date.toISOString().slice(0, 10);
        } else if (action === 'close-booking' && (booking.status === 'returned' || booking.status === 'active')) {
            nextStatus = 'closed';
        } else {
            return res.status(400).json({ success: false, error: 'Invalid action for current booking status' });
        }

        const now = new Date().toISOString();
        await runSql('UPDATE erp_bookings SET status = ?, end_date = ?, updated_at = ? WHERE id = ?', [nextStatus, nextEndDate, now, id]);

        if (booking.listing_id) {
            if (nextStatus === 'active') {
                await runSql('UPDATE erp_listings SET status = ?, updated_at = ? WHERE id = ?', ['sold_out', now, booking.listing_id]);
            }
            if (nextStatus === 'returned' || nextStatus === 'closed') {
                await runSql('UPDATE erp_listings SET status = ?, updated_at = ? WHERE id = ? AND status != ?', ['available', now, booking.listing_id, 'damaged']);
            }
            if (action === 'reject') {
                await runSql('UPDATE erp_listings SET status = ?, updated_at = ? WHERE id = ?', ['available', now, booking.listing_id]);
            }
        }

        return res.json({ success: true, message: `Booking ${id} updated` });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/admin/listings', async (req, res) => {
    try {
        const results = await allSql('SELECT id, title, description, category, status, item_condition AS condition, host, host_email, price_per_day, deposit, updated_at, created_at FROM erp_listings ORDER BY datetime(updated_at) DESC');
        return res.json({ success: true, count: results.length, results: results.map((row) => ({ ...row, status: normalizeListingStatus(row.status) })) });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/admin/listings/:id/action', async (req, res) => {
    try {
        const { id } = req.params;
        const action = String(req.body.action || '').toLowerCase();
        const listing = await getSql('SELECT * FROM erp_listings WHERE id = ?', [id]);
        if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });

        const normalizedCurrent = normalizeListingStatus(listing.status);
        let nextStatus = normalizedCurrent;
        if (action === 'mark-available' || action === 'approve' || action === 'relist') nextStatus = 'available';
        else if (action === 'mark-maintenance') nextStatus = 'maintenance';
        else if (action === 'mark-damaged') nextStatus = 'damaged';
        else if (action === 'mark-sold-out' || action === 'mark-rented') nextStatus = 'sold_out';
        else if (action === 'reject') nextStatus = 'rejected';
        else return res.status(400).json({ success: false, error: 'Unsupported listing action' });

        await runSql('UPDATE erp_listings SET status = ?, updated_at = ? WHERE id = ?', [nextStatus, new Date().toISOString(), id]);
        return res.json({ success: true, message: `Listing ${id} updated` });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/admin/disputes', async (req, res) => {
    try {
        const results = await allSql('SELECT id, type, parties, issue, status, priority, updated_at FROM erp_disputes ORDER BY datetime(updated_at) DESC');
        return res.json({ success: true, count: results.length, results });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/admin/disputes/:id/action', async (req, res) => {
    try {
        const { id } = req.params;
        const action = String(req.body.action || '').toLowerCase();
        const dispute = await getSql('SELECT * FROM erp_disputes WHERE id = ?', [id]);
        if (!dispute) return res.status(404).json({ success: false, error: 'Dispute not found' });

        let nextStatus = dispute.status;
        if (action === 'resolve') nextStatus = 'resolved';
        else if (action === 'reopen') nextStatus = 'open';
        else return res.status(400).json({ success: false, error: 'Unsupported dispute action' });

        await runSql('UPDATE erp_disputes SET status = ?, updated_at = ? WHERE id = ?', [nextStatus, new Date().toISOString(), id]);
        return res.json({ success: true, message: `Dispute ${id} updated` });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'stitch/app', 'landing.html'));
});

app.get('/:page', (req, res) => {
    const page = req.params.page;
    if (!page.includes('.')) {
        res.sendFile(path.join(__dirname, 'stitch/app', `${page}.html`));
    } else {
        res.status(404).send('Not Found');
    }
});

app.listen(PORT, () => {
    console.log(`\n?? OmniShare Backend & Admin Server running at http://localhost:${PORT}`);
    console.log(`- Dashboard: http://localhost:${PORT}/admin.html`);
    console.log(`- API: http://localhost:${PORT}/api/admin/metrics`);
});
