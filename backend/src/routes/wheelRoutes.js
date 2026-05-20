const express = require('express');
const router = express.Router();
const { initializeWheel, joinWheel, manualStartWheel } = require('../controllers/wheelController');

router.post('/initialize', initializeWheel);
router.post('/join', joinWheel);
router.post('/start', manualStartWheel);

module.exports = router;