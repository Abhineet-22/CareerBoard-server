import express from 'express';
import { body, validationResult } from 'express-validator';
import Job from '../models/Job.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/jobs — list with optional filters
router.get('/', async (req, res) => {
  try {
    const { category, location, experience, type, q } = req.query;
    const filter = {};
    if (category)   filter.category = category;
    if (location)   filter.location = new RegExp(location, 'i');
    if (experience) filter.experienceLevel = experience;
    if (type)       filter.jobType = type;
    if (q)          filter.$or = [
      { jobTitle:     new RegExp(q, 'i') },
      { companyName:  new RegExp(q, 'i') },
      { skills:       new RegExp(q, 'i') },
    ];

    const jobs = await Job.find(filter).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs — create a new job
router.post('/', requireAuth, requireRole('Recruiter'), [
  body('companyName').notEmpty(),
  body('contactEmail').isEmail(),
  body('jobTitle').notEmpty(),
  body('description').isLength({ min: 80 }),
  body('skills').isArray({ min: 1 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const job = await Job.create(req.body);
    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;