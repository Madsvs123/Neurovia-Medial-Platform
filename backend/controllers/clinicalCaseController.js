const ClinicalCase = require('../models/ClinicalCase');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { notify, notifyMany } = require('../utils/notify');

// @desc    Create a new clinical case
// @route   POST /api/clinical-cases
// @access  Private (Educator/Admin)
const createClinicalCase = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      title, 
      specialty, 
      difficulty = 'medium', 
      patientHistory, 
      symptoms, 
      physicalExam, 
      labResults, 
      diagnosis, 
      treatmentPlan, 
      discussion, 
      references, 
      premiumOnly = false
    } = req.body;

    // Create clinical case
    const clinicalCase = new ClinicalCase({
      title,
      specialty,
      difficulty,
      patientHistory,
      symptoms,
      physicalExam,
      labResults,
      diagnosis,
      treatmentPlan,
      discussion,
      references,
      premiumOnly,
      createdBy: req.user.id
    });

    await clinicalCase.save();

    // Notify admin when educator creates a clinical case
    if (req.user.role === 'educator') {
      try {
        const admins = await User.find({ role: 'admin' });
        if (admins.length > 0) {
          await notifyMany(admins, {
            title: 'New Clinical Case Created',
            message: `A new clinical case '${title}' was created by educator ${req.user.username || req.user.email}`,
            type: 'clinical_case',
            link: `/admin/clinical-cases/${clinicalCase._id}`,
            entityType: 'clinical_case',
            entityId: clinicalCase._id,
            actorId: req.user.id,
          });
        }
      } catch (notifyErr) {
        console.error('Failed to notify admins about new clinical case:', notifyErr.message);
      }
    }

    res.status(201).json({
      success: true,
      clinicalCase
    });
  } catch (error) {
    console.error('Create clinical case error:', error);
    res.status(500).json({ 
      message: 'Server error creating clinical case',
      error: error.message 
    });
  }
};

// @desc    Get all clinical cases
// @route   GET /api/clinical-cases
// @access  Public
const getAllClinicalCases = async (req, res) => {
  try {
    const { specialty, difficulty, premiumOnly, search } = req.query;

    let query = {};

    if (specialty) {
      query.specialty = specialty;
    }

    if (difficulty) {
      query.difficulty = difficulty;
    }

    if (premiumOnly) {
      query.premiumOnly = premiumOnly === 'true';
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { diagnosis: { $regex: search, $options: 'i' } },
        { symptoms: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // If user is an educator (not admin), only show their own cases
    if (req.user && req.user.role === 'educator') {
      query.createdBy = req.user._id;
    }

    const clinicalCases = await ClinicalCase.find(query)
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: clinicalCases.length,
      clinicalCases
    });
  } catch (error) {
    console.error('Get clinical cases error:', error);
    res.status(500).json({ 
      message: 'Server error fetching clinical cases',
      error: error.message 
    });
  }
};

// @desc    Get clinical case by ID
// @route   GET /api/clinical-cases/:id
// @access  Public
const getClinicalCaseById = async (req, res) => {
  try {
    const clinicalCase = await ClinicalCase.findById(req.params.id)
      .populate('createdBy', 'username email');

    if (!clinicalCase) {
      return res.status(404).json({ message: 'Clinical case not found' });
    }

    // Check if case is premium and user doesn't have access
    if (clinicalCase.premiumOnly && !req.user) {
      return res.status(403).json({ 
        message: 'This clinical case requires premium access',
        isPremium: true
      });
    }

    res.json({
      success: true,
      clinicalCase
    });
  } catch (error) {
    console.error('Get clinical case by ID error:', error);
    res.status(500).json({ 
      message: 'Server error fetching clinical case',
      error: error.message 
    });
  }
};

// @desc    Get clinical cases by specialty
// @route   GET /api/clinical-cases/specialty/:specialty
// @access  Public
const getClinicalCasesBySpecialty = async (req, res) => {
  try {
    const clinicalCases = await ClinicalCase.find({
      specialty: req.params.specialty
    }).populate('createdBy', 'username email')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: clinicalCases.length,
      clinicalCases
    });
  } catch (error) {
    console.error('Get clinical cases by specialty error:', error);
    res.status(500).json({ 
      message: 'Server error fetching clinical cases by specialty',
      error: error.message 
    });
  }
};

// @desc    Get clinical cases by difficulty
// @route   GET /api/clinical-cases/difficulty/:difficulty
// @access  Public
const getClinicalCasesByDifficulty = async (req, res) => {
  try {
    const clinicalCases = await ClinicalCase.find({
      difficulty: req.params.difficulty
    }).populate('createdBy', 'username email')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: clinicalCases.length,
      clinicalCases
    });
  } catch (error) {
    console.error('Get clinical cases by difficulty error:', error);
    res.status(500).json({ 
      message: 'Server error fetching clinical cases by difficulty',
      error: error.message 
    });
  }
};

