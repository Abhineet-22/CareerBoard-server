import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  companyName:    { type: String, required: true },
  website:        { type: String },
  industry:       { type: String, required: true },
  companySize:    { type: String, required: true },
  contactEmail:   { type: String, required: true },
  jobTitle:       { type: String, required: true },
  category:       { type: String, required: true },
  experienceLevel:{ type: String, required: true },
  description:    { type: String, required: true },
  skills:         [{ type: String }],
  jobType:        { type: String, required: true },
  workArrangement:{ type: String, required: true },
  location:       { type: String, required: true },
  salaryMin:      { type: Number },
  salaryMax:      { type: Number },
  currency:       { type: String, default: 'INR' },
  notes:          { type: String },
}, { timestamps: true });

export default mongoose.model('Job', jobSchema);