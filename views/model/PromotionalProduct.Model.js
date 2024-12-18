const mongoose = require('mongoose');

const promotionalProductSchema = new mongoose.Schema({
    id_product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    id_promotional: { type: mongoose.Schema.Types.ObjectId, ref: 'Promotional', required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    deleted_at: { type: Date },
});

module.exports = mongoose.model('PromotionalProduct', promotionalProductSchema);