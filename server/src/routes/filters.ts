import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema.js';
import multer from 'multer';

export const filtersRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

filtersRouter.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { search } = req.query;
  let filters;
  if (search) {
    filters = db.prepare(
      "SELECT * FROM filters WHERE model_name LIKE ? OR manufacturer LIKE ? ORDER BY model_name"
    ).all(`%${search}%`, `%${search}%`);
  } else {
    filters = db.prepare('SELECT * FROM filters ORDER BY manufacturer, model_name').all();
  }
  res.json(filters);
});

filtersRouter.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const filter = db.prepare('SELECT * FROM filters WHERE id = ?').get(req.params.id);
  if (!filter) { res.status(404).json({ error: 'Filter not found' }); return; }
  res.json(filter);
});

filtersRouter.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { model_name, manufacturer, voltage_rating_v, current_rating_a, phases, wire_count, dimensions, unit_price, category } = req.body;
  try {
    const r = db.prepare(
      `INSERT INTO filters (model_name, manufacturer, voltage_rating_v, current_rating_a, phases, wire_count, dimensions, unit_price, category)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).run(model_name, manufacturer || '坚力', voltage_rating_v, current_rating_a, phases || '单相', wire_count || 2, dimensions || '', unit_price || 0, category || '暗室设备');
    // Log price history
    if (unit_price > 0) {
      db.prepare("INSERT INTO price_history (item_type, item_id, old_price, new_price, source) VALUES ('filter', ?, 0, ?, 'initial')")
        .run(r.lastInsertRowid, unit_price);
    }
    res.json({ id: r.lastInsertRowid });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

filtersRouter.put('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const old = db.prepare('SELECT * FROM filters WHERE id = ?').get(req.params.id) as any;
  const { model_name, manufacturer, voltage_rating_v, current_rating_a, phases, wire_count, dimensions, unit_price, category } = req.body;
  db.prepare(
    `UPDATE filters SET model_name=?, manufacturer=?, voltage_rating_v=?, current_rating_a=?, phases=?, wire_count=?, dimensions=?, unit_price=?, category=?, updated_at=datetime('now','localtime') WHERE id=?`
  ).run(
    model_name, manufacturer, voltage_rating_v, current_rating_a, phases, wire_count, dimensions, unit_price, category, req.params.id
  );
  if (old && unit_price !== undefined && old.unit_price !== unit_price) {
    db.prepare("INSERT INTO price_history (item_type, item_id, old_price, new_price, source) VALUES ('filter', ?, ?, ?, 'manual')")
      .run(req.params.id, old.unit_price, unit_price);
  }
  res.json({ ok: true });
});

filtersRouter.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM filters WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Batch import from Excel (JSON format)
filtersRouter.post('/import', upload.single('file'), (req: Request, res: Response) => {
  const db = getDb();
  const filters = req.body.filters || (req.file ? JSON.parse(req.file.buffer.toString()) : []);
  let count = 0;
  const insert = db.prepare(
    `INSERT OR REPLACE INTO filters (model_name, manufacturer, voltage_rating_v, current_rating_a, phases, wire_count, unit_price, category)
     VALUES (?,?,?,?,?,?,?,?)`
  );
  const txn = db.transaction(() => {
    for (const f of filters) {
      insert.run(f.model_name, f.manufacturer || '坚力', f.voltage_rating_v, f.current_rating_a, f.phases || '单相', f.wire_count || 2, f.unit_price || 0, f.category || '暗室设备');
      count++;
    }
  });
  txn();
  res.json({ imported: count });
});

// Export all filters
filtersRouter.get('/export/all', (_req: Request, res: Response) => {
  const db = getDb();
  const filters = db.prepare('SELECT * FROM filters ORDER BY manufacturer, model_name').all();
  res.json(filters);
});
