import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/schema.js';

const JWT_SECRET = process.env.JWT_SECRET || 'pdc-calculator-secret-key-change-in-production';
const JWT_EXPIRES = '7d';

export const authRouter = Router();

// GET /auth/users — list all users
authRouter.get('/users', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const users = db.prepare('SELECT id, username, display_name, role, created_at FROM users ORDER BY id').all();
  res.json(users);
});

// DELETE /auth/users/:id — delete user (admin only)
authRouter.delete('/users/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user?.role !== 'admin') { res.status(403).json({ error: '仅管理员可删除用户' }); return; }
  const db = getDb();
  const id = parseInt(req.params.id);
  if (id === 1) { res.status(400).json({ error: '不能删除默认管理员' }); return; }
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});

// PUT /auth/users/:id/password — change password
authRouter.put('/users/:id/password', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const { password } = req.body;
  if (!password || password.length < 6) { res.status(400).json({ error: '密码至少6位' }); return; }
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
  res.json({ ok: true });
});

// POST /auth/login
authRouter.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  if (!user) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, display_name: user.display_name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role },
  });
});

// GET /auth/me — verify token and return current user
authRouter.get('/me', (req: Request, res: Response) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: '未登录' });
    return;
  }

  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as any;
    const db = getDb();
    const user = db.prepare('SELECT id, username, display_name, role, created_at FROM users WHERE id = ?').get(payload.id);
    if (!user) { res.status(401).json({ error: '用户不存在' }); return; }
    res.json(user);
  } catch {
    res.status(401).json({ error: 'Token 无效或已过期' });
  }
});

// Auth middleware — use this on routes that require login
export function requireAuth(req: Request, res: Response, next: () => void) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: '请先登录' });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as any;
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token 无效或已过期' });
  }
}

// POST /auth/register (admin only for team use)
authRouter.post('/register', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user?.role !== 'admin') { res.status(403).json({ error: '仅管理员可创建用户' }); return; }
  const { username, password, display_name, role } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: '密码至少6位' });
    return;
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    res.status(409).json({ error: '用户名已存在' });
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  const r = db.prepare('INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)')
    .run(username, hash, display_name || username, role || 'editor');
  res.json({ id: r.lastInsertRowid, username, display_name: display_name || username, role: role || 'editor' });
});
