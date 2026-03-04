/**
 * Seed Firebase Firestore with listing and user data.
 * Signs in with Firebase Auth first, then writes data while authenticated.
 *
 * Run:  node seed_firestore.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, writeBatch } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const path = require('path');

// Load env vars from frontend .env
require('dotenv').config({ path: path.join(__dirname, 'omnishare_frontend', '.env') });

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

console.log('Firebase project:', firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const authInstance = getAuth(app);

const SEED_EMAIL = 'seedadmin@omnishare.com';
const SEED_PASSWORD = 'SeedAdmin@12345!';

// ─── Data ────────────────────────────────────────────────────────────

const REGIONS = [
  'Delhi', 'Mumbai', 'Bangalore', 'Pune', 'Hyderabad',
  'Chennai', 'Kolkata', 'Jaipur', 'Indore', 'Ahmedabad',
];

const CATEGORIES = [
  { name: 'Electronics', icon: '💻', slug: 'electronics' },
  { name: 'Furniture', icon: '🪑', slug: 'furniture' },
  { name: 'Bicycles', icon: '🚲', slug: 'bicycles' },
  { name: 'Motorcycles', icon: '🏍️', slug: 'motorcycles' },
  { name: 'Tools & Equipment', icon: '🔧', slug: 'tools-equipment' },
  { name: 'Party & Event', icon: '🎉', slug: 'party-event' },
  { name: 'Sports & Outdoors', icon: '⚽', slug: 'sports-outdoors' },
  { name: 'Photography', icon: '📷', slug: 'photography' },
  { name: 'Gaming', icon: '🎮', slug: 'gaming' },
  { name: 'Home & Kitchen', icon: '🏠', slug: 'home-kitchen' },
];

const LISTINGS_BY_CATEGORY = {
  Electronics: [
    { title: 'MacBook Pro 15" 2021', price: 150, deposit: 500 },
    { title: 'Dell Laptop XPS 13', price: 100, deposit: 400 },
    { title: 'Sony A6400 Camera', price: 200, deposit: 800 },
    { title: 'Canon EOS R5', price: 250, deposit: 1000 },
    { title: 'DJI Air 2S Drone', price: 300, deposit: 1200 },
    { title: 'iPad Pro 12.9"', price: 80, deposit: 300 },
    { title: 'LG 4K Projector', price: 200, deposit: 800 },
    { title: 'Gaming Laptop RTX 4090', price: 400, deposit: 2000 },
  ],
  Furniture: [
    { title: 'Premium Leather Sofa', price: 80, deposit: 2000 },
    { title: 'Dining Table Set 6 Seater', price: 60, deposit: 1500 },
    { title: 'King Size Bed Frame', price: 70, deposit: 1800 },
    { title: 'Gaming Chair Pro', price: 50, deposit: 1000 },
    { title: 'Executive Office Desk', price: 40, deposit: 800 },
    { title: 'Sectional Corner Sofa', price: 100, deposit: 2500 },
    { title: 'Modular Kitchen Cabinet', price: 80, deposit: 2000 },
  ],
  Bicycles: [
    { title: 'Trek Mountain Bike 29"', price: 40, deposit: 800 },
    { title: 'Giant Road Bike Carbon', price: 50, deposit: 1000 },
    { title: 'BMX Stunt Bike', price: 25, deposit: 400 },
    { title: 'Hybrid City Bike', price: 30, deposit: 500 },
    { title: 'Electric Assist Bike', price: 80, deposit: 2000 },
    { title: 'Foldable City Bike', price: 28, deposit: 450 },
  ],
  Motorcycles: [
    { title: 'Honda CB Shine SP', price: 120, deposit: 5000 },
    { title: 'Royal Enfield Classic 350', price: 130, deposit: 5500 },
    { title: 'TVS Apache RTR 200', price: 110, deposit: 4500 },
    { title: 'KTM Duke 390', price: 150, deposit: 6500 },
    { title: 'Yamaha R15 V4', price: 135, deposit: 5800 },
  ],
  'Tools & Equipment': [
    { title: 'Bosch Power Drill Set', price: 60, deposit: 1500 },
    { title: 'Makita Circular Saw', price: 80, deposit: 2000 },
    { title: 'DeWalt Combo Kit 20V', price: 100, deposit: 2500 },
    { title: 'Pressure Washer 3000 PSI', price: 90, deposit: 2200 },
    { title: 'Welding Machine AC/DC', price: 150, deposit: 4000 },
  ],
  'Party & Event': [
    { title: 'DJ Mixer Setup', price: 200, deposit: 5000 },
    { title: 'LED Lighting Pack 100 PCS', price: 80, deposit: 1500 },
    { title: 'Sound System 1000W', price: 150, deposit: 3000 },
    { title: 'Party Tent 20x20', price: 250, deposit: 5000 },
    { title: 'Laser Lighting Show System', price: 180, deposit: 4000 },
  ],
  'Sports & Outdoors': [
    { title: 'Camping Tent 4 Person', price: 50, deposit: 1000 },
    { title: 'Trekking Backpack 60L', price: 40, deposit: 800 },
    { title: 'Dumbbell Set 100 KG', price: 80, deposit: 2000 },
    { title: 'Cricket Kit Full Set', price: 45, deposit: 900 },
    { title: 'Kayak Single Seater', price: 120, deposit: 3000 },
  ],
  Photography: [
    { title: 'Canon EF 70-200mm Lens', price: 80, deposit: 2000 },
    { title: 'Tripod Carbon Fiber', price: 40, deposit: 800 },
    { title: 'Ring Light 18" with Stand', price: 50, deposit: 1000 },
    { title: 'Gimbal 3-Axis Stabilizer', price: 100, deposit: 2500 },
    { title: 'Drone 4K Aerial', price: 250, deposit: 6000 },
  ],
  Gaming: [
    { title: 'PS5 Console', price: 180, deposit: 4000 },
    { title: 'Xbox Series X', price: 170, deposit: 3800 },
    { title: 'Nintendo Switch OLED', price: 120, deposit: 2500 },
    { title: 'VR Headset Meta Quest 3', price: 200, deposit: 5000 },
    { title: 'Gaming PC RTX 4080', price: 400, deposit: 10000 },
  ],
  'Home & Kitchen': [
    { title: 'Microwave Oven 30L', price: 50, deposit: 1200 },
    { title: 'Air Fryer 8L Digital', price: 60, deposit: 1500 },
    { title: 'Vacuum Cleaner Robot', price: 80, deposit: 2000 },
    { title: 'OLED TV 55"', price: 200, deposit: 5000 },
    { title: 'Coffee Maker Espresso', price: 35, deposit: 600 },
  ],
};

const DESCRIPTIONS = {
  Electronics: 'Mint condition, fully functional. Includes original box and charger. Well maintained.',
  Furniture: 'Excellent condition, clean and well-maintained. Pet and smoke-free home.',
  Bicycles: 'Well-maintained, serviced regularly. Great for daily commute or recreation.',
  Motorcycles: 'Excellent running condition, regular maintenance done. Full insurance available.',
  'Tools & Equipment': 'Professional grade, tested and verified. Perfect for projects and contractors.',
  'Party & Event': 'Recently serviced, all equipment working perfectly. Easy setup and operation.',
  'Sports & Outdoors': 'Premium quality, used minimally. Great for adventure enthusiasts.',
  Photography: 'Professional equipment in excellent condition. Includes carrying case.',
  Gaming: 'Brand new or like-new condition. Latest model with all original accessories.',
  'Home & Kitchen': 'Energy efficient and reliable. Perfect for daily use and entertaining.',
};

// ─── Helpers ─────────────────────────────────────────────────────────

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Main ────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n🚀 Starting Firestore seeding...\n');

  // 0) Authenticate first (Firestore rules require auth)
  console.log('🔐 Authenticating...');
  let user;
  try {
    const cred = await signInWithEmailAndPassword(authInstance, SEED_EMAIL, SEED_PASSWORD);
    user = cred.user;
    console.log(`   ✓ Signed in as ${user.email}`);
  } catch (signInError) {
    if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
      console.log('   Creating seed admin account...');
      const cred = await createUserWithEmailAndPassword(authInstance, SEED_EMAIL, SEED_PASSWORD);
      user = cred.user;
      console.log(`   ✓ Created and signed in as ${user.email}`);
    } else {
      throw signInError;
    }
  }

  // 1) Seed categories
  console.log('📁 Seeding categories...');
  for (const cat of CATEGORIES) {
    await setDoc(doc(db, 'categories', cat.slug), {
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon,
      createdAt: new Date().toISOString(),
    });
  }
  console.log(`   ✓ ${CATEGORIES.length} categories written`);

  // 2) Seed host users
  console.log('👤 Seeding host users...');
  const hosts = [];
  for (let i = 1; i <= 25; i++) {
    const uid = `host_${i}`;
    const hostData = {
      uid,
      username: uid,
      email: `host${i}@omnishare.com`,
      firstName: `Host`,
      lastName: `${i}`,
      role: 'host',
      kycStatus: 'verified',
      phoneNumber: `98${rand(10000000, 99999999)}`,
      trustScore: parseFloat((Math.random() * 1.0 + 4.0).toFixed(2)),
      goldHostFlag: Math.random() > 0.25,
      totalBookings: rand(10, 120),
      successfulBookings: rand(5, 100),
      cancelledBookings: rand(0, 5),
      disputedBookings: rand(0, 2),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', uid), hostData);
    hosts.push(uid);
  }
  console.log(`   ✓ ${hosts.length} host users written`);

  // 3) Seed listings
  console.log('📦 Seeding listings...');
  let listingCount = 0;
  let batchOps = writeBatch(db);
  let batchSize = 0;

  for (const cat of CATEGORIES) {
    const items = LISTINGS_BY_CATEGORY[cat.name] || [];
    for (const region of REGIONS) {
      for (const item of items) {
        const copies = rand(1, 2);
        for (let c = 0; c < copies; c++) {
          const listingId = `listing_${listingCount + 1}`;
          const dailyPrice = item.price + rand(-10, 10);
          const rating = parseFloat((Math.random() * 1.5 + 3.5).toFixed(2));

          const listingData = {
            title: item.title,
            description: DESCRIPTIONS[cat.name],
            category: cat.name,
            categorySlug: cat.slug,
            dailyPrice: dailyPrice > 0 ? dailyPrice : item.price,
            deposit: item.deposit + rand(-200, 200),
            location: region,
            host: pick(hosts),
            rating,
            totalReviews: rand(1, 50),
            totalBookings: rand(0, 50),
            isAvailable: true,
            verificationStatus: 'approved',
            promotedFlag: Math.random() < 0.3,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          batchOps.set(doc(db, 'listings', listingId), listingData);
          batchSize++;
          listingCount++;

          // Firestore batch limit = 500
          if (batchSize >= 450) {
            await batchOps.commit();
            console.log(`   ... committed ${listingCount} listings so far`);
            batchOps = writeBatch(db);
            batchSize = 0;
          }
        }
      }
    }
  }

  // Commit remaining
  if (batchSize > 0) {
    await batchOps.commit();
  }
  console.log(`   ✓ ${listingCount} listings written`);

  console.log('\n✅ Firestore seeding completed!');
  console.log(`   Categories: ${CATEGORIES.length}`);
  console.log(`   Users: ${hosts.length}`);
  console.log(`   Listings: ${listingCount}`);
  console.log('\nCheck your Firebase console to see the data.\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
