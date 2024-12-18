const mongoose = require('mongoose');

const promotionalSchema = new mongoose.Schema({
    percent_discount: { type: Number, required: true },
    applicable_quantity: { type: Number, required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Promotional', promotionalSchema);