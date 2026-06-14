import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './db/schema.js';
import { seedDatabase } from './db/seed.js';
import { requireAuth, authRouter } from './routes/auth.js';
import { projectsRouter } from './routes/projects.js';
import { circuitsRouter } from './routes/circuits.js';
import { filtersRouter } from './routes/filters.js';
import { cablesRouter } from './routes/cables.js';
import { gbTablesRouter } from './routes/gb-tables.js';
import { pricesRouter } from './routes/prices.js';
import { exportRouter } from './routes/export.js';
import { selectionRulesRouter } from './routes/selection-rules.js';
import { PORT } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Ensure DB is initialized and seeded
getDb();
seedDatabase();

// Auth routes — mounted before global auth guard (login/me are public)
app.use('/api/auth', authRouter);

// Global auth guard for all other API routes
app.use('/api', requireAuth);

// API routes
app.use('/api/projects', projectsRouter);
app.use('/api/circuits', circuitsRouter);
app.use('/api/filters', filtersRouter);
app.use('/api/cables', cablesRouter);
app.use('/api/gb-tables', gbTablesRouter);
app.use('/api/prices', pricesRouter);
app.use('/api/selection-rules', selectionRulesRouter);
app.use('/api/export', exportRouter);

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: '文件过大，最大允许 5MB' });
    return;
  }
  console.error('[PDC Error]', err.stack || err.message || err);
  res.status(500).json({ error: '服务器内部错误' });
});

// Serve static frontend in production
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`PDC Calculator API running on http://localhost:${PORT}`);
});
