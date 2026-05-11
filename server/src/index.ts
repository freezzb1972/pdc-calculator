import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './db/schema.js';
import { seedDatabase } from './db/seed.js';
import { projectsRouter } from './routes/projects.js';
import { circuitsRouter } from './routes/circuits.js';
import { filtersRouter } from './routes/filters.js';
import { cablesRouter } from './routes/cables.js';
import { gbTablesRouter } from './routes/gb-tables.js';
import { pricesRouter } from './routes/prices.js';
import { exportRouter } from './routes/export.js';
import { authRouter } from './routes/auth.js';
import { selectionRulesRouter } from './routes/selection-rules.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Ensure DB is initialized and seeded
getDb();
seedDatabase();

// API routes
app.use('/api/projects', projectsRouter);
app.use('/api/circuits', circuitsRouter);
app.use('/api/filters', filtersRouter);
app.use('/api/cables', cablesRouter);
app.use('/api/gb-tables', gbTablesRouter);
app.use('/api/prices', pricesRouter);
app.use('/api/selection-rules', selectionRulesRouter);
app.use('/api/auth', authRouter);
app.use('/api/export', exportRouter);

// Serve static frontend in production
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`PDC Calculator API running on http://localhost:${PORT}`);
});
