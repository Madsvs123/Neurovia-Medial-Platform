const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const programAccess = require('../middleware/programAccessMiddleware');
const optionalAuth = require('../middleware/optionalAuth');
const clinicalCaseController = require('../controllers/clinicalCaseController');

// Specific routes BEFORE parameterized routes
router.get('/search-by-symptoms', clinicalCaseController.searchBySymptoms);
router.get('/search-by-diagnosis', clinicalCaseController.searchByDiagnosis);
router.get('/specialty/:specialty', clinicalCaseController.getClinicalCasesBySpecialty);
router.get('/difficulty/:difficulty', clinicalCaseController.getClinicalCasesByDifficulty);

router.post('/', [
  authMiddleware,
  check('title', 'Title is required').not().isEmpty(),
  check('specialty', 'Specialty is required').not().isEmpty(),
  check('patientHistory', 'Patient history is required').not().isEmpty(),
  check('diagnosis', 'Diagnosis is required').not().isEmpty()
], clinicalCaseController.createClinicalCase);

router.get('/', optionalAuth, clinicalCaseController.getAllClinicalCases);
router.get('/:id', [optionalAuth, programAccess('clinical_case')], clinicalCaseController.getClinicalCaseById);
router.put('/:id', authMiddleware, clinicalCaseController.updateClinicalCase);
router.delete('/:id', authMiddleware, clinicalCaseController.deleteClinicalCase);
router.get('/:id/stats', authMiddleware, clinicalCaseController.getClinicalCaseStats);

module.exports = router;
