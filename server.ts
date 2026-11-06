import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createInitialUserData } from './src/utils/seedData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Persistence directory and file
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'pos_database.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface StoredDB {
  users: Record<string, {
    email: string;
    passwordHash: string;
    name: string;
    createdAt: string;
  }>;
  userData: Record<string, any>;
}

function loadDB(): StoredDB {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading DB file, initializing fresh:', err);
  }

  // Initial seed for default user (e.g. darahouthr@gmail.com)
  const defaultEmail = 'darahouthr@gmail.com';
  const initialHash = crypto.createHash('sha256').update('123456').digest('hex');

  const initialDB: StoredDB = {
    users: {
      [defaultEmail.toLowerCase()]: {
        email: defaultEmail,
        passwordHash: initialHash,
        name: 'ហួត ដារ៉ា (Hout Dara)',
        createdAt: new Date().toISOString(),
      },
    },
    userData: {
      [defaultEmail.toLowerCase()]: createInitialUserData(defaultEmail),
    },
  };

  saveDB(initialDB);
  return initialDB;
}

function saveDB(db: StoredDB) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving DB file:', err);
  }
}

let db = loadDB();

// Active SSE client connections keyed by user email
const sseClients: Record<string, express.Response[]> = {};

function broadcastToEmail(email: string, payload: any) {
  const normEmail = email.toLowerCase().trim();
  const clients = sseClients[normEmail] || [];
  const message = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    try {
      client.write(message);
    } catch {
      // client disconnected
    }
  }
}

// Keep-alive heartbeat for SSE every 25 seconds
setInterval(() => {
  for (const email of Object.keys(sseClients)) {
    const clients = sseClients[email] || [];
    for (const client of clients) {
      try {
        client.write(': keepalive\n\n');
      } catch {
        // disconnected
      }
    }
  }
}, 25000);

// SSE endpoint for real-time multi-device sync
app.get('/api/events', (req, res) => {
  const email = (req.query.email as string || '').toLowerCase().trim();
  if (!email) {
    res.status(400).send('Email query parameter required');
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!sseClients[email]) {
    sseClients[email] = [];
  }
  sseClients[email].push(res);

  // Send connected confirmation
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', deviceCount: sseClients[email].length })}\n\n`);

  req.on('close', () => {
    if (sseClients[email]) {
      sseClients[email] = sseClients[email].filter((c) => c !== res);
      if (sseClients[email].length === 0) {
        delete sseClients[email];
      }
    }
  });
});

// Auth: Register (Gmail + Password, unique 1 per gmail constraint)
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'សូមបញ្ចូល Gmail និង ពាក្យសម្ងាត់ (Gmail and Password required)' });
    return;
  }

  const normEmail = email.toLowerCase().trim();

  // Validate email format
  if (!normEmail.includes('@') || !normEmail.includes('.')) {
    res.status(400).json({ error: 'ទម្រង់ Gmail មិនត្រឹមត្រូវ (Invalid Gmail format)' });
    return;
  }

  // Check if Gmail already registered (One gmail can only register once)
  if (db.users[normEmail]) {
    res.status(400).json({
      error: 'Gmail នេះធ្លាប់បានចុះឈ្មោះរួចហើយ! សូម Sign in ចូលប្រើប្រាស់។ (This Gmail is already registered. Please sign in.)',
    });
    return;
  }

  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  const newUser = {
    email: normEmail,
    passwordHash,
    name: name || normEmail.split('@')[0],
    createdAt: new Date().toISOString(),
  };

  db.users[normEmail] = newUser;
  db.userData[normEmail] = createInitialUserData(normEmail);
  saveDB(db);

  res.json({
    success: true,
    user: {
      email: newUser.email,
      name: newUser.name,
      createdAt: newUser.createdAt,
    },
    data: db.userData[normEmail],
  });
});

// Auth: Login (Gmail + Password)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'សូមបញ្ចូល Gmail និង ពាក្យសម្ងាត់ (Gmail and Password required)' });
    return;
  }

  const normEmail = email.toLowerCase().trim();
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  const existingUser = db.users[normEmail];
  if (!existingUser) {
    res.status(404).json({
      error: 'រកមិនឃើញគណនី Gmail នេះទេ! សូម Create Account ជាមុនសិន។ (Gmail account not found. Please create an account.)',
    });
    return;
  }

  if (existingUser.passwordHash !== passwordHash) {
    res.status(401).json({
      error: 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ! (Incorrect password)',
    });
    return;
  }

  // Ensure user data exists
  if (!db.userData[normEmail]) {
    db.userData[normEmail] = createInitialUserData(normEmail);
    saveDB(db);
  }

  res.json({
    success: true,
    user: {
      email: existingUser.email,
      name: existingUser.name,
      createdAt: existingUser.createdAt,
    },
    data: db.userData[normEmail],
  });
});

// Delete account
app.post('/api/auth/delete-account', (req, res) => {
  const { email, password } = req.body;
  const normEmail = (email || '').toLowerCase().trim();
  const passwordHash = crypto.createHash('sha256').update(password || '').digest('hex');

  const user = db.users[normEmail];
  if (!user || user.passwordHash !== passwordHash) {
    res.status(401).json({ error: 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវ (Invalid credentials)' });
    return;
  }

  delete db.users[normEmail];
  delete db.userData[normEmail];
  saveDB(db);

  res.json({ success: true, message: 'គណនីត្រូវបានលុបដោយជោគជ័យ (Account deleted)' });
});

// Get user data (strict isolation per email)
app.get('/api/data', (req, res) => {
  const email = (req.query.email as string || '').toLowerCase().trim();
  if (!email) {
    res.status(400).json({ error: 'Email parameter required' });
    return;
  }

  if (!db.userData[email]) {
    db.userData[email] = createInitialUserData(email);
    saveDB(db);
  }

  res.json({
    success: true,
    data: db.userData[email],
  });
});

// Save and sync user data in real-time across all devices of that email
app.post('/api/data', (req, res) => {
  const { email, data, actionType } = req.body;
  const normEmail = (email || '').toLowerCase().trim();

  if (!normEmail || !data) {
    res.status(400).json({ error: 'Email and data required' });
    return;
  }

  db.userData[normEmail] = data;
  saveDB(db);

  // Real-time broadcast to all devices using this Gmail account
  broadcastToEmail(normEmail, {
    type: 'SYNC_UPDATE',
    actionType: actionType || 'UPDATE',
    data,
    senderTimestamp: Date.now(),
  });

  res.json({
    success: true,
    updatedAt: new Date().toISOString(),
  });
});

// Start Vite in dev mode or serve static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DR-POS Server running on http://0.0.0.0:${PORT} [${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
  });
}

startServer();
