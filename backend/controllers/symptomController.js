const Symptom = require('../models/Symptom');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { notify, notifyMany } = require('../utils/notify');

// @desc    Create a new symptom entry
// @route   POST /api/symptoms
// @access  Private (Admin/Educator)
const createSymptom = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'educator') {
      return res.status(403).json({ 
        message: 'Not authorized to create symptom entries'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      name, description = '', severity, duration, specialty, bodySystem,
      associatedSigns = [], redFlags = [], relatedDiseases = [], relatedDiseaseIds = [],
      differentialDiagnosis = [], relatedSymptoms = [], references = [], tags = []
    } = req.body;

    const symptom = new Symptom({
      name, description, severity, duration, specialty, bodySystem,
      associatedSigns, redFlags, relatedDiseases, relatedDiseaseIds,
      differentialDiagnosis, relatedSymptoms, references, tags
    });

    await symptom.save();

    // Notify admins about new symptom
    try {
      const admins = await User.find({ role: 'admin' });
      if (admins.length > 0) {
        await notifyMany(admins, {
          title: 'New Symptom Created',
          message: `A new symptom entry '${name}' was created by ${req.user.username || req.user.email}`,
          type: 'clinical_case',
          link: `/admin/symptoms/${symptom._id}`,
          entityType: 'symptom',
          entityId: symptom._id,
          actorId: req.user.id,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to notify admins about new symptom:', notifyErr.message);
    }

    res.status(201).json({
      success: true,
      symptom
    });
  } catch (error) {
    console.error('Create symptom error:', error);
    res.status(500).json({ 
      message: 'Server error creating symptom',
      error: error.message 
    });
  }
};

// @desc    Get all symptoms
// @route   GET /api/symptoms
// @access  Public
const getAllSymptoms = async (req, res) => {
  try {
    const { specialty, bodySystem, severity, search } = req.query;
    let query = {};
    if (specialty) query.specialty = specialty;
    if (bodySystem) query.bodySystem = bodySystem;
    if (severity) query.severity = severity;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { relatedDiseases: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    const symptoms = await Symptom.find(query)
      .populate('relatedDiseaseIds', 'name specialty')
      .sort({ name: 1 });

    res.json({
      success: true,
      count: symptoms.length,
      symptoms
    });
  } catch (error) {
    console.error('Get symptoms error:', error);
    res.status(500).json({ 
      message: 'Server error fetching symptoms',
      error: error.message 
    });
  }
};

// @desc    Get symptom by ID
// @route   GET /api/symptoms/:id
// @access  Public
const getSymptomById = async (req, res) => {
  try {
    const symptom = await Symptom.findById(req.params.id)
      .populate('relatedDiseaseIds', 'name specialty');
    if (!symptom) return res.status(404).json({ message: 'Symptom not found' });

    res.json({
      success: true,
      symptom
    });
  } catch (error) {
    console.error('Get symptom by ID error:', error);
    res.status(500).json({ 
      message: 'Server error fetching symptom',
      error: error.message 
    });
  }
};

// @desc    Get symptoms by specialty
// @route   GET /api/symptoms/specialty/:specialty
// @access  Public
const getSymptomsBySpecialty = async (req, res) => {
  try {
    const symptoms = await Symptom.find({
      specialty: req.params.specialty
    }).sort({ name: 1 });

    res.json({
      success: true,
      count: symptoms.length,
      symptoms
    });
  } catch (error) {
    console.error('Get symptoms by specialty error:', error);
    res.status(500).json({ 
      message: 'Server error fetching symptoms by specialty',
      error: error.message 
    });
  }
};

// @desc    Search symptoms by name
// @route   GET /api/symptoms/search
// @access  Public
const searchSymptoms = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ message: 'Name query parameter is required' });
    }

    const symptoms = await Symptom.find({
      name: { $regex: name, $options: 'i' }
    }).sort({ name: 1 });

    res.json({
      success: true,
      count: symptoms.length,
      symptoms
    });
  } catch (error) {
    console.error('Search symptoms error:', error);
    res.status(500).json({ 
      message: 'Server error searching symptoms',
      error: error.message 
    });
  }
};

