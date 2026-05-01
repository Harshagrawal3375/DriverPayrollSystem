const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    default: ""
  },
  vehicleNumber: {
    type: String,
    trim: true,
    default: ""
  },
  department: {
    type: String,
    trim: true,
    default: ""
  },
  departments: [{
    type: String,
    trim: true
  }],
  salary: {
    type: Number,
    required: true,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ["Paid", "Pending", "Due"],
    default: "Pending"
  },
  paymentHistory: [{
    paymentDate: Date,
    amount: Number,
    notes: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  pendingMonths: {
    type: Number,
    default: 0
  },
  lastPaymentDate: {
    type: Date,
    default: null
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
  licenseNumber: {
    type: String,
    trim: true,
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

module.exports = mongoose.model("Driver", driverSchema);