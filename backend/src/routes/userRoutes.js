const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUserProfile, getAllUsers } = require('../controllers/userController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/all', getAllUsers);
router.get('/:id', getUserProfile);

module.exports = router;
