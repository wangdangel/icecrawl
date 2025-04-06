import { Router, Request, Response } from 'express';
import path from 'path'; // Import path module
const router = Router(); // Instantiate Router
router.get('/login', (req: Request, res: Response) => {
  res.sendFile(path.resolve(__dirname, '../../public/login.html'));
});
export { router }; // Change to named export
