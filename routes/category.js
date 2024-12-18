var express = require('express');
var router = express.Router();
//Imort model
var {ObjectId} = require('mongodb');
const categoryController = require('../controller/category.Controller');


router.get('/', async (req, res) => {
  try {
      const result = await categoryController.getCategories();
      res.status(201).json(result);
  } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.post('/', async (req, res) => {
  try {
      const { name } = req.body;
      if (!name) {
          return res.status(400).json({ message: 'Tên danh mục là bắt buộc' });
      }
      const newCategory = await categoryController.createCategory(name);
      res.status(201).json(newCategory);
  } catch (error) {
      res.status(500).json({ message: 'Lỗi khi tạo danh mục', error: error.message });
  }
});

// // Get all categories
// router.get('/categories', async (req, res) => {
//   try {
//       const categories = await categoryController.getCategories();
//       res.status(200).json(categories);
//   } catch (error) {
//       res.status(500).json({ message: 'Lỗi khi lấy danh sách danh mục', error: error.message });
//   }
// });

// Get a category by ID
router.get('/:id', async (req, res) => {
  try {
      const { id } = req.params;
      const category = await categoryController.getCategoryById(id);
      res.status(200).json(category);
  } catch (error) {
      res.status(404).json({ message: 'Danh mục không tìm thấy', error: error.message });
  }
});

// Update a category by ID
router.put('/:id', async (req, res) => {
  try {
      const { id } = req.params;
      const { name } = req.body;
      if (!name) {
          return res.status(400).json({ message: 'Tên danh mục là bắt buộc' });
      }
      const updatedCategory = await categoryController.updateCategory(id, name);
      res.status(200).json(updatedCategory);
  } catch (error) {
      res.status(404).json({ message: 'Danh mục không tìm thấy để cập nhật', error: error.message });
  }
});

// Delete a category by ID
router.delete('/:id', async (req, res) => {
  try {
      const { id } = req.params;
      const deletedCategory = await categoryController.deleteCategory(id);
      res.status(200).json(deletedCategory);
  } catch (error) {
      res.status(404).json({ message: 'Danh mục không tìm thấy để xóa', error: error.message });
  }
});

  

module.exports = router;
