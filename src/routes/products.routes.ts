import { Router } from 'express';

import { searchProducts } from '../controllers/products.controller';

export const productsRouter = Router();

productsRouter.get('/search', searchProducts);
