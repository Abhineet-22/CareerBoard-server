import express from 'express';
import { body, validationResult } from 'express-validator';
import Job from '../models/Job.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/jobs — list with optional filters
router.get('/', async (req, res) => {
  try {
    const { category, location, experience, type, q, workArrangement, arrangement } = req.query;
    const filter = {};

    const parseValues = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) {
        return value
          .flatMap(v => String(v).split(','))
          .map(v => v.trim())
          .filter(Boolean);
      }
      return String(value)
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);
    };

    const categoryValues = parseValues(category);
    const experienceValues = parseValues(experience);
    const typeValues = parseValues(type);
    const arrangementValues = parseValues(workArrangement || arrangement);

    if (categoryValues.length === 1)   filter.category = categoryValues[0];
    if (categoryValues.length > 1)     filter.category = { $in: categoryValues };
    if (location)   filter.location = new RegExp(location, 'i');
    if (experienceValues.length === 1) filter.experienceLevel = experienceValues[0];
    if (experienceValues.length > 1)   filter.experienceLevel = { $in: experienceValues };
    if (typeValues.length === 1)       filter.jobType = typeValues[0];
    if (typeValues.length > 1)         filter.jobType = { $in: typeValues };
    if (arrangementValues.length === 1) filter.workArrangement = arrangementValues[0];
    if (arrangementValues.length > 1)   filter.workArrangement = { $in: arrangementValues };
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