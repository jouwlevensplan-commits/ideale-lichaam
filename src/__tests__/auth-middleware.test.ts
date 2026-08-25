import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { NextFunction, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { UnauthorizedError } from '../db/errors';

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';
});

afterEach(() => {
  delete process.env.JWT_SECRET;
});

function fakeRequest(headers: Record<string, string> = {}): Request {
  return {
    header(name: string) {
      return headers[name.toLowerCase()];
    },
  } as unknown as Request;
}

function captureNext(): { next: NextFunction; error: unknown } {
  const capture = { next: (() => {}) as NextFunction, error: undefined as unknown };
  capture.next = ((err?: unknown) => {
    capture.error = err;
  }) as NextFunction;
  return capture;
}

test('requireAuth wijst een ontbrekende Authorization-header af zonder de database te raken', async () => {
  const capture = captureNext();
  await requireAuth(fakeRequest(), {} as Response, capture.next);
  assert.ok(capture.error instanceof UnauthorizedError);
});

test('requireAuth wijst een header zonder "Bearer "-prefix af', async () => {
  const capture = captureNext();
  await requireAuth(fakeRequest({ authorization: 'Basic abc123' }), {} as Response, capture.next);
  assert.ok(capture.error instanceof UnauthorizedError);
});

test('requireAuth wijst een ondertekend-maar-ongeldig token af (verkeerde secret)', async () => {
  const jwt = await import('jsonwebtoken');
  const badToken = jwt.default.sign({ sub: 'iemand' }, 'verkeerde-secret');

  const capture = captureNext();
  await requireAuth(fakeRequest({ authorization: `Bearer ${badToken}` }), {} as Response, capture.next);
  assert.ok(capture.error instanceof UnauthorizedError);
});
