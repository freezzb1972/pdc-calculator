import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema.js';

export const cablesRouter = Router();

cablesRouter.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const cables = db.prepare('SELECT * FROM cable_specs ORDER BY cross_section_mm2').all();
  res.json(cables);
});

cablesRouter.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { model_name, conductor_material, insulation, cross_section_mm2, core_count, voltage_rating_kv, shielded, max_current_a, unit_price } = req.body;
  try {
    const r = db.prepare(
      'INSERT INTO cable_specs (model_name, conductor_material, insulation, cross_section_mm2, core_count, voltage_rating_kv, shielded, max_current_a, unit_price) VALUES (?,?,?,?,?,?,?,?,?)'
    ).run(model_name, conductor_material || '铜芯', insulation || 'PVC', cross_section_mm2, core_count || 3, voltage_rating_kv || '0.6/1KV', shielded || 0, max_current_a || 0, unit_price || 0);
    res.json({ id: r.lastInsertRowid });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

cablesRouter.put('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const { model_name, conductor_material, insulation, cross_section_mm2, core_count, max_current_a, unit_price } = req.body;
  db.prepare(
    'UPDATE cable_specs SET model_name=?, conductor_material=?, insulation=?, cross_section_mm2=?, core_count=?, max_current_a=?, unit_price=? WHERE id=?'
  ).run(model_name, conductor_material, insulation, cross_section_mm2, core_count, max_current_a, unit_price, req.params.id);
  res.json({ ok: true });
});

cablesRouter.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM cable_specs WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

cablesRouter.post('/import', (req: Request, res: Response) => {
  const db = getDb();
  const cables = req.body.cables || [];
  let count = 0;
  const insert = db.prepare(
    'INSERT OR REPLACE INTO cable_specs (model_name, conductor_material, insulation, cross_section_mm2, core_count, max_current_a, unit_price) VALUES (?,?,?,?,?,?,?)'
  );
  const txn = db.transaction(() => {
    for (const c of cables) { insert.run(c.model_name, c.conductor_material || '铜芯', c.insulation || 'PVC', c.cross_section_mm2, c.core_count || 3, c.max_current_a || 0, c.unit_price || 0); count++; }
  });
  txn();
  res.json({ imported: count });
});
