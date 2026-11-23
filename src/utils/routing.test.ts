import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePageFromPath, pathForPage } from './routing';

test('parsePageFromPath resolves all pages and trailing slashes', () => {
  assert.equal(parsePageFromPath('/'), 'home');
  assert.equal(parsePageFromPath('/services'), 'services');
  assert.equal(parsePageFromPath('/services/'), 'services');
  assert.equal(parsePageFromPath('/gallery'), 'services');
  assert.equal(parsePageFromPath('/specialists'), 'specialists');
  assert.equal(parsePageFromPath('/booking'), 'booking');
  assert.equal(parsePageFromPath('/appointments'), 'appointments');
  assert.equal(parsePageFromPath('/unknown'), 'home');
});

test('pathForPage returns canonical URL paths', () => {
  assert.equal(pathForPage('home'), '/');
  assert.equal(pathForPage('services'), '/services');
  assert.equal(pathForPage('specialists'), '/specialists');
  assert.equal(pathForPage('booking'), '/booking');
  assert.equal(pathForPage('appointments'), '/appointments');
});
