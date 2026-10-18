const Profile = require('../models/Profile');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Get profile by user ID
// @route   GET /api/profiles/:userId
// @access  Public
const getProfileByUserId = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.params.userId });
    
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Get basic user info (excluding sensitive data)
    const user = await User.findById(req.params.userId)
      .select('username email role status');

    res.json({
      success: true,
      profile,
      user: {
        username: user.username,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      message: 'Server error fetching profile',
      error: error.message 
    });
  }
};

// @desc    Get current user's profile
// @route   GET /api/profiles/me
// @access  Private
const getMyProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user.id });
    
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Get my profile error:', error);
    res.status(500).json({ 
      message: 'Server error fetching profile',
      error: error.message 
    });
  }
};

// @desc    Update profile
// @route   PUT /api/profiles/me
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const profile = await Profile.findOneAndUpdate(
      { userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      message: 'Server error updating profile',
      error: error.message 
    });
  }
};

// @desc    Search profiles by profession or specialization
// @route   GET /api/profiles/search
// @access  Public
const searchProfiles = async (req, res) => {
  try {
    const { profession, specialization, query } = req.query;
    
    let searchQuery = {};
    
    if (profession) {
      searchQuery.profession = { $regex: profession, $options: 'i' };
    }
    
    if (specialization) {
      searchQuery.specialization = { $regex: specialization, $options: 'i' };
    }
    
    if (query) {
      searchQuery.$or = [
        { fullName: { $regex: query, $options: 'i' } },
        { bio: { $regex: query, $options: 'i' } },
        { skills: { $regex: query, $options: 'i' } }
      ];
    }

    const profiles = await Profile.find(searchQuery)
      .populate('userId', 'username email role');

    res.json({
      success: true,
      count: profiles.length,
      profiles
    });
  } catch (error) {
    console.error('Search profiles error:', error);
    res.status(500).json({ 
      message: 'Server error searching profiles',
      error: error.message 
    });
  }
};

// @desc    Get profiles by profession
// @route   GET /api/profiles/profession/:profession
// @access  Public
const getProfilesByProfession = async (req, res) => {
  try {
    const profiles = await Profile.find({
      profession: req.params.profession
    }).populate('userId', 'username email');

    res.json({
      success: true,
      count: profiles.length,
      profiles
    });
  } catch (error) {
    console.error('Get profiles by profession error:', error);
    res.status(500).json({ 
      message: 'Server error fetching profiles by profession',
      error: error.message 
    });
  }
};

// @desc    Get profiles by specialization
// @route   GET /api/profiles/specialization/:specialization
// @access  Public
const getProfilesBySpecialization = async (req, res) => {
  try {
    const profiles = await Profile.find({
      specialization: req.params.specialization
    }).populate('userId', 'username email');

    res.json({
      success: true,
      count: profiles.length,
      profiles
    });
  } catch (error) {
    console.error('Get profiles by specialization error:', error);
    res.status(500).json({ 
      message: 'Server error fetching profiles by specialization',
      error: error.message 
    });
  }
};

// @desc    Get doctor profiles (for finding experts)
// @route   GET /api/profiles/doctors
// @access  Public
const getDoctorProfiles = async (req, res) => {
  try {
    const doctors = await Profile.find({ profession: 'Physician' })
      .populate('userId', 'username email');

    res.json({
      success: true,
      count: doctors.length,
      doctors
    });
  } catch (error) {
    console.error('Get doctor profiles error:', error);
    res.status(500).json({ 
      message: 'Server error fetching doctor profiles',
      error: error.message 
    });
  }
};

module.exports = {
  getProfileByUserId,
  getMyProfile,
  updateProfile,
  searchProfiles,
  getProfilesByProfession,
  getProfilesBySpecialization,
  getDoctorProfiles
};