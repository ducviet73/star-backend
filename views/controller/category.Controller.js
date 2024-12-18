const categoryModel = require('../model/category.Model');


// Create a new category
async function createCategory(name) {
    try {
        const newCategory = new categoryModel({ name });
        const result = await newCategory.save();
        return result;
    } catch (error) {
        console.log("Lỗi tạo danh mục", error);
        throw error;
    }
}

// Get all categories
async function getCategories() {
    try {
        const result = await categoryModel.find();
        return result;
    } catch (error) {
        console.log("Lỗi lấy danh sách danh mục", error);
        throw error;
    }
}


// Get a single category by ID
async function getCategoryById(id) {
    try {
        const result = await categoryModel.findById(id);
        if (!result) {
            throw new Error("Danh mục không tồn tại");
        }
        return result;
    } catch (error) {
        console.log("Lỗi lấy danh mục theo ID", error);
        throw error;
    }
}

// Update a category by ID
async function updateCategory(id, newName) {
    try {
        const result = await categoryModel.findByIdAndUpdate(id, { name: newName }, { new: true });
        if (!result) {
            throw new Error("Danh mục không tồn tại để cập nhật");
        }
        return result;
    } catch (error) {
        console.log("Lỗi cập nhật danh mục", error);
        throw error;
    }
}

// Delete a category by ID
async function deleteCategory(id) {
    try {
        const result = await categoryModel.findByIdAndDelete(id);
        if (!result) {
            throw new Error("Danh mục không tồn tại để xóa");
        }
        return result;
    } catch (error) {
        console.log("Lỗi xóa danh mục", error);
        throw error;
    }
}

module.exports = {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
};
