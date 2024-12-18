const express = require('express');
const router = express.Router();
const promotionalController = require('../controller/promotional.Controller');

router.post('/', promotionalController.createPromotion);
router.get('/', promotionalController.getPromotions);
router.put('/:id', promotionalController.updatePromotion);
router.delete('/:id', promotionalController.deletePromotion);

module.exports = router;
