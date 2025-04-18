import express from 'express';
import {
  getForumJobs,
  getForumPosts,
  exportForumPosts,
  createForumDatabase,
  createForumJob,
  deleteForumJob,
} from '../controllers/forumController';
import { authenticate } from '../middleware/authMiddleware';

const router = express.Router();

// List all forum jobs
router.get('/jobs', authenticate, getForumJobs);

// Create a new forum job
router.post('/jobs', authenticate, createForumJob);

// Delete/cancel a forum job
router.delete('/jobs/:jobId', authenticate, deleteForumJob);

// Get forum posts for a job
router.get('/posts', authenticate, getForumPosts);

// Export forum posts for a job
router.get('/posts/export', authenticate, exportForumPosts);

// Remove the public create-forum-db endpoint from forumRoutes (handled in index.ts)
// router.post('/create-forum-db', createForumDatabase);

export default router;
