import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import Candidate from '../models/Candidate.js';
import Recruiter from '../models/Recruiter.js';
import Admin from '../models/Admin.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();
const allowedRoles = ['Candidate', 'Recruiter', 'Admin'];

function getModel(role) {
  return role === 'Candidate' ? Candidate : role === 'Recruiter' ? Recruiter : role === 'Admin' ? Admin : null;
}

async function findUserByEmail(email) {
  const normalized = email.toLowerCase();
  return await Candidate.findOne({ email: normalized })
    || await Recruiter.findOne({ email: normalized })
    || await Admin.findOne({ email: normalized });
}

router.use(requireAuth, requireRole('Admin'));

router.get('/users', async (req, res) => {
  const role = req.query.role || 'Candidate';
  const Model = getModel(role);
  if (!Model) return res.status(400).json({ error: 'Invalid role.' });

  try {
    const users = await Model.find().select('_id name email role createdAt updatedAt');
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/users/:role/:id', async (req, res) => {
  const { role, id } = req.params;
  const Model = getModel(role);
  if (!Model) return res.status(400).json({ error: 'Invalid role.' });

  try {
    const user = await Model.findById(id).select('_id name email role createdAt updatedAt');
    if (!user) return res.status(404).json({ error: `${role} not found.` });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/users/:role', [
  body('name').trim().isLength({ min: 2 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  const { role } = req.params;
  const Model = getModel(role);
  if (!Model) return res.status(400).json({ error: 'Invalid role.' });

  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, email, password } = req.body;
    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered.' });

    const hash = await bcrypt.hash(password, 10);
    const user = await Model.create({ name, email, password: hash, role });
    return res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/users/:role/:id', [
  body('name').optional().trim().isLength({ min: 2 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('password').optional().isLength({ min: 6 }),
], async (req, res) => {
  const { role, id } = req.params;
  const Model = getModel(role);
  if (!Model) return res.status(400).json({ error: 'Invalid role.' });

  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const updates = {};
    const { name, email, password } = req.body;
    if (name) updates.name = name;
    if (email) {
      const existing = await findUserByEmail(email);
      if (existing && String(existing._id) !== id) return res.status(409).json({ error: 'Email already registered.' });
      updates.email = email.toLowerCase();
    }
    if (password) updates.password = await bcrypt.hash(password, 10);

    const user = await Model.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).select('_id name email role createdAt updatedAt');
    if (!user) return res.status(404).json({ error: `${role} not found.` });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:role/:id', async (req, res) => {
  const { role, id } = req.params;
  const Model = getModel(role);
  if (!Model) return res.status(400).json({ error: 'Invalid role.' });

  try {
    const user = await Model.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ error: `${role} not found.` });
    return res.json({ message: `${role} deleted successfully.` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
