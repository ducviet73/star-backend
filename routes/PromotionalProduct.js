const express = require('express');
const router = express.Router();
const promotionalProductsController = require('../controller/PromotionalProduct.Controller');

router.post('/', promotionalProductsController.createPromotionalProduct);
router.get('/', promotionalProductsController.getPromotionalProducts);
router.put('/:id', promotionalProductsController.updatePromotionalProduct);
router.delete('/:id', promotionalProductsController.deletePromotionalProduct);

module.exports = router;