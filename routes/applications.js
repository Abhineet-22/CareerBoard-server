import express from 'express';
import multer from 'multer';
import { body, validationResult } from 'express-validator';
import Application from '../models/Application.js';
import upload from '../middleware/uploads.js';
import { applicationLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// POST /api/applications — submit a candidate application
router.post('/', applicationLimiter, upload.single('resume'), [
  body('jobId').notEmpty(),
  body('firstName').notEmpty(),
  body('email').isEmail(),
  body('phone').notEmpty(),
  body('coverMessage').trim().isLength({ min: 100 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  if (!req.file) return res.status(400).json({ error: 'Resume file is required.' });

  try {
    const application = await Application.create({
      ...req.body,
      skills: JSON.parse(req.body.skills || '[]'),
      resumePath: req.file?.path,
    });
    res.status(201).json(application);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/applications/:jobId — list applicants for a job
router.get('/:jobId', async (req, res) => {
  try {
    const apps = await Application.find({ jobId: req.params.jobId }).sort({ createdAt: -1 });
    res.json(apps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Convert multer errors to readable 4xx responses.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Resume file is too large. Max size is 5 MB.' });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err?.message?.includes('Only PDF, DOC, or DOCX files are allowed.')) {
    return res.status(400).json({ error: err.message });
  }

  return next(err);
});

export default router;