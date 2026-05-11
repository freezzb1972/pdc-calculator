import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema.js';

export const gbTablesRouter = Router();

gbTablesRouter.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const ampacity = db.prepare('SELECT * FROM gb_ampacity ORDER BY cable_type, cross_section_mm2').all();
  const derating = db.prepare('SELECT * FROM gb_derating ORDER BY factor_type').all();
  const safety = db.prepare('SELECT * FROM gb_safety_rules ORDER BY rule_code').all();
  const versions = {
    ampacity: db.prepare('SELECT DISTINCT version FROM gb_ampacity').all(),
    derating: db.prepare('SELECT DISTINCT version FROM gb_derating').all(),
    safety: db.prepare('SELECT DISTINCT version FROM gb_safety_rules').all(),
  };
  res.json({ ampacity, derating, safety, versions });
});

gbTablesRouter.put('/ampacity/:id', (req: Request, res: Response) => {
  const db = getDb();
  const { current_rating_a } = req.body;
  db.prepare('UPDATE gb_ampacity SET current_rating_a=? WHERE id=?').run(current_rating_a, req.params.id);
  res.json({ ok: true });
});

gbTablesRouter.put('/derating/:id', (req: Request, res: Response) => {
  const db = getDb();
  const { factor_value, condition_desc } = req.body;
  db.prepare('UPDATE gb_derating SET condition_desc=?, factor_value=? WHERE id=?').run(condition_desc, factor_value, req.params.id);
  res.json({ ok: true });
});

gbTablesRouter.put('/safety/:id', (req: Request, res: Response) => {
  const db = getDb();
  const { min_value, max_value, description } = req.body;
  db.prepare('UPDATE gb_safety_rules SET description=?, min_value=?, max_value=? WHERE id=?').run(description, min_value, max_value, req.params.id);
  res.json({ ok: true });
});

gbTablesRouter.get('/version', (_req: Request, res: Response) => {
  const db = getDb();
  const ampacityVersions = db.prepare('SELECT DISTINCT version FROM gb_ampacity').all() as any[];
  const safetyVersions = db.prepare('SELECT DISTINCT version FROM gb_safety_rules').all() as any[];
  res.json({
    ampacity: ampacityVersions.map(v => v.version).join(', ') || '未加载',
    safety: safetyVersions.map(v => v.version).join(', ') || '未加载',
    updated_at: new Date().toLocaleString('zh-CN'),
  });
});

gbTablesRouter.post('/import/ampacity', (req: Request, res: Response) => {
  const db = getDb();
  const rows = req.body.rows || [];
  let count = 0;
  const insert = db.prepare(
    'INSERT OR REPLACE INTO gb_ampacity (cable_type, installation_method, cross_section_mm2, current_rating_a, temperature_base, version) VALUES (?,?,?,?,?,?)'
  );
  const txn = db.transaction(() => {
    for (const r of rows) { insert.run(r.cable_type, r.installation_method, r.cross_section_mm2, r.current_rating_a, r.temperature_base || 30, r.version || 'GB/T 16895-2025'); count++; }
  });
  txn();
  res.json({ imported: count });
});
