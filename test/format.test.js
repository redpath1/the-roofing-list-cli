import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatContractor, formatRating, formatRow, formatSearch } from '../src/format.js';

const claimed = {
  id: 101,
  name: 'Lone Star Roofing',
  trades: ['roofing', 'gutters'],
  city: 'Austin',
  state: 'TX',
  phone: '+15125550101',
  profileUrl: 'https://theroofinglist.com/roofers/texas/austin/lone-star-roofing/',
  claimed: true,
  website: 'https://lonestarroofing.example.com',
  rating: { value: 4.7, count: 12 },
};

const unclaimed = {
  id: 102,
  name: 'Hill Country Roof',
  trades: ['roofing'],
  city: 'Austin',
  state: 'TX',
  profileUrl: 'https://theroofinglist.com/roofers/texas/austin/hill-country-roof/',
  claimed: false,
};

test('ratings', () => {
  assert.equal(formatRating({ value: 4.7, count: 12 }), '4.7 (12 reviews)');
  assert.equal(formatRating({ value: 5, count: 1 }), '5 (1 review)');
  assert.equal(formatRating(undefined), 'no reviews');
});

test('a claimed row shows phone, rating, the claimed tag and the profile', () => {
  assert.equal(
    formatRow(claimed),
    'Lone Star Roofing  |  (512) 555-0101  |  4.7 (12 reviews)  |  claimed  |  https://theroofinglist.com/roofers/texas/austin/lone-star-roofing/',
  );
});

test('an unclaimed row with no phone and no rating', () => {
  const row = formatRow(unclaimed);
  assert.match(row, /no phone/);
  assert.match(row, /no reviews/);
  assert.doesNotMatch(row, /claimed/);
});

test('search output starts with a summary line', () => {
  const text = formatSearch({ contractors: [claimed, unclaimed] }, { trade: 'roofing', city: 'austin', state: 'texas' });
  const lines = text.split('\n');
  assert.equal(lines[0], '2 roofing contractors in Austin, TX');
  assert.equal(lines.length, 4);
});

test('one result uses the singular', () => {
  const text = formatSearch({ contractors: [claimed] }, { trade: 'gutters', city: 'Austin', state: 'TX' });
  assert.equal(text.split('\n')[0], '1 gutters contractor in Austin, TX');
});

test('an empty list', () => {
  assert.equal(formatSearch({ contractors: [] }, { trade: 'roofing', city: 'X', state: 'TX' }), 'No listed contractors match.');
});

test('the contractor block for a claimed firm', () => {
  const text = formatContractor(claimed);
  assert.match(text, /^Name:    Lone Star Roofing$/m);
  assert.match(text, /^Trades:  roofing, gutters$/m);
  assert.match(text, /^City:    Austin, TX$/m);
  assert.match(text, /^Website: https:\/\/lonestarroofing\.example\.com$/m);
  assert.match(text, /^Rating:  4\.7 \(12 reviews\)$/m);
  assert.match(text, /^Claimed: yes$/m);
  assert.match(text, /^Profile: https:/m);
});

test('the contractor block for an unclaimed firm', () => {
  const text = formatContractor(unclaimed);
  assert.match(text, /^Phone:   no phone$/m);
  assert.match(text, /^Website: none listed$/m);
  assert.match(text, /^Rating:  no reviews$/m);
  assert.match(text, /^Claimed: no$/m);
});
