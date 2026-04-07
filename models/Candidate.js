import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['Candidate'], default: 'Candidate' },
}, { timestamps: true });

export default mongoose.model('Candidate', candidateSchema);
