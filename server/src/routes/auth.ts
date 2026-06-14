import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { getDb } from '../db/schema.js';
import { JWT_SECRET, JWT_EXPIRES, PASSWORD_MIN_LENGTH, PASSWORD_PATTERN, LOGIN_RATE_WINDOW_MS, LOGIN_RATE_MAX } from '../config.js';

export const authRouter = Router();

// Login rate limiter
const loginLimiter = rateLimit({
  windowMs: LOGIN_RATE_WINDOW_MS,
  max: LOGIN_RATE_MAX,
  message: { error: '登录尝试过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /auth/users — list all users (admin only)
authRouter.get('/users', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user?.role !== 'admin') { res.status(403).json({ error: '仅管理员可查看用户列表' }); return; }
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
  const currentUser = (req as any).user;
  const targetId = parseInt(req.params.id);
  const { password, old_password } = req.body;

  // Only admin can change others' passwords; regular users can only change their own
  if (currentUser?.role !== 'admin' && currentUser?.id !== targetId) {
    res.status(403).json({ error: '只能修改自己的密码' });
    return;
  }

  // Non-admin must provide old password for verification
  if (currentUser?.role !== 'admin') {
    if (!old_password) {
      res.status(400).json({ error: '请提供旧密码' });
      return;
    }
    const db = getDb();
    const targetUser = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(targetId) as any;
    if (!targetUser || !bcrypt.compareSync(old_password, targetUser.password_hash)) {
      res.status(403).json({ error: '旧密码错误' });
      return;
    }
  }

  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    res.status(400).json({ error: `密码至少${PASSWORD_MIN_LENGTH}位，需包含字母和数字` });
    return;
  }
  if (!PASSWORD_PATTERN.test(password)) {
    res.status(400).json({ error: '密码需同时包含字母和数字' });
    return;
  }

  const db = getDb();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, targetId);
  res.json({ ok: true });
});

// POST /auth/login (rate-limited)
authRouter.post('/login', loginLimiter, (req: Request, res: Response) => {
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
  const currentUser = (req as any).user;
  if (currentUser?.role !== 'admin') { res.status(403).json({ error: '仅管理员可创建用户' }); return; }
  const { username, password, display_name, role } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    res.status(400).json({ error: `密码至少${PASSWORD_MIN_LENGTH}位，需包含字母和数字` });
    return;
  }
  if (!PASSWORD_PATTERN.test(password)) {
    res.status(400).json({ error: '密码需同时包含字母和数字' });
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
