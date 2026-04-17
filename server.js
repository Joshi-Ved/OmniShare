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
    if (value === 'approved' || value === 'published' || value === 'active') return 'available';
    return value;
}

function generateRef(prefix) {
    return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}

const TEST_USER_ACCOUNTS = [
    { email: 'admin.test@omnishare.local', name: 'Admin Test', password: 'Admin@12345', role: 'admin', kyc_status: 'verified' },
    { email: 'host.test@omnishare.local', name: 'Host Test', password: 'Host@12345', role: 'host', kyc_status: 'verified' },
    { email: 'guest.test@omnishare.local', name: 'Guest Test', password: 'Guest@12345', role: 'guest', kyc_status: 'pending' },
    { email: 'both.test@omnishare.local', name: 'Both Test User', password: 'Both@12345', role: 'both', kyc_status: 'verified' },
];

function titleCaseRole(role) {
    const value = String(role || 'guest').trim().toLowerCase();
    if (!value) return 'Guest';
    if (value === 'both') return 'Host + Guest';
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function sanitizeRole(role) {
    const value = String(role || 'guest').trim().toLowerCase();
    if (value === 'admin' || value === 'host' || value === 'guest' || value === 'both') {
        return value;
    }
    return 'guest';
}

function createRewardId() {
    return `rw_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function getSubscriptionConfig(tier) {
    const normalizedTier = normalizeEmail(tier);
    if (normalizedTier === 'pro') {
        return {
            tier: 'pro',
            status: 'active',
            plan_name: 'OmniShare Pro Membership',
            billing_cycle: 'Monthly',
            monthly_fee: 299,
        };
    }

    if (normalizedTier === 'free-trial' || normalizedTier === 'trial') {
        return {
            tier: 'free-trial',
            status: 'trial',
            plan_name: 'OmniShare Free Trial',
            billing_cycle: '14-day trial',
            monthly_fee: 0,
        };
    }

    if (normalizedTier === 'plus') {
        return {
            tier: 'plus',
            status: 'active',
            plan_name: 'OmniShare Plus Membership',
            billing_cycle: 'Monthly',
            monthly_fee: 199,
        };
    }

    return {
        tier: 'free',
        status: 'free',
        plan_name: 'Free Plan',
        billing_cycle: 'None',
        monthly_fee: 0,
    };
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

async function ensureRewardProfile(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
        return null;
    }

    const existing = await getSql('SELECT email, loyalty_coins, total_earned, updated_at FROM user_rewards WHERE email = ?', [normalizedEmail]);
    if (existing) {
        return existing;
    }

    const now = new Date().toISOString();
    await runSql(
        'INSERT INTO user_rewards (email, loyalty_coins, total_earned, updated_at) VALUES (?, ?, ?, ?)',
        [normalizedEmail, 0, 0, now]
    );

    return {
        email: normalizedEmail,
        loyalty_coins: 0,
        total_earned: 0,
        updated_at: now,
    };
}

async function createRewardNotification({ email, title, message, coinAmount = 0, source = 'system', reference = '' }) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
        return null;
    }

    const now = new Date().toISOString();
    const notification = {
        id: createRewardId(),
        email: normalizedEmail,
        title: String(title || 'Reward update').trim(),
        message: String(message || '').trim(),
        source: String(source || 'system').trim(),
        coin_amount: Math.max(0, Math.round(Number(coinAmount) || 0)),
        is_read: 0,
        is_opened: 0,
        is_claimed: 0,
        reference: String(reference || '').trim(),
        created_at: now,
        updated_at: now,
        claimed_at: null,
    };

    await runSql(
        'INSERT INTO user_reward_notifications (id, email, title, message, source, coin_amount, is_read, is_opened, is_claimed, reference, created_at, updated_at, claimed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
            notification.id,
            notification.email,
            notification.title,
            notification.message,
            notification.source,
            notification.coin_amount,
            notification.is_read,
            notification.is_opened,
            notification.is_claimed,
            notification.reference,
            notification.created_at,
            notification.updated_at,
            notification.claimed_at,
        ]
    );

    return notification;
}

async function awardCoins({ email, amount, title, message, source, reference }) {
    const normalizedEmail = normalizeEmail(email);
    const coinAmount = Math.max(0, Math.round(Number(amount) || 0));
    if (!normalizedEmail || coinAmount <= 0) {
        return null;
    }

    await ensureRewardProfile(normalizedEmail);
    return createRewardNotification({
        email: normalizedEmail,
        title,
        message,
        coinAmount,
        source,
        reference,
    });
}

async function getRewardSummary(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
        return null;
    }

    const profile = await ensureRewardProfile(normalizedEmail);
    const notifications = await allSql(
        'SELECT id, email, title, message, source, coin_amount, is_read, is_opened, is_claimed, reference, created_at, updated_at, claimed_at FROM user_reward_notifications WHERE email = ? ORDER BY datetime(created_at) DESC',
        [normalizedEmail]
    );

    const pendingCoins = notifications.reduce((total, notification) => total + (notification.is_claimed ? 0 : Number(notification.coin_amount) || 0), 0);
    const unreadCount = notifications.filter((notification) => !notification.is_read).length;

    return {
        profile,
        notifications,
        pendingCoins,
        unreadCount,
    };
}

async function ensureSubscriptionProfile(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
        return null;
    }

    const existing = await getSql(
        'SELECT email, tier, status, plan_name, billing_cycle, activated_at, next_billing_at, reference, source, updated_at FROM user_subscriptions WHERE email = ?',
        [normalizedEmail]
    );

    if (existing) {
        return existing;
    }

    const now = new Date().toISOString();
    const fallback = getSubscriptionConfig('free');
    await runSql(
        'INSERT INTO user_subscriptions (email, tier, status, plan_name, billing_cycle, activated_at, next_billing_at, reference, source, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [normalizedEmail, fallback.tier, fallback.status, fallback.plan_name, fallback.billing_cycle, now, null, '', 'system', now]
    );

    return {
        email: normalizedEmail,
        tier: fallback.tier,
        status: fallback.status,
        plan_name: fallback.plan_name,
        billing_cycle: fallback.billing_cycle,
        activated_at: now,
        next_billing_at: null,
        reference: '',
        source: 'system',
        updated_at: now,
    };
}

async function ensureUserAccount(email, profile = {}) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
        return null;
    }

    const existing = await getSql(
        'SELECT email, name, role, kyc_status, joined_at, is_test_user, updated_at FROM user_accounts WHERE email = ?',
        [normalizedEmail]
    );
    if (existing) {
        return existing;
    }

    const now = new Date().toISOString();
    const defaultName = String(profile.name || '').trim() || normalizedEmail.split('@')[0];
    const role = sanitizeRole(profile.role);
    const kycStatus = String(profile.kyc_status || 'pending').trim().toLowerCase() || 'pending';
    const isTestUser = profile.is_test_user ? 1 : 0;
    const password = String(profile.password || '').trim();

    await runSql(
        'INSERT INTO user_accounts (email, name, password, role, kyc_status, joined_at, is_test_user, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [normalizedEmail, defaultName, password, role, kycStatus, now, isTestUser, now]
    );

    return {
        email: normalizedEmail,
        name: defaultName,
        role,
        kyc_status: kycStatus,
        joined_at: now,
        is_test_user: isTestUser,
        updated_at: now,
    };
}

async function upsertSubscription({ email, tier, reference = '', source = 'web', activatedAt = '', nextBillingAt = null }) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
        return null;
    }

    const config = getSubscriptionConfig(tier);
    const now = new Date().toISOString();
    await ensureUserAccount(normalizedEmail);
    const existing = await ensureSubscriptionProfile(normalizedEmail);
    const activeAt = activatedAt || existing?.activated_at || now;
    const nextBilling = nextBillingAt || (config.tier === 'free-trial' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() : config.tier === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());

    await runSql(
        'UPDATE user_subscriptions SET tier = ?, status = ?, plan_name = ?, billing_cycle = ?, activated_at = ?, next_billing_at = ?, reference = ?, source = ?, updated_at = ? WHERE email = ?',
        [config.tier, config.status, config.plan_name, config.billing_cycle, activeAt, nextBilling, String(reference || '').trim(), String(source || 'web').trim(), now, normalizedEmail]
    );

    return {
        email: normalizedEmail,
        tier: config.tier,
        status: config.status,
        plan_name: config.plan_name,
        billing_cycle: config.billing_cycle,
        activated_at: activeAt,
        next_billing_at: nextBilling,
        reference: String(reference || '').trim(),
        source: String(source || 'web').trim(),
        updated_at: now,
        monthly_fee: config.monthly_fee,
    };
}

async function createUserAccount({ email, password, role = 'guest', name = '', kycStatus = 'pending', isTestUser = 0 }) {
    const normalizedEmail = normalizeEmail(email);
    const rawPassword = String(password || '').trim();
    const userName = String(name || '').trim();
    if (!normalizedEmail || !rawPassword || !userName) {
        return { error: 'name, email and password are required', status: 400 };
    }
    if (!normalizedEmail.includes('@')) {
        return { error: 'Invalid email address', status: 400 };
    }
    if (rawPassword.length < 8) {
        return { error: 'Password must be at least 8 characters', status: 400 };
    }

    const roleValue = sanitizeRole(role);
    const existing = await getSql('SELECT email FROM user_accounts WHERE email = ?', [normalizedEmail]);
    if (existing) {
        return { error: 'User already exists', status: 409 };
    }

    const now = new Date().toISOString();
    await runSql(
        'INSERT INTO user_accounts (email, name, password, role, kyc_status, joined_at, is_test_user, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [normalizedEmail, userName, rawPassword, roleValue, String(kycStatus || 'pending').trim().toLowerCase(), now, Number(isTestUser) ? 1 : 0, now]
    );

    await ensureRewardProfile(normalizedEmail);
    const subscription = await ensureSubscriptionProfile(normalizedEmail);
    const user = await getSql(
        'SELECT email, name, role, kyc_status, joined_at, is_test_user, updated_at FROM user_accounts WHERE email = ?',
        [normalizedEmail]
    );

    return { user, subscription };
}

async function getSubscriptionDashboardData() {
    const rows = await allSql(
        'SELECT email, tier, status, plan_name, billing_cycle, activated_at, next_billing_at, reference, source, updated_at FROM user_subscriptions ORDER BY datetime(updated_at) DESC'
    );

    const summary = rows.reduce(
        (accumulator, row) => {
            const fee = getSubscriptionConfig(row.tier).monthly_fee;
            accumulator.total += 1;
            accumulator.mrr += fee;
            if (row.status === 'trial') accumulator.trial += 1;
            else if (row.status === 'active') accumulator.active += 1;
            else accumulator.free += 1;
            return accumulator;
        },
        { total: 0, active: 0, trial: 0, free: 0, mrr: 0 }
    );

    return { rows, summary };
}

async function claimRewardNotification(notificationId) {
    const notification = await getSql(
        'SELECT id, email, coin_amount, is_claimed FROM user_reward_notifications WHERE id = ?',
        [notificationId]
    );

    if (!notification) {
        return { error: 'Notification not found', status: 404 };
    }

    if (notification.is_claimed) {
        const summary = await getRewardSummary(notification.email);
        return { notification, summary, alreadyClaimed: true };
    }

    const coinAmount = Math.max(0, Math.round(Number(notification.coin_amount) || 0));
    const now = new Date().toISOString();

    await runSql('BEGIN TRANSACTION');
    try {
        await ensureRewardProfile(notification.email);
        await runSql(
            'UPDATE user_rewards SET loyalty_coins = loyalty_coins + ?, total_earned = total_earned + ?, updated_at = ? WHERE email = ?',
            [coinAmount, coinAmount, now, notification.email]
        );
        await runSql(
            'UPDATE user_reward_notifications SET is_read = 1, is_opened = 1, is_claimed = 1, claimed_at = ?, updated_at = ? WHERE id = ?',
            [now, now, notificationId]
        );
        await runSql('COMMIT');
    } catch (error) {
        await runSql('ROLLBACK').catch(() => undefined);
        throw error;
    }

    const summary = await getRewardSummary(notification.email);
    return { notification, summary, coinAmount };
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

    await runSql(`
        CREATE TABLE IF NOT EXISTS user_rewards (
            email TEXT PRIMARY KEY,
            loyalty_coins INTEGER NOT NULL DEFAULT 0,
            total_earned INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL
        )
    `);

    await runSql(`
        CREATE TABLE IF NOT EXISTS user_reward_notifications (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            source TEXT NOT NULL,
            coin_amount INTEGER NOT NULL DEFAULT 0,
            is_read INTEGER NOT NULL DEFAULT 0,
            is_opened INTEGER NOT NULL DEFAULT 0,
            is_claimed INTEGER NOT NULL DEFAULT 0,
            reference TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            claimed_at TEXT
        )
    `);
    await runSql('CREATE INDEX IF NOT EXISTS idx_reward_notifications_email ON user_reward_notifications(email)');
    await runSql('CREATE INDEX IF NOT EXISTS idx_reward_notifications_created_at ON user_reward_notifications(created_at DESC)');

    await runSql(`
        CREATE TABLE IF NOT EXISTS user_accounts (
            email TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            password TEXT NOT NULL DEFAULT '',
            role TEXT NOT NULL DEFAULT 'guest',
            kyc_status TEXT NOT NULL DEFAULT 'pending',
            joined_at TEXT NOT NULL,
            is_test_user INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL
        )
    `);
    await runSql('CREATE INDEX IF NOT EXISTS idx_user_accounts_role ON user_accounts(role)');
    await runSql('CREATE INDEX IF NOT EXISTS idx_user_accounts_kyc_status ON user_accounts(kyc_status)');

    await runSql(`
        CREATE TABLE IF NOT EXISTS user_subscriptions (
            email TEXT PRIMARY KEY,
            tier TEXT NOT NULL DEFAULT 'free',
            status TEXT NOT NULL DEFAULT 'free',
            plan_name TEXT NOT NULL DEFAULT 'Free Plan',
            billing_cycle TEXT NOT NULL DEFAULT 'None',
            activated_at TEXT NOT NULL,
            next_billing_at TEXT,
            reference TEXT DEFAULT '',
            source TEXT NOT NULL DEFAULT 'system',
            updated_at TEXT NOT NULL
        )
    `);
    await runSql('CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier ON user_subscriptions(tier)');
    await runSql('CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status)');

    await ensureColumn('erp_bookings', 'listing_id', "TEXT DEFAULT ''");
    await ensureColumn('erp_listings', 'description', "TEXT DEFAULT ''");
    await ensureColumn('erp_listings', 'host_email', "TEXT DEFAULT ''");
    await ensureColumn('erp_listings', 'price_per_day', 'INTEGER DEFAULT 1000');
    await ensureColumn('erp_listings', 'deposit', 'INTEGER DEFAULT 0');
    await ensureColumn('erp_listings', 'image_url', "TEXT DEFAULT ''");
    await ensureColumn('erp_listings', 'created_at', "TEXT DEFAULT ''");
    await ensureColumn('user_rewards', 'total_earned', 'INTEGER DEFAULT 0');
    await ensureColumn('user_rewards', 'updated_at', "TEXT DEFAULT ''");
    await ensureColumn('user_reward_notifications', 'source', "TEXT DEFAULT 'system'");
    await ensureColumn('user_reward_notifications', 'coin_amount', 'INTEGER DEFAULT 0');
    await ensureColumn('user_reward_notifications', 'is_read', 'INTEGER DEFAULT 0');
    await ensureColumn('user_reward_notifications', 'is_opened', 'INTEGER DEFAULT 0');
    await ensureColumn('user_reward_notifications', 'is_claimed', 'INTEGER DEFAULT 0');
    await ensureColumn('user_reward_notifications', 'reference', "TEXT DEFAULT ''");
    await ensureColumn('user_reward_notifications', 'created_at', "TEXT DEFAULT ''");
    await ensureColumn('user_reward_notifications', 'updated_at', "TEXT DEFAULT ''");
    await ensureColumn('user_reward_notifications', 'claimed_at', 'TEXT');

    await ensureColumn('user_subscriptions', 'tier', "TEXT DEFAULT 'free'");
    await ensureColumn('user_subscriptions', 'status', "TEXT DEFAULT 'free'");
    await ensureColumn('user_subscriptions', 'plan_name', "TEXT DEFAULT 'Free Plan'");
    await ensureColumn('user_subscriptions', 'billing_cycle', "TEXT DEFAULT 'None'");
    await ensureColumn('user_subscriptions', 'activated_at', "TEXT DEFAULT ''");
    await ensureColumn('user_subscriptions', 'next_billing_at', 'TEXT');
    await ensureColumn('user_subscriptions', 'reference', "TEXT DEFAULT ''");
    await ensureColumn('user_subscriptions', 'source', "TEXT DEFAULT 'system'");
    await ensureColumn('user_subscriptions', 'updated_at', "TEXT DEFAULT ''");

    await ensureColumn('user_accounts', 'name', "TEXT DEFAULT ''");
    await ensureColumn('user_accounts', 'password', "TEXT DEFAULT ''");
    await ensureColumn('user_accounts', 'role', "TEXT DEFAULT 'guest'");
    await ensureColumn('user_accounts', 'kyc_status', "TEXT DEFAULT 'pending'");
    await ensureColumn('user_accounts', 'joined_at', "TEXT DEFAULT ''");
    await ensureColumn('user_accounts', 'is_test_user', 'INTEGER DEFAULT 0');
    await ensureColumn('user_accounts', 'updated_at', "TEXT DEFAULT ''");
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
            ['pro_studio_light_001', 'Profoto B10X Plus Studio Kit', 'Professional lighting for commercial photography.', 'Lighting', 'available', 'Excellent', 'Marcus S.', 'marcus.s@lens.co', 2400, 4000, '', now, now],
            ['syn_prophet6_002', 'Sequential Prophet-6 Synthesizer', 'Classic polyphonic analog synthesizer.', 'Audio', 'available', 'Excellent', 'Julian R.', 'julian.r@lens.co', 1800, 3000, '', now, now],
            ['mon_prodisp_003', 'Apple Pro Display XDR', '32-inch Retina 6K display for color grading.', 'Cameras', 'available', 'Excellent', 'Elena R.', 'elena.r@lens.co', 3200, 5000, '', now, now],
            ['gtr_gibson_004', 'Gibson Les Paul Custom', 'Ebony finish, 1968 Reissue.', 'Audio', 'available', 'Excellent', 'Julian R.', 'julian.r@lens.co', 1900, 3000, '', now, now],
            ['lens_arri_005', 'Arri Signature Prime 35mm', 'LPL Mount cinema lens with exceptional bokeh.', 'Lenses', 'available', 'Excellent', 'Elena R.', 'elena.r@lens.co', 4800, 7000, '', now, now],
            ['boots_balenciaga_006', 'Balenciaga Runway Boots', 'Size 42, Black leather from SS24 collection.', 'Fashion', 'available', 'Excellent', 'Sienna Vale', 'sienna.v@stylehouse.co', 2800, 4500, '', now, now],
            ['cam_red_011', 'RED Komodo 6K Cinema Camera', 'Premium full-frame cinema camera with global shutter.', 'Cameras', 'available', 'Excellent', 'Julian R.', 'julian.r@lens.co', 9500, 15000, '', now, now],
            ['lens_sigma_012', 'Sigma Cine 18-35mm T2', 'Professional cinema zoom lens with excellent color rendition.', 'Lenses', 'available', 'Excellent', 'Elena R.', 'elena.r@lens.co', 3500, 6000, '', now, now],
            ['light_aputure_013', 'Aputure 600D Pro Light', 'High-power LED cinema light for large-scale productions.', 'Lighting', 'available', 'Excellent', 'Marcus S.', 'marcus.s@lens.co', 5200, 8000, '', now, now],
            ['mic_rode_014', 'Rode Wireless GO II System', 'Professional wireless microphone system with dual channels.', 'Audio', 'available', 'Excellent', 'Julian R.', 'julian.r@lens.co', 1200, 2000, '', now, now],
            ['stabilizer_gimbal_015', 'DJI Ronin 4D', 'Advanced camera stabilization and gimbal system.', 'Stabilizers', 'available', 'Excellent', 'Marcus S.', 'marcus.s@lens.co', 6800, 10000, '', now, now],
            ['tripod_sachtler_016', 'Sachtler Flowtech 75 Tripod', 'Carbon fiber tripod with fluid head for cinema.', 'Grip', 'available', 'Excellent', 'Elena R.', 'elena.r@lens.co', 1500, 2500, '', now, now],
            ['monitor_smallhd_017', 'SmallHD 702 Bright Touch Monitor', '7-inch 4K monitor with sun-readable display.', 'Cameras', 'available', 'Excellent', 'Elena R.', 'elena.r@lens.co', 950, 1500, '', now, now],
            ['lens_canon_018', 'Canon RF 24-70mm F2.8L IS USM', 'Fast zoom lens for mirrorless cinema.', 'Lenses', 'available', 'Excellent', 'Elena R.', 'elena.r@lens.co', 2800, 4500, '', now, now],
            ['lighting_kino_019', 'Kino Flo Celeb 400 LED Light', 'Flicker-free LED light for studio and location work.', 'Lighting', 'available', 'Excellent', 'Marcus S.', 'marcus.s@lens.co', 1800, 3000, '', now, now],
            ['recorder_zoom_020', 'Zoom F3 Audio Recorder', 'Compact field recorder with professional preamps.', 'Audio', 'available', 'Excellent', 'Julian R.', 'julian.r@lens.co', 800, 1200, '', now, now],
            ['fashion_sunglasses_021', 'Gucci Oversize Square Sunglasses', 'Luxury fashion sunglasses from latest collection.', 'Fashion', 'available', 'Excellent', 'Sienna Vale', 'sienna.v@stylehouse.co', 1500, 2500, '', now, now],
            ['fashion_watch_022', 'Omega Seamaster Planet Ocean', 'Luxury Swiss chronograph watch for editorial shoots.', 'Fashion', 'available', 'Excellent', 'Adrian Cole', 'adrian.c@atelier.one', 7800, 12000, '', now, now],
            ['fashion_bag_023', 'Hermès Birkin 35 Noir', 'Premium luxury handbag for high-fashion content.', 'Fashion', 'available', 'Excellent', 'Sienna Vale', 'sienna.v@stylehouse.co', 4500, 7000, '', now, now],
            ['fashion_suit_024', 'Versace Black Tailored Suit', 'Luxury menswear ensemble for editorial campaigns.', 'Fashion', 'available', 'Excellent', 'Adrian Cole', 'adrian.c@atelier.one', 3800, 5500, '', now, now],
            ['grip_dolly_025', 'Slider Dolly Track System', 'Portable dolly system for smooth camera movements.', 'Grip', 'available', 'Excellent', 'Marcus S.', 'marcus.s@lens.co', 2200, 3500, '', now, now],
            ['camera_drone_026', 'DJI Air 3S Drone', 'Professional drone with 4K camera and long flight time.', 'Cameras', 'available', 'Excellent', 'Julian R.', 'julian.r@lens.co', 3500, 5500, '', now, now],
        ];
        for (const row of rows) {
            await runSql('INSERT INTO erp_listings (id, title, description, category, status, item_condition, host, host_email, price_per_day, deposit, image_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', row);
        }
    }

    const pricingFixes = [
        ['pro_studio_light_001', 2400, 4000],
        ['syn_prophet6_002', 1800, 3000],
        ['mon_prodisp_003', 3200, 5000],
        ['gtr_gibson_004', 1900, 3000],
        ['lens_arri_005', 4800, 7000],
        ['boots_balenciaga_006', 2800, 4500],
        ['cam_red_011', 9500, 15000],
        ['lens_sigma_012', 3500, 6000],
        ['light_aputure_013', 5200, 8000],
        ['mic_rode_014', 1200, 2000],
        ['stabilizer_gimbal_015', 6800, 10000],
        ['tripod_sachtler_016', 1500, 2500],
        ['monitor_smallhd_017', 950, 1500],
        ['lens_canon_018', 2800, 4500],
        ['lighting_kino_019', 1800, 3000],
        ['recorder_zoom_020', 800, 1200],
        ['fashion_sunglasses_021', 1500, 2500],
        ['fashion_watch_022', 7800, 12000],
        ['fashion_bag_023', 4500, 7000],
        ['fashion_suit_024', 3800, 5500],
        ['grip_dolly_025', 2200, 3500],
        ['camera_drone_026', 3500, 5500],
    ];
    for (const [id, pricePerDay, deposit] of pricingFixes) {
        await runSql(
            'UPDATE erp_listings SET price_per_day = ?, deposit = ?, updated_at = ? WHERE id = ?',
            [pricePerDay, deposit, new Date().toISOString(), id]
        );
    }

    const seedNow = new Date().toISOString();
    const fashionRows = [
        ['fsh_tux_007', 'Tom Ford Black Tie Ensemble', 'Runway-ready tuxedo set for editorial and red carpet shoots', 'Fashion', 'available', 'Excellent', 'Sienna Vale', 'sienna.v@stylehouse.co', 6200, 9000, '', seedNow, seedNow],
        ['fsh_rolex_008', 'Rolex Day-Date 40', '18k gold statement watch for high-fashion campaigns', 'Fashion', 'available', 'Excellent', 'Sienna Vale', 'sienna.v@stylehouse.co', 8900, 15000, '', seedNow, seedNow],
        ['fsh_patek_009', 'Patek Philippe Nautilus', 'Collector-grade luxury watch for premium editorial content', 'Fashion', 'available', 'Excellent', 'Adrian Cole', 'adrian.c@atelier.one', 10400, 18000, '', seedNow, seedNow],
        ['fsh_gown_010', 'Couture Evening Gown Set', 'Editorial wardrobe kit with accessories for luxury fashion shoots', 'Fashion', 'available', 'Excellent', 'Adrian Cole', 'adrian.c@atelier.one', 5400, 8000, '', seedNow, seedNow],
    ];

    // Ensure search-page linked listings exist even when DB was created before latest seed rows.
    const searchLinkedRows = [
        ['cam_red_011', 'RED Komodo 6K Cinema Camera', 'Premium full-frame cinema camera with global shutter.', 'Cameras', 'available', 'Excellent', 'Julian R.', 'julian.r@lens.co', 9500, 15000, '', seedNow, seedNow],
        ['lens_sigma_012', 'Sigma Cine 18-35mm T2', 'Professional cinema zoom lens with excellent color rendition.', 'Lenses', 'available', 'Excellent', 'Elena R.', 'elena.r@lens.co', 3500, 6000, '', seedNow, seedNow],
        ['light_aputure_013', 'Aputure 600D Pro Light', 'High-power LED cinema light for large-scale productions.', 'Lighting', 'available', 'Excellent', 'Marcus S.', 'marcus.s@lens.co', 5200, 8000, '', seedNow, seedNow],
        ['mic_rode_014', 'Rode Wireless GO II System', 'Professional wireless microphone system with dual channels.', 'Audio', 'available', 'Excellent', 'Julian R.', 'julian.r@lens.co', 1200, 2000, '', seedNow, seedNow],
        ['fashion_watch_022', 'Omega Seamaster Planet Ocean', 'Luxury Swiss chronograph watch for editorial shoots.', 'Fashion', 'available', 'Excellent', 'Adrian Cole', 'adrian.c@atelier.one', 7800, 12000, '', seedNow, seedNow],
    ];

    for (const row of fashionRows) {
        await runSql(
            'INSERT OR IGNORE INTO erp_listings (id, title, description, category, status, item_condition, host, host_email, price_per_day, deposit, image_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            row
        );
    }

    for (const row of searchLinkedRows) {
        await runSql(
            'INSERT OR IGNORE INTO erp_listings (id, title, description, category, status, item_condition, host, host_email, price_per_day, deposit, image_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            row
        );
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

    for (const user of TEST_USER_ACCOUNTS) {
        const normalizedEmail = normalizeEmail(user.email);
        await runSql(
            'INSERT OR IGNORE INTO user_accounts (email, name, password, role, kyc_status, joined_at, is_test_user, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [normalizedEmail, user.name, user.password, user.role, user.kyc_status, new Date().toISOString(), 1, new Date().toISOString()]
        );
        await runSql(
            'UPDATE user_accounts SET name = ?, password = ?, role = ?, kyc_status = ?, is_test_user = 1, updated_at = ? WHERE email = ?',
            [user.name, user.password, sanitizeRole(user.role), user.kyc_status, new Date().toISOString(), normalizedEmail]
        );
        await ensureSubscriptionProfile(normalizedEmail);
        await ensureRewardProfile(normalizedEmail);
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

app.get('/api/admin/metrics', async (req, res) => {
    try {
        const subscriptionData = await getSubscriptionDashboardData();
        res.json({
            totalRevenue: 3450000,
            activeRentals: 42,
            pendingKYC: 15,
            newSignupsToday: 8,
            subscriptionMrr: subscriptionData.summary.mrr,
            activeSubscriptions: subscriptionData.summary.active,
            trialSubscriptions: subscriptionData.summary.trial,
            freeUsers: subscriptionData.summary.free,
            subscriptionCount: subscriptionData.summary.total,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/admin/kyc-webhook', (req, res) => {
    console.log('DigiLocker Verification Update received:', req.body);
    res.sendStatus(200);
});

app.post('/api/reviews/submit', async (req, res) => {
    try {
        const { listing_id, listing_title, host_email, reviewer_name, reviewer_email, rating, comment } = req.body;
        const reviewerName = String(reviewer_name || '').trim();
        const reviewerEmail = normalizeEmail(reviewer_email);

        if (!listing_id || !listing_title || !host_email || !reviewerName || !reviewerEmail || !rating || !comment) {
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
            reviewer_name: reviewerName,
            reviewer_email: reviewerEmail,
            rating: parsedRating,
            comment,
            created_at: new Date().toISOString(),
        };

        await runSql(
            'INSERT INTO listing_reviews (id, listing_id, listing_title, host_email, reviewer_name, reviewer_email, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [review.id, review.listing_id, review.listing_title, review.host_email, review.reviewer_name, review.reviewer_email, review.rating, review.comment, review.created_at]
        );

        await awardCoins({
            email: reviewerEmail,
            amount: 20,
            title: 'Review bonus earned',
            message: `Thanks for reviewing ${listing_title}. You earned 20 loyalty coins.`,
            source: 'review_submitted',
            reference: review.id,
        });

        return res.json({ success: true, message: 'Review submitted and shared with admin and listing owner', routed_to_admin: true, routed_to_host: true, review });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/listings/public', async (req, res) => {
    try {
        const requestedStatus = String(req.query.status || '').toLowerCase();
        const minPriceRaw = req.query.min_price;
        const maxPriceRaw = req.query.max_price;
        const minPrice = minPriceRaw === undefined || minPriceRaw === '' ? null : Number(minPriceRaw);
        const maxPrice = maxPriceRaw === undefined || maxPriceRaw === '' ? null : Number(maxPriceRaw);

        if (minPrice !== null && (!Number.isFinite(minPrice) || minPrice < 0)) {
            return res.status(400).json({ success: false, error: 'min_price must be a non-negative number' });
        }
        if (maxPrice !== null && (!Number.isFinite(maxPrice) || maxPrice < 0)) {
            return res.status(400).json({ success: false, error: 'max_price must be a non-negative number' });
        }
        if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
            return res.status(400).json({ success: false, error: 'min_price cannot be greater than max_price' });
        }

        const params = [];
        const whereParts = [];
        let query = 'SELECT id, title, description, category, status, item_condition AS condition, host, host_email, price_per_day, deposit, image_url, created_at, updated_at FROM erp_listings';

        // Always exclude booked listings from public view
        whereParts.push("lower(status) != 'booked'");

        if (requestedStatus) {
            if (requestedStatus === 'available') {
                whereParts.push("lower(status) IN ('available', 'approved', 'published', 'active')");
            } else if (requestedStatus === 'sold_out') {
                whereParts.push("lower(status) IN ('sold_out', 'rented')");
            } else {
                whereParts.push('lower(status) = ?');
                params.push(requestedStatus);
            }
        } else {
            whereParts.push("lower(status) IN ('available', 'approved', 'published', 'active', 'sold_out', 'rented')");
        }

        if (minPrice !== null) {
            whereParts.push('price_per_day >= ?');
            params.push(Math.round(minPrice));
        }

        if (maxPrice !== null) {
            whereParts.push('price_per_day <= ?');
            params.push(Math.round(maxPrice));
        }

        if (whereParts.length) {
            query += ` WHERE ${whereParts.join(' AND ')}`;
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
        
            // Get active/pending bookings for availability info
            const bookings = await allSql(
                'SELECT id, renter, start_date, end_date, status FROM erp_bookings WHERE listing_id = ? AND (status = ? OR status = ?)',
                [req.params.id, 'active', 'pending']
            );
        
            const activeBooking = bookings[0] || null;
        
            return res.json({
                success: true,
                listing: {
                    ...listing,
                    status: normalizeListingStatus(listing.status),
                    is_available: normalizeListingStatus(listing.status) === 'available' && !activeBooking,
                    active_booking: activeBooking ? {
                        id: activeBooking.id,
                        renter: activeBooking.renter,
                        start_date: activeBooking.start_date,
                        end_date: activeBooking.end_date,
                        status: activeBooking.status
                    } : null
                }
            });
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
        const hostEmail = normalizeEmail(req.body.host_email);
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
    const email = normalizeEmail(req.query.email);

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
    let renterName = String(req.body.renter_name || 'Guest Renter').trim();
    let renterEmail = normalizeEmail(req.body.renter_email || 'guest@example.com');
    const startDate = String(req.body.start_date || '').trim();
    const endDate = String(req.body.end_date || '').trim();

    if (!renterName) renterName = 'Guest Renter';
    if (!renterEmail) renterEmail = 'guest@example.com';

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

        await awardCoins({
            email: renterEmail,
            amount: 50,
            title: 'Booking bonus unlocked',
            message: `Your booking for ${listing.title} earned 50 loyalty coins. Claim them from your profile.`,
            source: 'booking_created',
            reference: bookingId,
        });

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

app.get('/api/admin/listings-availability', async (req, res) => {
    try {
        const listings = await allSql('SELECT id, title, category, status, host, host_email, price_per_day, created_at, updated_at FROM erp_listings ORDER BY datetime(created_at) DESC');
        
        // Enrich with booking information
        const enrichedListings = await Promise.all(listings.map(async (listing) => {
            const bookings = await allSql(
                'SELECT id, renter, start_date, end_date, status FROM erp_bookings WHERE listing_id = ? ORDER BY datetime(created_at) DESC',
                [listing.id]
            );
            
            const activeBooking = bookings.find(b => b.status === 'active' || b.status === 'pending');
            
            return {
                ...listing,
                booking_count: bookings.length,
                has_active_booking: !!activeBooking,
                active_booking: activeBooking ? {
                    id: activeBooking.id,
                    renter: activeBooking.renter,
                    start_date: activeBooking.start_date,
                    end_date: activeBooking.end_date,
                    status: activeBooking.status,
                    dates: `${formatDateLabel(activeBooking.start_date)} - ${formatDateLabel(activeBooking.end_date)}`
                } : null,
                recent_bookings: bookings.slice(0, 5).map(b => ({
                    id: b.id,
                    renter: b.renter,
                    start_date: b.start_date,
                    end_date: b.end_date,
                    status: b.status,
                    dates: `${formatDateLabel(b.start_date)} - ${formatDateLabel(b.end_date)}`
                }))
            };
        }));
        
        return res.json({
            success: true,
            count: enrichedListings.length,
            results: enrichedListings
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

        let rewardHostEmail = '';
        if (booking.listing_id) {
            const listingRow = await getSql('SELECT host_email, title FROM erp_listings WHERE id = ?', [booking.listing_id]);
            rewardHostEmail = normalizeEmail(listingRow?.host_email || '');
            if (nextStatus === 'active') {
                await runSql('UPDATE erp_listings SET status = ?, updated_at = ? WHERE id = ?', ['sold_out', now, booking.listing_id]);
            }
            if (nextStatus === 'returned' || nextStatus === 'closed') {
                await runSql('UPDATE erp_listings SET status = ?, updated_at = ? WHERE id = ? AND status != ?', ['available', now, booking.listing_id, 'damaged']);
            }
            if (action === 'reject') {
                await runSql('UPDATE erp_listings SET status = ?, updated_at = ? WHERE id = ?', ['available', now, booking.listing_id]);
            }

            if ((nextStatus === 'returned' || nextStatus === 'closed') && rewardHostEmail) {
                await awardCoins({
                    email: rewardHostEmail,
                    amount: 150,
                    title: 'Completed rental bonus',
                    message: `Your listing ${booking.listing} completed successfully. You earned 150 loyalty coins.`,
                    source: 'booking_completed',
                    reference: booking.id,
                });
            }
        }

        return res.json({ success: true, message: `Booking ${id} updated` });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Booking request endpoint (from product detail page)
app.post('/api/bookings/request', async (req, res) => {
    try {
        const listingId = String(req.body.listing_id || '').trim();
        const renterName = String(req.body.renter_name || '').trim();
        const renterEmail = normalizeEmail(req.body.renter_email);
        const startDate = String(req.body.start_date || '').trim();
        const endDate = String(req.body.end_date || '').trim();
        const message = String(req.body.message || '').trim();

        if (!listingId || !renterName || !renterEmail || !startDate || !endDate) {
            return res.status(400).json({ success: false, error: 'Missing required fields: listing_id, renter_name, renter_email, start_date, end_date' });
        }

        const listing = await getSql('SELECT * FROM erp_listings WHERE id = ?', [listingId]);
        if (!listing) {
            return res.status(404).json({ success: false, error: 'Listing not found' });
        }

        const currentStatus = normalizeListingStatus(listing.status);
        if (currentStatus !== 'available') {
            return res.status(409).json({ success: false, error: 'Listing is not available for booking' });
        }

        const bookingDays = daysBetweenInclusive(startDate, endDate);
        const amount = Math.max(0, Math.round((Number(listing.price_per_day) || 0) * bookingDays));
        const bookingId = `BK${String(Math.floor(Math.random() * 9000) + 1000)}`;
        const now = new Date().toISOString();

        // Create booking
        await runSql(
              'INSERT INTO erp_bookings (id, renter, email, listing, listing_id, start_date, end_date, status, amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [bookingId, renterName, renterEmail, listing.title, listingId, startDate, endDate, 'pending', amount, now, now]
        );

        // Update listing status to indicate it has an active/pending booking
        await runSql(
            'UPDATE erp_listings SET status = ?, updated_at = ? WHERE id = ?',
            ['booked', now, listingId]
        );

        return res.status(201).json({
            success: true,
            message: 'Booking request submitted successfully',
            booking_id: bookingId,
            amount: amount,
            days: bookingDays
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Contact/Message endpoint
app.post('/api/messages/send', async (req, res) => {
    try {
        const listingId = String(req.body.listing_id || '').trim();
        const senderName = String(req.body.sender_name || '').trim();
        const senderEmail = normalizeEmail(req.body.sender_email);
        const subject = String(req.body.subject || '').trim();
        const messageText = String(req.body.message || '').trim();

        if (!listingId || !senderName || !senderEmail || !subject || !messageText) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const listing = await getSql('SELECT * FROM erp_listings WHERE id = ?', [listingId]);
        if (!listing) {
            return res.status(404).json({ success: false, error: 'Listing not found' });
        }

        const messageId = `MSG${String(Math.floor(Math.random() * 9000) + 1000)}`;
        const now = new Date().toISOString();

        // Store message (you can create a messages table or use email directly)
        console.log(`New message from ${senderName} (${senderEmail}) about listing "${listing.title}": ${messageText}`);

        return res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            message_id: messageId
        });
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

        const activeBooking = await getSql(
            "SELECT id, status FROM erp_bookings WHERE listing_id = ? AND status IN ('pending', 'active') ORDER BY datetime(created_at) DESC LIMIT 1",
            [id]
        );

        const wantsAvailable = action === 'mark-available' || action === 'approve' || action === 'relist';
        if (wantsAvailable && activeBooking) {
            return res.status(409).json({
                success: false,
                error: `Cannot mark listing available while booking ${activeBooking.id} is ${activeBooking.status}`,
            });
        }

        const normalizedCurrent = normalizeListingStatus(listing.status);
        let nextStatus = normalizedCurrent;
        if (action === 'mark-available' || action === 'approve' || action === 'relist') nextStatus = 'available';
        else if (action === 'mark-maintenance') nextStatus = 'maintenance';
        else if (action === 'mark-damaged') nextStatus = 'damaged';
        else if (action === 'mark-sold-out' || action === 'mark-rented') nextStatus = 'sold_out';
        else if (action === 'reject') nextStatus = 'rejected';
        else return res.status(400).json({ success: false, error: 'Unsupported listing action' });

        await runSql('UPDATE erp_listings SET status = ?, updated_at = ? WHERE id = ?', [nextStatus, new Date().toISOString(), id]);

        if (nextStatus === 'available' && (action === 'approve' || action === 'relist' || action === 'mark-available')) {
            await awardCoins({
                email: listing.host_email,
                amount: 25,
                title: 'Listing approved bonus',
                message: `Your listing ${listing.title} was approved. You earned 25 loyalty coins.`,
                source: 'listing_approved',
                reference: listing.id,
            });
        }
        return res.json({ success: true, message: `Listing ${id} updated` });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/users/rewards', async (req, res) => {
    try {
        const email = normalizeEmail(req.query.email);
        if (!email) {
            return res.status(400).json({ success: false, error: 'email query parameter is required' });
        }

        const summary = await getRewardSummary(email);
        return res.json({
            success: true,
            email,
            loyalty_coins: summary.profile.loyalty_coins,
            total_earned: summary.profile.total_earned,
            pending_coins: summary.pendingCoins,
            unread_count: summary.unreadCount,
            notifications: summary.notifications,
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/users/subscription', async (req, res) => {
    try {
        const email = normalizeEmail(req.query.email);
        if (!email) {
            return res.status(400).json({ success: false, error: 'email query parameter is required' });
        }

        const subscription = await ensureSubscriptionProfile(email);
        return res.json({ success: true, email, subscription });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/users/register', async (req, res) => {
    try {
        const firstName = String(req.body.first_name || req.body.firstName || '').trim();
        const lastName = String(req.body.last_name || req.body.lastName || '').trim();
        const providedName = String(req.body.name || '').trim();
        const fullName = providedName || `${firstName} ${lastName}`.trim();

        const result = await createUserAccount({
            email: req.body.email,
            password: req.body.password,
            role: req.body.role,
            name: fullName,
            kycStatus: req.body.kyc_status || 'pending',
            isTestUser: 0,
        });

        if (result?.error) {
            return res.status(result.status || 400).json({ success: false, error: result.error });
        }

        return res.status(201).json({
            success: true,
            message: 'Account created successfully',
            user: {
                ...result.user,
                role_label: titleCaseRole(result.user.role),
            },
            subscription: result.subscription,
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/users/login', async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || '').trim();
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'email and password are required' });
        }

        const user = await getSql(
            'SELECT email, name, password, role, kyc_status, joined_at, is_test_user, updated_at FROM user_accounts WHERE email = ?',
            [email]
        );
        if (!user || String(user.password || '') !== password) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        await ensureRewardProfile(email);
        const subscription = await ensureSubscriptionProfile(email);

        return res.json({
            success: true,
            user: {
                email: user.email,
                name: user.name,
                role: user.role,
                role_label: titleCaseRole(user.role),
                kyc_status: user.kyc_status,
                joined_at: user.joined_at,
                is_test_user: user.is_test_user,
                updated_at: user.updated_at,
            },
            subscription,
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/users/subscription/activate', async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email || req.query.email);
        const tier = String(req.body.tier || req.body.plan || 'plus').trim().toLowerCase();
        if (!email) {
            return res.status(400).json({ success: false, error: 'email is required' });
        }

        const subscription = await upsertSubscription({
            email,
            tier,
            reference: String(req.body.reference || req.body.ref || '').trim(),
            source: String(req.body.source || 'checkout').trim(),
            activatedAt: String(req.body.activated_at || '').trim(),
            nextBillingAt: req.body.next_billing_at ? String(req.body.next_billing_at).trim() : null,
        });

        return res.status(201).json({ success: true, message: 'Subscription saved', subscription });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/users/notifications', async (req, res) => {
    try {
        const email = normalizeEmail(req.query.email);
        if (!email) {
            return res.status(400).json({ success: false, error: 'email query parameter is required' });
        }

        const summary = await getRewardSummary(email);
        return res.json({ success: true, count: summary.notifications.length, results: summary.notifications });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/users/notifications/:id/read', async (req, res) => {
    try {
        const notificationId = req.params.id;
        const notification = await getSql('SELECT id FROM user_reward_notifications WHERE id = ?', [notificationId]);
        if (!notification) {
            return res.status(404).json({ success: false, error: 'Notification not found' });
        }

        await runSql('UPDATE user_reward_notifications SET is_read = 1, updated_at = ? WHERE id = ?', [new Date().toISOString(), notificationId]);
        return res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/users/notifications/:id/open', async (req, res) => {
    try {
        const notificationId = req.params.id;
        const notification = await getSql('SELECT id FROM user_reward_notifications WHERE id = ?', [notificationId]);
        if (!notification) {
            return res.status(404).json({ success: false, error: 'Notification not found' });
        }

        await runSql('UPDATE user_reward_notifications SET is_opened = 1, is_read = 1, updated_at = ? WHERE id = ?', [new Date().toISOString(), notificationId]);
        return res.json({ success: true, message: 'Notification opened' });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/users/notifications/:id/claim', async (req, res) => {
    try {
        const result = await claimRewardNotification(req.params.id);
        if (result?.error) {
            return res.status(result.status || 400).json({ success: false, error: result.error });
        }

        return res.json({
            success: true,
            message: result.alreadyClaimed ? 'Notification already claimed' : 'Reward claimed successfully',
            coin_amount: result.notification.coin_amount,
            loyalty_coins: result.summary.profile.loyalty_coins,
            total_earned: result.summary.profile.total_earned,
            pending_coins: result.summary.pendingCoins,
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/admin/rewards/award', async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const amount = Number(req.body.coin_amount || req.body.amount || 0);
        if (!email || !Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ success: false, error: 'email and positive coin_amount are required' });
        }

        const userAccount = await getSql('SELECT email, name FROM user_accounts WHERE email = ?', [email]);
        if (!userAccount) {
            return res.status(404).json({ success: false, error: 'User not found. Create or register the user first.' });
        }

        const notification = await awardCoins({
            email,
            amount,
            title: String(req.body.title || 'Reward credited').trim(),
            message: String(req.body.message || `You earned ${Math.round(amount)} loyalty coins.`).trim(),
            source: String(req.body.source || 'admin_award').trim(),
            reference: String(req.body.reference || '').trim(),
        });

        return res.status(201).json({
            success: true,
            message: `Reward mail sent to ${userAccount.email} and added to inbox`,
            notification,
            user: { email: userAccount.email, name: userAccount.name },
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/admin/subscriptions', async (req, res) => {
    try {
        const data = await getSubscriptionDashboardData();
        return res.json({
            success: true,
            count: data.rows.length,
            summary: data.summary,
            results: data.rows,
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/admin/users', async (req, res) => {
    try {
        const rows = await allSql(
            `
            SELECT
                ua.email,
                ua.name,
                ua.role,
                ua.kyc_status,
                ua.joined_at,
                ua.is_test_user,
                ua.updated_at,
                us.tier,
                us.status AS subscription_status,
                us.plan_name,
                us.next_billing_at
            FROM user_accounts ua
            LEFT JOIN user_subscriptions us ON us.email = ua.email
            ORDER BY ua.is_test_user DESC, datetime(ua.joined_at) DESC
            `
        );

        const results = rows.map((row) => ({
            ...row,
            role_label: titleCaseRole(row.role),
            plan_tier: row.tier || 'free',
            plan_name: row.plan_name || 'Free Plan',
            subscription_status: row.subscription_status || 'free',
            kyc_status: row.kyc_status || 'pending',
        }));

        return res.json({ success: true, count: results.length, results });
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
