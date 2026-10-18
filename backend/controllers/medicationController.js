const Medication = require('../models/Medication');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { notify, notifyMany } = require('../utils/notify');

// @desc    Create a new medication entry
// @route   POST /api/medications
// @access  Private (Admin/Educator)
const createMedication = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'educator') {
      return res.status(403).json({ 
        message: 'Not authorized to create medication entries'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      name, genericName, brandNames = [], drugClass, mechanismOfAction, indications,
      relatedDiseaseIds = [], dosage, dosageForms = [], route, halfLife, onsetOfAction, duration,
      contraindications, sideEffects = [], seriousSideEffects = [], interactions = [],
      warnings, pregnancyCategory, pediatricDosage, geriatricDosage, renalDosage, hepaticDosage,
      monitoring, overdose, references = [], tags = []
    } = req.body;

    const medication = new Medication({
      name, genericName, brandNames, drugClass, mechanismOfAction, indications, relatedDiseaseIds,
      dosage, dosageForms, route, halfLife, onsetOfAction, duration, contraindications, sideEffects,
      seriousSideEffects, interactions, warnings, pregnancyCategory, pediatricDosage, geriatricDosage,
      renalDosage, hepaticDosage, monitoring, overdose, references, tags
    });

    await medication.save();

    // Notify admins about new medication
    try {
      const admins = await User.find({ role: 'admin' });
      if (admins.length > 0) {
        await notifyMany(admins, {
          title: 'New Medication Created',
          message: `A new medication '${name}' was created by ${req.user.username || req.user.email}`,
          type: 'clinical_case',
          link: `/admin/medications/${medication._id}`,
          entityType: 'medication',
          entityId: medication._id,
          actorId: req.user.id,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to notify admins about new medication:', notifyErr.message);
    }

    res.status(201).json({
      success: true,
      medication
    });
  } catch (error) {
    console.error('Create medication error:', error);
    res.status(500).json({ 
      message: 'Server error creating medication',
      error: error.message 
    });
  }
};

// @desc    Get all medications
// @route   GET /api/medications
// @access  Public
const getAllMedications = async (req, res) => {
  try {
    const { drugClass, search, genericName, route } = req.query;
    let query = {};
    if (drugClass) query.drugClass = drugClass;
    if (route) query.route = route;
    if (genericName) query.genericName = { $regex: genericName, $options: 'i' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { genericName: { $regex: search, $options: 'i' } },
        { indications: { $regex: search, $options: 'i' } },
        { drugClass: { $regex: search, $options: 'i' } },
        { brandNames: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    const medications = await Medication.find(query)
      .populate('relatedDiseaseIds', 'name specialty')
      .sort({ name: 1 });

    res.json({
      success: true,
      count: medications.length,
      medications
    });
  } catch (error) {
    console.error('Get medications error:', error);
    res.status(500).json({ 
      message: 'Server error fetching medications',
      error: error.message 
    });
  }
};

// @desc    Get medication by ID
// @route   GET /api/medications/:id
// @access  Public
const getMedicationById = async (req, res) => {
  try {
    const medication = await Medication.findById(req.params.id);

    if (!medication) {
      return res.status(404).json({ message: 'Medication not found' });
    }

    res.json({
      success: true,
      medication
    });
  } catch (error) {
    console.error('Get medication by ID error:', error);
    res.status(500).json({ 
      message: 'Server error fetching medication',
      error: error.message 
    });
  }
};

// @desc    Get medications by drug class
// @route   GET /api/medications/class/:drugClass
// @access  Public
const getMedicationsByClass = async (req, res) => {
  try {
    const medications = await Medication.find({
      drugClass: req.params.drugClass
    }).sort({ name: 1 });

    res.json({
      success: true,
      count: medications.length,
      medications
    });
  } catch (error) {
    console.error('Get medications by class error:', error);
    res.status(500).json({ 
      message: 'Server error fetching medications by class',
      error: error.message 
    });
  }
};

// @desc    Search medications by indication
// @route   GET /api/medications/search-by-indication
// @access  Public
const searchMedicationsByIndication = async (req, res) => {
  try {
    const { indication } = req.query;

    if (!indication) {
      return res.status(400).json({ message: 'Indication query parameter is required' });
    }

    const medications = await Medication.find({
      indications: { $regex: indication, $options: 'i' }
    }).sort({ name: 1 });

    res.json({
      success: true,
      count: medications.length,
      medications
    });
  } catch (error) {
    console.error('Search medications by indication error:', error);
    res.status(500).json({ 
      message: 'Server error searching medications by indication',
      error: error.message 
    });
  }
};

// @desc    Update medication
// @route   PUT /api/medications/:id
// @access  Private (Admin/Educator)
const updateMedication = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'educator') {
      return res.status(403).json({ 
        message: 'Not authorized to update medication entries'
      });
    }

    const medication = await Medication.findById(req.params.id);

    if (!medication) {
      return res.status(404).json({ message: 'Medication not found' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updatedMedication = await Medication.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Notify admins about medication update
    try {
      const admins = await User.find({ role: 'admin' });
      if (admins.length > 0) {
        await notifyMany(admins, {
          title: 'Medication Updated',
          message: `The medication '${medication.name}' was updated by ${req.user.username || req.user.email}`,
          type: 'clinical_case',
          link: `/admin/medications/${medication._id}`,
          entityType: 'medication',
          entityId: medication._id,
          actorId: req.user.id,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to notify admins about medication update:', notifyErr.message);
    }

    res.json({
      success: true,
      medication: updatedMedication
    });
  } catch (error) {
    console.error('Update medication error:', error);
    res.status(500).json({ 
      message: 'Server error updating medication',
      error: error.message 
    });
  }
};

// @desc    Delete medication
// @route   DELETE /api/medications/:id
// @access  Private (Admin)
const deleteMedication = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to delete medication entries'
      });
    }

    const medication = await Medication.findById(req.params.id);

    if (!medication) {
      return res.status(404).json({ message: 'Medication not found' });
    }

    // Notify admins about medication deletion
    try {
      const admins = await User.find({ role: 'admin' });
      if (admins.length > 0) {
        await notifyMany(admins, {
          title: 'Medication Deleted',
          message: `The medication '${medication.name}' was deleted by ${req.user.username || req.user.email}`,
          type: 'clinical_case',
          entityType: 'medication',
          entityId: medication._id,
          actorId: req.user.id,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to notify admins about medication deletion:', notifyErr.message);
    }

    await medication.remove();

    res.json({
      success: true,
      message: 'Medication deleted successfully'
    });
  } catch (error) {
    console.error('Delete medication error:', error);
    res.status(500).json({ 
      message: 'Server error deleting medication',
      error: error.message 
    });
  }
};

// @desc    Get medication statistics
// @route   GET /api/medications/stats
// @access  Private (Admin)
const getMedicationStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view medication statistics'
      });
    }

    const totalMedications = await Medication.countDocuments();
    
    // Get medications by drug class distribution
    const drugClassStats = await Medication.aggregate([
      { $group: {
        _id: '$drugClass',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      stats: {
        totalMedications,
        drugClasses: drugClassStats
      }
    });
  } catch (error) {
    console.error('Get medication stats error:', error);
    res.status(500).json({ 
      message: 'Server error fetching medication stats',
      error: error.message 
    });
  }
};

// @desc    Get medications with potential interactions
// @route   GET /api/medications/:id/interactions
// @access  Public
const getMedicationInteractions = async (req, res) => {
  try {
    const medication = await Medication.findById(req.params.id);

    if (!medication) {
      return res.status(404).json({ message: 'Medication not found' });
    }

    if (!medication.interactions || medication.interactions.length === 0) {
      return res.json({
        success: true,
        message: 'No known interactions for this medication',
        interactions: []
      });
    }

    res.json({
      success: true,
      interactions: medication.interactions
    });
  } catch (error) {
    console.error('Get medication interactions error:', error);
    res.status(500).json({ 
      message: 'Server error fetching medication interactions',
      error: error.message 
    });
  }
};

module.exports = {
  createMedication,
  getAllMedications,
  getMedicationById,
  getMedicationsByClass,
  searchMedicationsByIndication,
  updateMedication,
  deleteMedication,
  getMedicationStats,
  getMedicationInteractions
};