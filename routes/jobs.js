import express from 'express';
import { body, validationResult } from 'express-validator';
import Job from '../models/Job.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/jobs — list with optional filters
router.get('/', requireAuth, requireRole('Candidate'), async (req, res) => {
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

// GET /api/jobs/mine — list jobs posted by signed-in recruiter
router.get('/mine', requireAuth, requireRole('Recruiter'), async (req, res) => {
  try {
    const jobs = await Job.find({ recruiterId: req.user.id }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs — create a new job
router.post('/', requireAuth, requireRole('Recruiter'), [
  body('companyName').trim().isLength({ min: 2, max: 80 }),
  body('contactEmail').isEmail(),
  body('jobTitle').trim().isLength({ min: 3, max: 120 }),
  body('description').trim().isLength({ min: 80, max: 1200 }),
  body('location').trim().isLength({ min: 2, max: 120 }),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  body('skills').isArray({ min: 1 }),
  body('skills.*').trim().isLength({ min: 1, max: 40 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const job = await Job.create({
      ...req.body,
      recruiterId: req.user.id,
    });
    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/jobs/:id — update a recruiter's own posted job
router.put('/:id', requireAuth, requireRole('Recruiter'), [
  body('companyName').optional().trim().isLength({ min: 2, max: 80 }),
  body('contactEmail').optional().isEmail(),
  body('jobTitle').optional().trim().isLength({ min: 3, max: 120 }),
  body('description').optional().trim().isLength({ min: 80, max: 1200 }),
  body('location').optional().trim().isLength({ min: 2, max: 120 }),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  body('skills').optional().isArray({ min: 1 }),
  body('skills.*').optional().trim().isLength({ min: 1, max: 40 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    if (String(job.recruiterId) !== req.user.id) {
      return res.status(403).json({ error: 'You can update only your own jobs.' });
    }

    const updatableFields = [
      'companyName',
      'website',
      'industry',
      'companySize',
      'contactEmail',
      'jobTitle',
      'category',
      'experienceLevel',
      'description',
      'skills',
      'jobType',
      'workArrangement',
      'location',
      'salaryMin',
      'salaryMax',
      'currency',
      'notes',
    ];

    updatableFields.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        job[key] = req.body[key];
      }
    });

    await job.save();
    return res.json(job);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/jobs/:id — delete a recruiter's own posted job
router.delete('/:id', requireAuth, requireRole('Recruiter'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    if (String(job.recruiterId) !== req.user.id) {
      return res.status(403).json({ error: 'You can delete only your own jobs.' });
    }

    await Job.deleteOne({ _id: job._id });
    return res.json({ message: 'Job deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;