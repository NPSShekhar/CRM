import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { config } from '../config/index.js';
import { BadRequestError } from '../utils/errors.js';

if (!fs.existsSync(config.uploads.dir)) {
  fs.mkdirSync(config.uploads.dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploads.dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
];

export const upload = multer({
  storage,
  limits: {
    fileSize: config.uploads.maxFileSize,
  },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestError(`File type ${file.mimetype} is not supported`));
    }
  },
});
