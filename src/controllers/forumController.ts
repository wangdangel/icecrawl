import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';

const prisma = new PrismaClient();

// Helper to get jobs with mode: 'forum'
export async function getForumJobs(req: Request, res: Response) {
  try {
    const jobs = await prisma.crawlJob.findMany({
      where: {
        options: {
          contains: '"mode":"forum"',
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    // Parse options and extract dbFile for each job
    const jobsWithDbFile = jobs.map(job => {
      let dbFile = null;
      try {
        const options = job.options ? JSON.parse(job.options) : {};
        dbFile = options.filePath || null;
      } catch (e) {
        dbFile = null;
      }
      return { ...job, dbFile };
    });
    res.json(jobsWithDbFile);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch forum jobs', details: String(err) });
  }
}

// Get forum posts for a job (from default DB or standalone DB)
export async function getForumPosts(req: Request, res: Response) {
  const { jobId } = req.query;
  if (!jobId) return res.status(400).json({ error: 'Missing jobId' });
  try {
    // Find the job and parse options
    const job = await prisma.crawlJob.findUnique({ where: { id: String(jobId) } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const options = job.options ? JSON.parse(job.options) : {};
    let posts = [];
    if (options.output === 'sqlite' && options.filePath) {
      // Standalone DB: connect to the specified SQLite file
      const dbPath = path.resolve(options.filePath);
      const customPrisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });
      posts = await customPrisma.forumPost.findMany({ where: { jobId: String(jobId) } });
      await customPrisma.$disconnect();
    } else {
      // Default DB
      posts = await prisma.forumPost.findMany({ where: { jobId: String(jobId) } });
    }
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch forum posts', details: String(err) });
  }
}

// Export forum posts for a job (CSV or JSON)
export async function exportForumPosts(req: Request, res: Response) {
  const { jobId, format } = req.query;
  if (!jobId) return res.status(400).json({ error: 'Missing jobId' });
  try {
    // Find the job and parse options
    const job = await prisma.crawlJob.findUnique({ where: { id: String(jobId) } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const options = job.options ? JSON.parse(job.options) : {};
    let posts = [];
    if (options.output === 'sqlite' && options.filePath) {
      const dbPath = path.resolve(options.filePath);
      const customPrisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });
      posts = await customPrisma.forumPost.findMany({ where: { jobId: String(jobId) } });
      await customPrisma.$disconnect();
    } else {
      posts = await prisma.forumPost.findMany({ where: { jobId: String(jobId) } });
    }
    if (format === 'csv') {
      const csvRows = [
        'id,title,content,url,meta',
        ...posts.map(p =>
          [p.id, JSON.stringify(p.title), JSON.stringify(p.content), JSON.stringify(p.url), JSON.stringify(p.meta)].join(',')
        ),
      ];
      res.header('Content-Type', 'text/csv');
      res.attachment('forum-posts.csv');
      res.send(csvRows.join('\n'));
    } else {
      res.header('Content-Type', 'application/json');
      res.attachment('forum-posts.json');
      res.send(JSON.stringify(posts, null, 2));
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to export forum posts', details: String(err) });
  }
}

// Create a new standalone SQLite database file for forum jobs
export async function createForumDatabase(req: Request, res: Response) {
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'Missing filePath' });
  try {
    // Check if file already exists
    if (fs.existsSync(filePath)) {
      return res.status(200).json({ message: 'Database already exists', filePath });
    }
    // Ensure parent directory exists
    fs.mkdirSync(require('path').dirname(filePath), { recursive: true });
    // Create the SQLite DB file and initialize schema
    const db = new sqlite3.Database(filePath, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to create database', details: String(err) });
      }
      // Create a basic forumPost table (customize as needed)
      db.run(`CREATE TABLE IF NOT EXISTS forumPost (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jobId TEXT,
        title TEXT,
        content TEXT,
        url TEXT,
        meta TEXT
      )`, [], (tableErr) => {
        db.close();
        if (tableErr) {
          return res.status(500).json({ error: 'Failed to initialize database schema', details: String(tableErr) });
        }
        return res.status(201).json({ message: 'Database created', filePath });
      });
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create database', details: String(err) });
  }
}

// Create a new forum job
export async function createForumJob(req: Request, res: Response) {
  try {
    const { title, startUrl, postSelector, nextPageSelector, nextPageText, output, filePath, maxPages } = req.body;
    if (!title || !startUrl || !postSelector) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Prevent duplicate jobs for same startUrl and mode: 'forum' that are not completed/failed/cancelled
    let existingJob: any = null;
    try {
      existingJob = await prisma.crawlJob.findFirst({
        where: {
          startUrl,
          options: {
            contains: '"mode":"forum"'
          },
          status: { notIn: ['completed', 'failed', 'cancelled'] }
        },
        orderBy: { createdAt: 'desc' }
      });
      if (existingJob) {
        // Parse options and extract dbFile for the duplicate job
        let dbFile = null;
        try {
          const options = existingJob.options ? JSON.parse(existingJob.options) : {};
          dbFile = options.filePath || null;
        } catch (e) {
          dbFile = null;
        }
        return res.status(200).json({ ...existingJob, dbFile });
      }
    } catch (err) {
      return res.status(500).json({ error: 'Failed to check for duplicate forum job', details: String(err) });
    }
    // Create new job
    const options = {
      mode: 'forum',
      title,
      startUrl,
      postSelector,
      nextPageSelector,
      nextPageText,
      output,
      filePath,
      maxPages
    };
    const job = await prisma.crawlJob.create({
      data: {
        title,
        startUrl,
        options: JSON.stringify(options),
        status: 'pending',
      },
    });
    // Parse options and extract dbFile for the new job
    let dbFile = null;
    try {
      dbFile = filePath || null;
    } catch (e) {
      dbFile = null;
    }
    res.status(201).json({ ...job, dbFile });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create forum job', details: String(err) });
  }
}

// Cancel or delete a forum job by ID
export async function deleteForumJob(req: Request, res: Response) {
  try {
    const { jobId } = req.params;
    if (!jobId) {
      return res.status(400).json({ error: 'Missing jobId' });
    }
    // Optionally, check authentication/authorization here
    // Find the job to get its startUrl or options for post matching
    const job = await prisma.crawlJob.findUnique({ where: { id: jobId } });
    if (!job) {
      return res.status(404).json({ error: 'Forum job not found' });
    }
    const options = job.options ? JSON.parse(job.options) : {};
    // Attempt to delete forum posts by matching URL prefix (if possible)
    if (options.startUrl) {
      await prisma.forumPost.deleteMany({ where: { url: { startsWith: options.startUrl } } });
    } else {
      await prisma.forumPost.deleteMany({}); // fallback: delete all forum posts (not ideal)
    }
    // Delete the crawl job itself
    await prisma.crawlJob.delete({ where: { id: jobId } });
    return res.json({ status: 'success', message: 'Forum job and associated posts deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete forum job', details: String(err) });
  }
}
