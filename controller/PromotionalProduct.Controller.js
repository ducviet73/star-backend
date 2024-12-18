const PromotionalProduct = require('../model/PromotionalProduct.Model');

exports.createPromotionalProduct = async (req, res) => {
    try {
        const promotionalProduct = new PromotionalProduct(req.body);
        await promotionalProduct.save();
        res.status(201).json(promotionalProduct);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Assuming each product has a reference to a promotion in the 'PromotionalProduct' model
exports.getPromotionalProducts = async (req, res) => {
    try {
        const promotionalProducts = await PromotionalProduct.find()
            .populate('id_product')  // Populate the product details
            .populate('id_promotional');  // Populate the promotion details
        res.status(200).json(promotionalProducts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.updatePromotionalProduct = async (req, res) => {
    try {
        const promotionalProduct = await PromotionalProduct.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(promotionalProduct);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deletePromotionalProduct = async (req, res) => {
    try {
        await PromotionalProduct.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};