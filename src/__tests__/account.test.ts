import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { deleteAccount } from '../controllers/account.controller';
import { UnauthorizedError } from '../db/errors';

function fakeResponse(): Response {
  return {
    status() {
      return this;
    },
    json() {
      return this;
    },
  } as unknown as Response;
}

test('deleteAccount weigert zonder gebruikerscontext, zonder de database te raken', async () => {
  const req = {} as Request;
  await assert.rejects(() => deleteAccount(req, fakeResponse()), UnauthorizedError);
});
