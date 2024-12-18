const Promotional = require('../model/promotional.Model');

exports.createPromotion = async (req, res) => {
    try {
      const promotion = new Promotional(req.body);
      await promotion.save();
      res.status(201).json(promotion);
    } catch (error) {
      console.error("Error creating promotion:", error); // Log lỗi ra terminal
      res.status(500).json({ error: error.message });
    }
  };
  

exports.getPromotions = async (req, res) => {
    try {
        const promotions = await Promotional.find();
        res.status(200).json(promotions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updatePromotion = async (req, res) => {
    try {
        const promotion = await Promotional.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(promotion);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deletePromotion = async (req, res) => {
    try {
        await Promotional.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};