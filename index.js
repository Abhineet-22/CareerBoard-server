import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jobRoutes from './routes/jobs.js';
import applicationRoutes from './routes/applications.js';
import authRoutes from './routes/auth.js';
import { apiLimiter } from './middleware/rateLimit.js';
import fs from 'fs';
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

dotenv.config();
const app = express();

const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  'http://localhost:5173',
  'https://career-board-client.vercel.app',
  ...configuredOrigins,
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
}));
app.use(express.json());
app.use('/api', apiLimiter);

app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/auth', authRoutes);

// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(() => app.listen(process.env.PORT, () =>
//     console.log(`Server running on port ${process.env.PORT}`)
//   ))
//   .catch(err => console.error(err));
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
    app.listen(process.env.PORT, () =>
      console.log(`Server running on http://localhost:${process.env.PORT}`)
    );
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
// ```

// When you run `npm run dev` you should now see:
// ```
// Connected to MongoDB Atlas
// Server running on http://localhost:5000
// ```

// ---

// ## Step 8 — Protect your `.env` file

// Make sure your credentials never get committed to Git. Create a `.gitignore` in the `server/` folder if you don't have one:
// ```
// # server/.gitignore
// .env
// node_modules/
// uploads/