import express from 'express';
import { body, validationResult } from 'express-validator';
import Application from '../models/Application.js';
import upload from '../middleware/uploads.js';

const router = express.Router();

// POST /api/applications — submit a candidate application
router.post('/', upload.single('resume'), [
  body('jobId').notEmpty(),
  body('firstName').notEmpty(),
  body('email').isEmail(),
  body('phone').notEmpty(),
  body('coverMessage').isLength({ min: 100 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

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

export default router;