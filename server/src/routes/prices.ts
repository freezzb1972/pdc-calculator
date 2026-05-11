import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema.js';

export const pricesRouter = Router();

pricesRouter.get('/history', (req: Request, res: Response) => {
  const db = getDb();
  const { item_type, limit } = req.query;
  let query = 'SELECT * FROM price_history';
  const params: any[] = [];
  if (item_type) { query += ' WHERE item_type=?'; params.push(item_type); }
  query += ' ORDER BY changed_at DESC LIMIT ?';
  params.push(Number(limit) || 100);
  res.json(db.prepare(query).all(...params));
});

pricesRouter.post('/import', (req: Request, res: Response) => {
  const db = getDb();
  const { type, items } = req.body; // type = 'filter' | 'cable'
  if (!type || !items) { res.status(400).json({ error: 'Need type and items' }); return; }
  let count = 0;
  const txn = db.transaction(() => {
    if (type === 'filter') {
      for (const item of items) {
        const old = db.prepare('SELECT unit_price FROM filters WHERE id=?').get(item.id) as any;
        db.prepare("UPDATE filters SET unit_price=?, updated_at=datetime('now','localtime') WHERE id=?").run(item.unit_price, item.id);
        if (old) {
          db.prepare("INSERT INTO price_history (item_type, item_id, old_price, new_price, source) VALUES ('filter', ?, ?, ?, 'batch_import')").run(item.id, old.unit_price, item.unit_price);
        }
        count++;
      }
    } else if (type === 'cable') {
      for (const item of items) {
        const old = db.prepare('SELECT unit_price FROM cable_specs WHERE id=?').get(item.id) as any;
        db.prepare('UPDATE cable_specs SET unit_price=? WHERE id=?').run(item.unit_price, item.id);
        if (old) {
          db.prepare("INSERT INTO price_history (item_type, item_id, old_price, new_price, source) VALUES ('cable', ?, ?, ?, 'batch_import')").run(item.id, old.unit_price, item.unit_price);
        }
        count++;
      }
    }
  });
  txn();
  res.json({ imported: count });
});
