import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import Candidate from '../models/Candidate.js';
import Recruiter from '../models/Recruiter.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const modelByRole = {
  Candidate,
  Recruiter,
};

async function findUserByEmail(email) {
  const normalizedEmail = email.toLowerCase();
  const candidate = await Candidate.findOne({ email: normalizedEmail });
  if (candidate) return candidate;
  return Recruiter.findOne({ email: normalizedEmail });
}

function signToken(user) {
  return jwt.sign(
    { role: user.role, email: user.email },
    process.env.JWT_SECRET || 'dev_jwt_secret_change_me',
    { subject: String(user._id), expiresIn: '7d' }
  );
}

router.post('/register', [
  body('name').trim().isLength({ min: 2 }),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['Candidate', 'Recruiter']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, email, password, role } = req.body;
    const Model = modelByRole[role];
    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered.' });

    const hash = await bcrypt.hash(password, 10);
    const user = await Model.create({ name, email, password: hash, role });
    const token = signToken(user);

    return res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;
    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = signToken(user);
    return res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const Model = modelByRole[req.user.role];
    if (!Model) return res.status(401).json({ error: 'Invalid role in token.' });

    const user = await Model.findById(req.user.id).select('_id name email role');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
