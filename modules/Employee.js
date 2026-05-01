const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  departments: [{
    type: String,
    trim: true
  }],
  basicSalary: {
    type: Number,
    required: true,
    min: 0
  },
  gender: {
    type: String,
    trim: true,
    default: ""
  },
  profileImage: {
    type: String,
    default: ""
  },
  startDate: {
    type: String,
    default: ""
  },
  notes: {
    type: String,
    default: ""
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Employee", employeeSchema);