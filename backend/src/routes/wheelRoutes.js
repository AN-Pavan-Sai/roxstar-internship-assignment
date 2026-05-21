const express = require('express');
const router = express.Router();
const {
  initializeWheel,
  joinWheel,
  manualStartWheel,
  getWheelStatus,
  getActiveWheel,
  getHistory
} = require('../controllers/wheelController');

router.post('/initialize', initializeWheel);
router.post('/join', joinWheel);
router.post('/start', manualStartWheel);
router.get('/active', getActiveWheel);
router.get('/history', getHistory);
router.get('/status/:id', getWheelStatus);

module.exports = router;