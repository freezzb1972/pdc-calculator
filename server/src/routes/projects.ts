import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema.js';
import { estimateCableLength } from '../engine/calculator.js';

export const projectsRouter = Router();

// Update room
projectsRouter.put('/room/:id', (req: Request, res: Response) => {
  const db = getDb();
  const { room_type, length_m, width_m, height_m, light_model, light_count, light_circuits } = req.body;
  db.prepare(
    `UPDATE rooms SET room_type=?, length_m=?, width_m=?, height_m=?, light_model=?, light_count=?, light_circuits=? WHERE id=?`
  ).run(room_type, length_m, width_m, height_m, light_model || '', light_count || 0, light_circuits || 0, req.params.id);
  res.json({ ok: true });
});

projectsRouter.post('/room', (req: Request, res: Response) => {
  const db = getDb();
  const { project_id, room_type, length_m, width_m, height_m, light_model, light_count, light_circuits } = req.body;
  const result = db.prepare(
    `INSERT INTO rooms (project_id, room_type, length_m, width_m, height_m, light_model, light_count, light_circuits)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(project_id, room_type || '暗室', length_m, width_m, height_m, light_model || '', light_count || 0, light_circuits || 0);
  res.json({ id: result.lastInsertRowid });
});

projectsRouter.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const projects = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all();
  res.json(projects);
});

projectsRouter.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
  const rooms = db.prepare('SELECT * FROM rooms WHERE project_id = ?').all(req.params.id);
  res.json({ ...project as any, rooms });
});

// Layout data for visual editor
projectsRouter.get('/:id/layout', (req: Request, res: Response) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any;
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
  const rooms = db.prepare('SELECT * FROM rooms WHERE project_id = ?').all(req.params.id) as any[];
  for (const room of rooms) {
    const circuits = db.prepare(`
      SELECT c.*, f.model_name as filter_model, f.current_rating_a, f.phases
      FROM circuits c LEFT JOIN filters f ON c.filter_id = f.id
      WHERE c.room_id = ? ORDER BY c.id
    `).all(room.id) as any[];
    for (const circuit of circuits) {
      const segments = db.prepare(`
        SELECT s.*, cs.model_name as cable_model, cs.cross_section_mm2, cs.max_current_a
        FROM cable_segments s LEFT JOIN cable_specs cs ON s.cable_spec_id = cs.id
        WHERE s.circuit_id = ? ORDER BY s.id
      `).all(circuit.id) as any[];
      for (const seg of segments) {
        const devices = db.prepare('SELECT * FROM devices WHERE segment_id = ?').all(seg.id) as any[];
        seg.devices = devices;
        // Calculate estimated length if coordinates are available
        if (seg.from_x != null && seg.to_x != null) {
          seg.estimated_length = estimateCableLength(
            room.length_m, room.width_m, room.height_m,
            seg.from_x, seg.from_y || 0, seg.to_x, seg.to_y || 0,
            true, 2.5
          );
        } else {
          seg.estimated_length = null;
        }
      }
      circuit.segments = segments;
    }
    room.circuits = circuits;
  }
  project.rooms = rooms;
  res.json(project);
});

// Update cable segment route coordinates
projectsRouter.put('/circuits/segment-route/:id', (req: Request, res: Response) => {
  const db = getDb();
  const { from_x, from_y, to_x, to_y, length_m } = req.body;
  db.prepare(
    'UPDATE cable_segments SET from_x=?, from_y=?, to_x=?, to_y=?, length_m=? WHERE id=?'
  ).run(from_x ?? null, from_y ?? null, to_x ?? null, to_y ?? null, length_m ?? 0, req.params.id);
  res.json({ ok: true });
});

projectsRouter.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { name, description } = req.body;
  const result = db.prepare('INSERT INTO projects (name, description) VALUES (?, ?)').run(name, description || '');
  res.json({ id: result.lastInsertRowid, name, description });
});

projectsRouter.put('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const { name, description } = req.body;
  db.prepare("UPDATE projects SET name=?, description=?, updated_at=datetime('now','localtime') WHERE id=?")
    .run(name, description || '', req.params.id);
  res.json({ ok: true });
});

// Delete room
projectsRouter.delete('/room/:id', (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

projectsRouter.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
