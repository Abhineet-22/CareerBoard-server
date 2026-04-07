import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  jobId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  firstName:      { type: String, required: true },
  lastName:       { type: String, required: true },
  email:          { type: String, required: true },
  phone:          { type: String, required: true },
  location:       { type: String, required: true },
  linkedin:       { type: String },
  portfolio:      { type: String },
  resumePath:     { type: String, required: true },
  totalExp:       { type: String, required: true },
  currentRole:    { type: String, required: true },
  currentCompany: { type: String, required: true },
  skills:         [{ type: String }],
  noticePeriod:   { type: String, required: true },
  expectedSalary: { type: String },
  coverMessage:   { type: String, required: true },
  referral:       { type: String },
  referralName:   { type: String },
}, { timestamps: true });

export default mongoose.model('Application', applicationSchema);