// @desc    Update symptom
// @route   PUT /api/symptoms/:id
// @access  Private (Admin/Educator)
const updateSymptom = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'educator') {
      return res.status(403).json({ 
        message: 'Not authorized to update symptom entries'
      });
    }

    const symptom = await Symptom.findById(req.params.id);

    if (!symptom) {
      return res.status(404).json({ message: 'Symptom not found' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updatedSymptom = await Symptom.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Notify admins about symptom update
    try {
      const admins = await User.find({ role: 'admin' });
      if (admins.length > 0) {
        await notifyMany(admins, {
          title: 'Symptom Updated',
          message: `The symptom entry '${symptom.name}' was updated by ${req.user.username || req.user.email}`,
          type: 'clinical_case',
          link: `/admin/symptoms/${symptom._id}`,
          entityType: 'symptom',
          entityId: symptom._id,
          actorId: req.user.id,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to notify admins about symptom update:', notifyErr.message);
    }

    res.json({
      success: true,
      symptom: updatedSymptom
    });
  } catch (error) {
    console.error('Update symptom error:', error);
    res.status(500).json({ 
      message: 'Server error updating symptom',
      error: error.message 
    });
  }
};

// @desc    Delete symptom
// @route   DELETE /api/symptoms/:id
// @access  Private (Admin)
const deleteSymptom = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to delete symptom entries'
      });
    }

    const symptom = await Symptom.findById(req.params.id);

    if (!symptom) {
      return res.status(404).json({ message: 'Symptom not found' });
    }

    // Notify admins about symptom deletion
    try {
      const admins = await User.find({ role: 'admin' });
      if (admins.length > 0) {
        await notifyMany(admins, {
          title: 'Symptom Deleted',
          message: `The symptom entry '${symptom.name}' was deleted by ${req.user.username || req.user.email}`,
          type: 'clinical_case',
          entityType: 'symptom',
          entityId: symptom._id,
          actorId: req.user.id,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to notify admins about symptom deletion:', notifyErr.message);
    }

    await symptom.remove();

    res.json({
      success: true,
      message: 'Symptom deleted successfully'
    });
  } catch (error) {
    console.error('Delete symptom error:', error);
    res.status(500).json({ 
      message: 'Server error deleting symptom',
      error: error.message 
    });
  }
};

// @desc    Get symptom statistics
// @route   GET /api/symptoms/stats
// @access  Private (Admin)
const getSymptomStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view symptom statistics'
      });
    }

    const totalSymptoms = await Symptom.countDocuments();
    
    // Get symptoms by specialty distribution
    const specialtyStats = await Symptom.aggregate([
      { $group: {
        _id: '$specialty',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      stats: {
        totalSymptoms,
        specialties: specialtyStats
      }
    });
  } catch (error) {
    console.error('Get symptom stats error:', error);
    res.status(500).json({ 
      message: 'Server error fetching symptom stats',
      error: error.message 
    });
  }
};

// @desc    Get symptoms by related disease
// @route   GET /api/symptoms/disease/:diseaseName
// @access  Public
const getSymptomsByDisease = async (req, res) => {
  try {
    const symptoms = await Symptom.find({
      relatedDiseases: { $regex: req.params.diseaseName, $options: 'i' }
    }).sort({ name: 1 });

    res.json({
      success: true,
      count: symptoms.length,
      symptoms
    });
  } catch (error) {
    console.error('Get symptoms by disease error:', error);
    res.status(500).json({ 
      message: 'Server error fetching symptoms by disease',
      error: error.message 
    });
  }
};

module.exports = {
  createSymptom,
  getAllSymptoms,
  getSymptomById,
  getSymptomsBySpecialty,
  searchSymptoms,
  updateSymptom,
  deleteSymptom,
  getSymptomStats,
  getSymptomsByDisease
};