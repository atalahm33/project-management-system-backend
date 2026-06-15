const express = require('express');
const authController = require('../controllers/authController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/login', authController.login);

// Only admins and super admins can register new users
router.post('/register', protect, restrictTo('Admin', 'Super Admin'), authController.register);

module.exports = router;
