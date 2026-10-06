const express = require('express');
const { z } = require('zod');
const { validate } = require('./validate');
const { requestId, notFoundHandler, errorHandler } = require('./errorHandler');
const { NotFoundError, ConflictError } = require('./errors');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const users = new Map();
let nextId = 1;

const createUserBody = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  age: z.number().int('Age must be an integer').min(18, 'Must be 18 or older').max(120),
}).strict(); // unknown fields are rejected

const idParams = z.object({ id: z.coerce.number().int().positive('id must be a positive integer') });

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.enum(['name', 'age']).default('name'),
});

function createApp() {
  const app = express();
  app.use(requestId);
  app.use(express.json({ limit: '10kb' }));

  app.post('/v1/users', validate({ body: createUserBody }), (req, res, next) => {
    const { email } = req.validated.body;
    if ([...users.values()].some((u) => u.email === email)) return next(new ConflictError('Email already registered'));
    const user = { id: nextId++, ...req.validated.body };
    users.set(user.id, user);
    res.status(201).json(user);
  });

  app.get('/v1/users', validate({ query: listQuery }), (req, res) => {
    const { page, limit, sort } = req.validated.query;
    const all = [...users.values()].sort((a, b) => (a[sort] > b[sort] ? 1 : -1));
    res.json({ page, limit, total: all.length, data: all.slice((page - 1) * limit, page * limit) });
  });

  app.get('/v1/users/:id', validate({ params: idParams }), (req, res, next) => {
    const user = users.get(req.validated.params.id);
    return user ? res.json(user) : next(new NotFoundError('User'));
  });

  // Demo routes that fail on purpose, to prove nothing leaks.
  app.get('/v1/crash', () => { throw new Error('DB password is hunter2 at /srv/app/db.js:42'); });
  app.get('/v1/crash-async', asyncHandler(async () => { throw new Error('async failure with secret internals'); }));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
module.exports = { createApp };
