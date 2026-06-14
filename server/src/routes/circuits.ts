import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema.js';
import { recommendCable } from '../engine/selector.js';
import { validate } from '../validate.js';

export const circuitsRouter = Router();

// Recommend cable spec based on filter
circuitsRouter.get('/recommend', (req: Request, res: Response) => {
  const db = getDb();
  const filterId = parseInt(req.query.filter_id as string);
  if (!filterId) { res.status(400).json({ error: 'filter_id required' }); return; }
  const filter = db.prepare('SELECT * FROM filters WHERE id = ?').get(filterId) as any;
  if (!filter) { res.status(404).json({ error: 'Filter not found' }); return; }
  const rec = recommendCable({
    current_rating_a: filter.current_rating_a,
    phases: filter.phases,
    voltage_rating_v: filter.voltage_rating_v,
  });
  if (!rec) { res.json({ recommended: null }); return; }
  // Include all available cable specs for comparison
  const allCables = db.prepare('SELECT id as cable_spec_id, model_name, cross_section_mm2, max_current_a, unit_price FROM cable_specs ORDER BY max_current_a ASC').all();
  res.json({ recommended: rec, all_cables: allCables });
});

// Get circuits for a room
circuitsRouter.get('/by-room/:roomId', (req: Request, res: Response) => {
  const db = getDb();
  const circuits = db.prepare(`
    SELECT c.*, f.model_name as filter_model, f.phases, f.current_rating_a
    FROM circuits c LEFT JOIN filters f ON c.filter_id = f.id
    WHERE c.room_id = ? ORDER BY c.id
  `).all(req.params.roomId);
  res.json(circuits);
});

// Create circuit
circuitsRouter.post('/', (req: Request, res: Response) => {
  const v = validate(req.body, {
    room_id: { required: true, type: 'number' },
    name: { required: true, type: 'string', minLength: 1 },
    voltage_type: { required: true, type: 'string' },
    load_current_a: { required: true, type: 'number', min: 0 },
  });
  if (!v.valid) { res.status(400).json({ error: v.errors.join('; ') }); return; }
  const db = getDb();
  const { room_id, filter_id, name, purpose, voltage_type, load_current_a, notes } = req.body;
  const r = db.prepare(
    'INSERT INTO circuits (room_id, filter_id, name, purpose, voltage_type, load_current_a, notes) VALUES (?,?,?,?,?,?,?)'
  ).run(room_id, filter_id || null, name, purpose || '设备', voltage_type || '单相220V', load_current_a || 0, notes || '');
  res.json({ id: r.lastInsertRowid });
});

// Update circuit
circuitsRouter.put('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const { filter_id, name, purpose, voltage_type, load_current_a, notes } = req.body;
  db.prepare(
    'UPDATE circuits SET filter_id=?, name=?, purpose=?, voltage_type=?, load_current_a=?, notes=? WHERE id=?'
  ).run(filter_id || null, name, purpose, voltage_type, load_current_a, notes || '', req.params.id);
  res.json({ ok: true });
});

// Delete circuit
circuitsRouter.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM circuits WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Get segments for a circuit
circuitsRouter.get('/:id/segments', (req: Request, res: Response) => {
  const db = getDb();
  const segments = db.prepare(`
    SELECT s.*, cs.model_name as cable_model, cs.cross_section_mm2, cs.max_current_a, cs.unit_price as cable_price
    FROM cable_segments s LEFT JOIN cable_specs cs ON s.cable_spec_id = cs.id
    WHERE s.circuit_id = ? ORDER BY s.id
  `).all(req.params.id);
  // Get devices for each segment
  const segmentsWithDevices = (segments as any[]).map(s => {
    const devices = db.prepare('SELECT * FROM devices WHERE segment_id = ?').all(s.id);
    return { ...s, devices };
  });
  res.json(segmentsWithDevices);
});

