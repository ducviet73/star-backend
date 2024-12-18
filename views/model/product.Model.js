const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new Schema({
    name: { type: String, required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    sale: { 
        type: Number, 
        default: 0, 
        min: [0, 'Sale percentage cannot be negative'], 
        max: [100, 'Sale percentage cannot exceed 100'] 
    },
    description: { type: String, required: true },
    price: { 
        type: Number, 
        required: true, 
        min: [0, 'Price must be positive'] 
    },
    content: { type: String, required: true },
    image: { type: String }, // Changed to not required to allow for no image
    images: [{ type: String }], 
    view: { 
        type: Number, 
        default: 0, 
        min: [0, 'View count cannot be negative'] 
    },
    inventory: { 
        type: Number, 
        default: 0, 
        min: [0, 'Inventory cannot be negative'] 
    },
    rating: { 
        type: Number, 
        default: 0, 
        min: [0, 'Rating must be at least 0'], 
        max: [5, 'Rating cannot be more than 5'] 
    }
}, { timestamps: true });

// Indexes to improve query performance
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });

module.exports = mongoose.model('Product', productSchema);
