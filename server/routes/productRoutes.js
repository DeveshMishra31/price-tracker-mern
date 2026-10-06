import express from 'express';
import { searchProducts } from '../controllers/productController.js';

const router = express.Router();

// Search endpoint
router.post('/search', searchProducts);

export default router;