const Disease = require('../models/Disease');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { notify, notifyMany } = require('../utils/notify');

// @desc    Create a new disease entry
// @route   POST /api/diseases
// @access  Private (Admin/Educator)
const createDisease = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'educator') {
      return res.status(403).json({ 
        message: 'Not authorized to create disease entries'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      name, icd10Code, specialty, bodySystem, severity, description, epidemiology,
      symptoms = [], causes, riskFactors = [], diagnosis, diagnosticTests = [],
      differentialDiagnosis = [], treatment, medications = [], relatedMedicationIds = [],
      prognosis, prevention, complications = '', redFlags = [], references = [], imageUrl, tags = []
    } = req.body;

    const disease = new Disease({
      name, icd10Code, specialty, bodySystem, severity, description, epidemiology,
      symptoms, causes, riskFactors, diagnosis, diagnosticTests,
      differentialDiagnosis, treatment, medications, relatedMedicationIds,
      prognosis, prevention, complications, redFlags, references, imageUrl, tags
    });

    await disease.save();

    // Notify admins about new disease
    try {
      const admins = await User.find({ role: 'admin' });
      if (admins.length > 0) {
        await notifyMany(admins, {
          title: 'New Disease Created',
          message: `A new disease entry '${name}' was created by ${req.user.username || req.user.email}`,
          type: 'clinical_case',
          link: `/admin/diseases/${disease._id}`,
          entityType: 'disease',
          entityId: disease._id,
          actorId: req.user.id,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to notify admins about new disease:', notifyErr.message);
    }

    res.status(201).json({
      success: true,
      disease
    });
  } catch (error) {
    console.error('Create disease error:', error);
    res.status(500).json({ 
      message: 'Server error creating disease',
      error: error.message 
    });
  }
};

// @desc    Get all diseases
// @route   GET /api/diseases
// @access  Public
const getAllDiseases = async (req, res) => {
  try {
    const { specialty, bodySystem, severity, search, tags, icd10 } = req.query;
    let query = {};
    if (specialty) query.specialty = specialty;
    if (bodySystem) query.bodySystem = bodySystem;
    if (severity) query.severity = severity;
    if (icd10) query.icd10Code = { $regex: icd10, $options: 'i' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { icd10Code: { $regex: search, $options: 'i' } },
        { symptoms: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    if (tags) query.tags = { $in: tags.split(',') };
    const diseases = await Disease.find(query)
      .populate('relatedMedicationIds', 'name genericName drugClass')
      .sort({ name: 1 });
    res.json({ success: true, count: diseases.length, diseases });
  } catch (error) {
    console.error('Get diseases error:', error);
    res.status(500).json({ message: 'Server error fetching diseases', error: error.message });
  }
};

// @desc    Get disease by ID
// @route   GET /api/diseases/:id
// @access  Public
const getDiseaseById = async (req, res) => {
  try {
    const disease = await Disease.findById(req.params.id)
      .populate('relatedMedicationIds', 'name genericName drugClass');
    if (!disease) return res.status(404).json({ message: 'Disease not found' });
    res.json({ success: true, disease });
  } catch (error) {
    console.error('Get disease by ID error:', error);
    res.status(500).json({ message: 'Server error fetching disease', error: error.message });
  }
};

// @desc    Get diseases by specialty
// @route   GET /api/diseases/specialty/:specialty
// @access  Public
const getDiseasesBySpecialty = async (req, res) => {
  try {
    const diseases = await Disease.find({
      specialty: req.params.specialty
    }).sort({ name: 1 });

    res.json({
      success: true,
      count: diseases.length,
      diseases
    });
  } catch (error) {
    console.error('Get diseases by specialty error:', error);
    res.status(500).json({ 
      message: 'Server error fetching diseases by specialty',
      error: error.message 
    });
  }
};

// @desc    Search diseases by symptoms
// @route   GET /api/diseases/search-by-symptoms
// @access  Public
const searchDiseasesBySymptoms = async (req, res) => {
  try {
    const { symptoms } = req.query;

    if (!symptoms) {
      return res.status(400).json({ message: 'Symptoms query parameter is required' });
    }

    const symptomArray = symptoms.split(',').map(s => new RegExp(s.trim(), 'i'));

    const diseases = await Disease.find({
      symptoms: { $in: symptomArray }
    }).sort({ name: 1 });

    res.json({
      success: true,
      count: diseases.length,
      diseases
    });
  } catch (error) {
    console.error('Search diseases by symptoms error:', error);
    res.status(500).json({ 
      message: 'Server error searching diseases by symptoms',
      error: error.message 
    });
  }
};

// @desc    Update disease
// @route   PUT /api/diseases/:id
// @access  Private (Admin/Educator)
const updateDisease = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'educator') {
      return res.status(403).json({ 
        message: 'Not authorized to update disease entries'
      });
    }

    const disease = await Disease.findById(req.params.id);

    if (!disease) {
      return res.status(404).json({ message: 'Disease not found' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updatedDisease = await Disease.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Notify admins about disease update
    try {
      const admins = await User.find({ role: 'admin' });
      if (admins.length > 0) {
        await notifyMany(admins, {
          title: 'Disease Updated',
          message: `The disease entry '${disease.name}' was updated by ${req.user.username || req.user.email}`,
          type: 'clinical_case',
          link: `/admin/diseases/${disease._id}`,
          entityType: 'disease',
          entityId: disease._id,
          actorId: req.user.id,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to notify admins about disease update:', notifyErr.message);
    }

    res.json({
      success: true,
      disease: updatedDisease
    });
  } catch (error) {
    console.error('Update disease error:', error);
    res.status(500).json({ 
      message: 'Server error updating disease',
      error: error.message 
    });
  }
};

// @desc    Delete disease
// @route   DELETE /api/diseases/:id
// @access  Private (Admin)
const deleteDisease = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to delete disease entries'
      });
    }

    const disease = await Disease.findById(req.params.id);

    if (!disease) {
      return res.status(404).json({ message: 'Disease not found' });
    }

    // Notify admins about disease deletion
    try {
      const admins = await User.find({ role: 'admin' });
      if (admins.length > 0) {
        await notifyMany(admins, {
          title: 'Disease Deleted',
          message: `The disease entry '${disease.name}' was deleted by ${req.user.username || req.user.email}`,
          type: 'clinical_case',
          entityType: 'disease',
          entityId: disease._id,
          actorId: req.user.id,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to notify admins about disease deletion:', notifyErr.message);
    }

    await disease.remove();

    res.json({
      success: true,
      message: 'Disease deleted successfully'
    });
  } catch (error) {
    console.error('Delete disease error:', error);
    res.status(500).json({ 
      message: 'Server error deleting disease',
      error: error.message 
    });
  }
};

// @desc    Get disease statistics
// @route   GET /api/diseases/stats
// @access  Private (Admin)
const getDiseaseStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view disease statistics'
      });
    }

    const totalDiseases = await Disease.countDocuments();
    
    // Get diseases by specialty distribution
    const specialtyStats = await Disease.aggregate([
      { $group: {
        _id: '$specialty',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      stats: {
        totalDiseases,
        specialties: specialtyStats
      }
    });
  } catch (error) {
    console.error('Get disease stats error:', error);
    res.status(500).json({ 
      message: 'Server error fetching disease stats',
      error: error.message 
    });
  }
};

// @desc    Get related diseases
// @route   GET /api/diseases/:id/related
// @access  Public
const getRelatedDiseases = async (req, res) => {
  try {
    const disease = await Disease.findById(req.params.id);

    if (!disease) {
      return res.status(404).json({ message: 'Disease not found' });
    }

    // Find diseases with similar symptoms or same specialty
    const relatedDiseases = await Disease.find({
      $or: [
        { specialty: disease.specialty },
        { symptoms: { $in: disease.symptoms } }
      ],
      _id: { $ne: disease._id }
    }).limit(5);

    res.json({
      success: true,
      count: relatedDiseases.length,
      relatedDiseases
    });
  } catch (error) {
    console.error('Get related diseases error:', error);
    res.status(500).json({ 
      message: 'Server error fetching related diseases',
      error: error.message 
    });
  }
};

module.exports = {
  createDisease,
  getAllDiseases,
  getDiseaseById,
  getDiseasesBySpecialty,
  searchDiseasesBySymptoms,
  updateDisease,
  deleteDisease,
  getDiseaseStats,
  getRelatedDiseases
};