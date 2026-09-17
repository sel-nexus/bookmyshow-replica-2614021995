import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import type { CatalogService } from '../services/catalogService';

const theatreQuerySchema = z.object({ movieId: z.string().trim().min(1, 'movieId is required.') });

/** Create HTTP routes that expose the seeded movie and theatre catalog. */
export function createCatalogRouter(catalogService: CatalogService): Router {
  const router = Router();
  router.get('/movies', (_request: Request, response: Response): void => {
    response.status(200).json({ data: { movies: catalogService.listMovies() } });
  });
  router.get('/theatres', (request: Request, response: Response, next: NextFunction): void => {
    try {
      const query = theatreQuerySchema.parse(request.query);
      response.status(200).json({ data: { theatres: catalogService.listTheatres(query.movieId) } });
    } catch (error: unknown) {
      next(error);
    }
  });
  return router;
}
