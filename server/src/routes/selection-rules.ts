import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema.js';

export const selectionRulesRouter = Router();

selectionRulesRouter.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const rules = db.prepare(`
    SELECT sr.*, cs.model_name as cable_model, cs.cross_section_mm2 as cable_section, cs.max_current_a
    FROM selection_rules sr
    LEFT JOIN cable_specs cs ON sr.recommended_cable_id = cs.id
    ORDER BY sr.phases, sr.filter_current_min
  `).all();
  res.json(rules);
});

selectionRulesRouter.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { filter_current_min, filter_current_max, phases, min_cross_section_mm2, recommended_cable_id, connector_type, notes } = req.body;
  try {
    const r = db.prepare(
      `INSERT INTO selection_rules (filter_current_min, filter_current_max, phases, min_cross_section_mm2, recommended_cable_id, connector_type, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      filter_current_min ?? null, filter_current_max ?? null, phases || '单相',
      min_cross_section_mm2 ?? null, recommended_cable_id || null,
      connector_type || '', notes || ''
    );
    res.json({ id: r.lastInsertRowid });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

selectionRulesRouter.put('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const { filter_current_min, filter_current_max, phases, min_cross_section_mm2, recommended_cable_id, connector_type, notes } = req.body;
  db.prepare(
    `UPDATE selection_rules SET filter_current_min=?, filter_current_max=?, phases=?, min_cross_section_mm2=?, recommended_cable_id=?, connector_type=?, notes=? WHERE id=?`
  ).run(
    filter_current_min ?? null, filter_current_max ?? null, phases,
    min_cross_section_mm2 ?? null, recommended_cable_id || null,
    connector_type || '', notes || '', req.params.id
  );
  res.json({ ok: true });
});

selectionRulesRouter.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM selection_rules WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
