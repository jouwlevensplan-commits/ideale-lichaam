import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { getStreak, getToday } from '../controllers/dashboard.controller';
import { ConsentRequiredError, UnauthorizedError } from '../db/errors';
import type { User } from '../db/models';

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

function fakeRequest(user?: Partial<User>): Request {
  return { user: user as User | undefined } as unknown as Request;
}

test('getToday weigert zonder gebruikerscontext, zonder de database te raken', async () => {
  await assert.rejects(() => getToday(fakeRequest(undefined), fakeResponse()), UnauthorizedError);
});

test('getToday weigert zonder health_data_consent, zonder de database te raken', async () => {
  const req = fakeRequest({ id: 'iemand', health_data_consent: false });
  await assert.rejects(() => getToday(req, fakeResponse()), ConsentRequiredError);
});

test('getStreak weigert zonder gebruikerscontext, zonder de database te raken', async () => {
  await assert.rejects(() => getStreak(fakeRequest(undefined), fakeResponse()), UnauthorizedError);
});

test('getStreak weigert zonder health_data_consent, zonder de database te raken', async () => {
  const req = fakeRequest({ id: 'iemand', health_data_consent: false });
  await assert.rejects(() => getStreak(req, fakeResponse()), ConsentRequiredError);
});