// Create segment
circuitsRouter.post('/segments', (req: Request, res: Response) => {
  const v = validate(req.body, {
    circuit_id: { required: true, type: 'number' },
    segment_type: { required: true, type: 'string' },
    cable_spec_id: { required: true, type: 'number' },
    length_m: { required: true, type: 'number', min: 0 },
  });
  if (!v.valid) { res.status(400).json({ error: v.errors.join('; ') }); return; }
  const db = getDb();
  const { circuit_id, parent_segment_id, segment_type, cable_spec_id, length_m, parallel_count, from_location, to_location } = req.body;
  const r = db.prepare(
    'INSERT INTO cable_segments (circuit_id, parent_segment_id, segment_type, cable_spec_id, length_m, parallel_count, from_location, to_location) VALUES (?,?,?,?,?,?,?,?)'
  ).run(circuit_id, parent_segment_id || null, segment_type || 'trunk', cable_spec_id || null, length_m || 0, parallel_count || 1, from_location || '', to_location || '');
  res.json({ id: r.lastInsertRowid });
});

// Update segment
circuitsRouter.put('/segments/:id', (req: Request, res: Response) => {
  const db = getDb();
  const { cable_spec_id, segment_type, parent_segment_id, length_m, parallel_count, from_location, to_location } = req.body;
  db.prepare(
    'UPDATE cable_segments SET cable_spec_id=?, segment_type=?, parent_segment_id=?, length_m=?, parallel_count=?, from_location=?, to_location=? WHERE id=?'
  ).run(cable_spec_id, segment_type || 'trunk', parent_segment_id || null, length_m, parallel_count, from_location, to_location, req.params.id);
  res.json({ ok: true });
});

// Delete segment — nullify child references first to avoid FK violations
circuitsRouter.delete('/segments/:id', (req: Request, res: Response) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  // Unlink children before deleting parent (SQLite can't alter FK ON DELETE after creation)
  db.prepare('UPDATE cable_segments SET parent_segment_id = NULL WHERE parent_segment_id = ?').run(id);
  db.prepare('DELETE FROM cable_segments WHERE id = ?').run(id);
  res.json({ ok: true });
});

// Create device on segment
circuitsRouter.post('/devices', (req: Request, res: Response) => {
  const v = validate(req.body, {
    segment_id: { required: true, type: 'number' },
    device_type: { required: true, type: 'string' },
    quantity: { required: true, type: 'number', min: 1 },
  });
  if (!v.valid) { res.status(400).json({ error: v.errors.join('; ') }); return; }
  const db = getDb();
  const { segment_id, device_type, model, rating_v, rating_a, quantity, unit_price } = req.body;
  const r = db.prepare(
    'INSERT INTO devices (segment_id, device_type, model, rating_v, rating_a, quantity, unit_price) VALUES (?,?,?,?,?,?,?)'
  ).run(segment_id, device_type, model || '', rating_v || 220, rating_a || 10, quantity || 1, unit_price || 0);
  res.json({ id: r.lastInsertRowid });
});

// Update device
circuitsRouter.put('/devices/:id', (req: Request, res: Response) => {
  const db = getDb();
  const { device_type, model, rating_v, rating_a, quantity, unit_price } = req.body;
  db.prepare(
    'UPDATE devices SET device_type=?, model=?, rating_v=?, rating_a=?, quantity=?, unit_price=? WHERE id=?'
  ).run(device_type, model || '', rating_v || 220, rating_a || 10, quantity || 1, unit_price || 0, req.params.id);
  res.json({ ok: true });
});

// Drag chain calculation
circuitsRouter.post('/calc-dragchain', (req: Request, res: Response) => {
  const p = req.body;
  const radius = p.turntableRadius || 4;
  const angle = p.rotationAngle || 270;
  const chainLength = Math.PI * radius * angle / 180 + 1.5;
  const bendRadius = Math.max((p.cableBendRadius || 120) * 1.5, 200);
  res.json({
    chain_length_m: parseFloat(chainLength.toFixed(2)),
    bending_radius_mm: bendRadius,
    cable_count: p.cableCount || 4,
    total_cable_length_m: parseFloat((chainLength * (p.cableCount || 4)).toFixed(2)),
    note: '估算公式待工程师确认',
  });
});

// Delete device
circuitsRouter.delete('/devices/:id', (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM devices WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
