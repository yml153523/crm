const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validateAdminRole, validateSuperAdminRole } = require('../middleware/security');
const {
  getLogs,
  getLogById
} = require('../controllers/auditLogController');
const { getStatistics } = require('../controllers/auditLogStatsController');
const {
  exportLogs,
  cleanupLogs
} = require('../controllers/auditLogExportController');

router.get('/', authenticateToken, getLogs);
router.get('/statistics/overview', authenticateToken, getStatistics);
router.get('/:id', authenticateToken, getLogById);
router.post('/export', authenticateToken, validateAdminRole, exportLogs);
router.delete('/cleanup', authenticateToken, validateSuperAdminRole, cleanupLogs);

module.exports = router;
