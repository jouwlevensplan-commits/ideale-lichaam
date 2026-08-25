import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { hashPassword, verifyPassword, signToken, verifyToken } from '../auth.service';
import { UnauthorizedError } from '../../db/errors';

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';
});

afterEach(() => {
  delete process.env.JWT_SECRET;
});

test('hashPassword/verifyPassword: een correct wachtwoord verifieert, een fout wachtwoord niet', async () => {
  const hash = await hashPassword('correct-paardebatterij-1');
  assert.equal(await verifyPassword('correct-paardebatterij-1', hash), true);
  assert.equal(await verifyPassword('fout-wachtwoord', hash), false);
});

test('hashPassword produceert nooit het platte wachtwoord zelf', async () => {
  const hash = await hashPassword('geheim123');
  assert.notEqual(hash, 'geheim123');
  assert.ok(hash.startsWith('$2'));
});

test('signToken/verifyToken: een geldig getekende token levert de oorspronkelijke gebruikers-ID terug', () => {
  const token = signToken('11111111-1111-4111-8111-111111111111');
  const payload = verifyToken(token);
  assert.equal(payload.sub, '11111111-1111-4111-8111-111111111111');
});

test('verifyToken gooit UnauthorizedError voor een ondertekende token met de verkeerde secret', () => {
  const tokenMetVerkeerdeSecret = jwt.sign({ sub: 'iemand' }, 'een-andere-secret');
  assert.throws(() => verifyToken(tokenMetVerkeerdeSecret), UnauthorizedError);
});

test('verifyToken gooit UnauthorizedError voor een verlopen token', () => {
  const verlopenToken = jwt.sign({ sub: 'iemand' }, process.env.JWT_SECRET as string, { expiresIn: -1 });
  assert.throws(() => verifyToken(verlopenToken), UnauthorizedError);
});

test('verifyToken gooit UnauthorizedError voor onzin-input', () => {
  assert.throws(() => verifyToken('niet-een-jwt'), UnauthorizedError);
});

test('signToken gooit een duidelijke fout als JWT_SECRET ontbreekt, in plaats van stil een onveilige default te gebruiken', () => {
  delete process.env.JWT_SECRET;
  assert.throws(() => signToken('iemand'), /JWT_SECRET/);
});