// @desc    Update clinical case
// @route   PUT /api/clinical-cases/:id
// @access  Private (Educator/Admin)
const updateClinicalCase = async (req, res) => {
  try {
    const clinicalCase = await ClinicalCase.findById(req.params.id);

    if (!clinicalCase) {
      return res.status(404).json({ message: 'Clinical case not found' });
    }

    // Check if user is authorized
    const userId = req.userId || req.user.id || (req.user._id && req.user._id.toString());
    const isOwner = clinicalCase.createdBy && clinicalCase.createdBy.toString() === userId;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to update this clinical case'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updatedClinicalCase = await ClinicalCase.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Notify admin when educator updates a clinical case
    if (req.user.role === 'educator') {
      try {
        const admins = await User.find({ role: 'admin' });
        if (admins.length > 0) {
          await notifyMany(admins, {
            title: 'Clinical Case Updated',
            message: `The clinical case '${clinicalCase.title}' was updated by educator ${req.user.username || req.user.email}`,
            type: 'clinical_case',
            link: `/admin/clinical-cases/${clinicalCase._id}`,
            entityType: 'clinical_case',
            entityId: clinicalCase._id,
            actorId: req.user.id,
          });
        }
      } catch (notifyErr) {
        console.error('Failed to notify admins about clinical case update:', notifyErr.message);
      }
    }

    res.json({
      success: true,
      clinicalCase: updatedClinicalCase
    });
  } catch (error) {
    console.error('Update clinical case error:', error);
    res.status(500).json({ 
      message: 'Server error updating clinical case',
      error: error.message 
    });
  }
};

// @desc    Delete clinical case
// @route   DELETE /api/clinical-cases/:id
// @access  Private (Educator/Admin)
const deleteClinicalCase = async (req, res) => {
  try {
    const clinicalCase = await ClinicalCase.findById(req.params.id);

    if (!clinicalCase) {
      return res.status(404).json({ message: 'Clinical case not found' });
    }

    // Check if user is authorized
    const userId = req.userId || req.user.id || (req.user._id && req.user._id.toString());
    const isOwner = clinicalCase.createdBy && clinicalCase.createdBy.toString() === userId;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to delete this clinical case'
      });
    }

    // Notify admin when educator deletes a clinical case
    if (req.user.role === 'educator') {
      try {
        const admins = await User.find({ role: 'admin' });
        if (admins.length > 0) {
          await notifyMany(admins, {
            title: 'Clinical Case Deleted',
            message: `The clinical case '${clinicalCase.title}' was deleted by educator ${req.user.username || req.user.email}`,
            type: 'clinical_case',
            entityType: 'clinical_case',
            entityId: clinicalCase._id,
            actorId: req.user.id,
          });
        }
      } catch (notifyErr) {
        console.error('Failed to notify admins about clinical case deletion:', notifyErr.message);
      }
    }

    await ClinicalCase.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Clinical case deleted successfully'
    });
  } catch (error) {
    console.error('Delete clinical case error:', error);
    res.status(500).json({ 
      message: 'Server error deleting clinical case',
      error: error.message 
    });
  }
};

// @desc    Get clinical case statistics
// @route   GET /api/clinical-cases/:id/stats
// @access  Private (Educator/Admin)
const getClinicalCaseStats = async (req, res) => {
  try {
    const clinicalCase = await ClinicalCase.findById(req.params.id);

    if (!clinicalCase) {
      return res.status(404).json({ message: 'Clinical case not found' });
    }

    // Check if user is authorized
    const userId = req.userId || req.user.id || (req.user._id && req.user._id.toString());
    const isOwner = clinicalCase.createdBy && clinicalCase.createdBy.toString() === userId;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view this clinical case stats'
      });
    }

    res.json({
      success: true,
      stats: {
        specialty: clinicalCase.specialty,
        difficulty: clinicalCase.difficulty,
        premiumOnly: clinicalCase.premiumOnly,
        createdAt: clinicalCase.createdAt,
        updatedAt: clinicalCase.updatedAt,
        referencesCount: clinicalCase.references?.length || 0
      }
    });
  } catch (error) {
    console.error('Get clinical case stats error:', error);
    res.status(500).json({ 
      message: 'Server error fetching clinical case stats',
      error: error.message 
    });
  }
};

// @desc    Search clinical cases by symptoms
// @route   GET /api/clinical-cases/search-by-symptoms
// @access  Public
const searchBySymptoms = async (req, res) => {
  try {
    const { symptoms } = req.query;

    if (!symptoms) {
      return res.status(400).json({ message: 'Symptoms query parameter is required' });
    }

    const symptomArray = symptoms.split(',').map(s => new RegExp(s.trim(), 'i'));

    const clinicalCases = await ClinicalCase.find({
      symptoms: { $in: symptomArray }
    }).populate('createdBy', 'username email');

    res.json({
      success: true,
      count: clinicalCases.length,
      clinicalCases
    });
  } catch (error) {
    console.error('Search by symptoms error:', error);
    res.status(500).json({ 
      message: 'Server error searching clinical cases by symptoms',
      error: error.message 
    });
  }
};

// @desc    Search clinical cases by diagnosis
// @route   GET /api/clinical-cases/search-by-diagnosis
// @access  Public
const searchByDiagnosis = async (req, res) => {
  try {
    const { diagnosis } = req.query;

    if (!diagnosis) {
      return res.status(400).json({ message: 'Diagnosis query parameter is required' });
    }

    const clinicalCases = await ClinicalCase.find({
      diagnosis: { $regex: diagnosis, $options: 'i' }
    }).populate('createdBy', 'username email');

    res.json({
      success: true,
      count: clinicalCases.length,
      clinicalCases
    });
  } catch (error) {
    console.error('Search by diagnosis error:', error);
    res.status(500).json({ 
      message: 'Server error searching clinical cases by diagnosis',
      error: error.message 
    });
  }
};

module.exports = {
  createClinicalCase,
  getAllClinicalCases,
  getClinicalCaseById,
  getClinicalCasesBySpecialty,
  getClinicalCasesByDifficulty,
  updateClinicalCase,
  deleteClinicalCase,
  getClinicalCaseStats,
  searchBySymptoms,
  searchByDiagnosis
};