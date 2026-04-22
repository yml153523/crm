const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validateSuperAdminRole } = require('../middleware/security');
const {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  toggleUserStatus,
  resetPassword,
  deleteAdminUser
} = require('../controllers/adminUserController');

router.get('/', authenticateToken, validateSuperAdminRole, getAdminUsers);
router.post('/', authenticateToken, validateSuperAdminRole, createAdminUser);
router.put('/:id', authenticateToken, validateSuperAdminRole, updateAdminUser);
router.put('/:id/status', authenticateToken, validateSuperAdminRole, toggleUserStatus);
router.put('/:id/password', authenticateToken, validateSuperAdminRole, resetPassword);
router.delete('/:id', authenticateToken, validateSuperAdminRole, deleteAdminUser);

module.exports = router;