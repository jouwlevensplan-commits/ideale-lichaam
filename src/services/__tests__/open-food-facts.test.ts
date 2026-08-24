import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBarcode, mapOpenFoodFactsProduct } from '../open-food-facts.service';

test('isBarcode herkent numerieke EAN/UPC-codes van 8 tot 14 cijfers, geen vrije tekst', () => {
  assert.equal(isBarcode('5410013106017'), true);
  assert.equal(isBarcode('12345678'), true);
  assert.equal(isBarcode('Colruyt Volkorenbrood'), false);
  assert.equal(isBarcode('123'), false);
  assert.equal(isBarcode(''), false);
});

test('mapOpenFoodFactsProduct zet een volledig Open Food Facts-product correct om', () => {
  const raw = {
    code: '5410013106017',
    product_name: 'Prince-koeken Chocolade',
    brands: 'LU,Mondelez',
    countries_tags: ['en:france', 'en:belgium'],
    nutriments: {
      'energy-kcal_100g': 469,
      proteins_100g: 6.4,
      carbohydrates_100g: 65,
      fat_100g: 20,
      fiber_100g: 2.8,
    },
  };

  const mapped = mapOpenFoodFactsProduct(raw);

  assert.ok(mapped);
  assert.equal(mapped?.barcode, '5410013106017');
  assert.equal(mapped?.name, 'Prince-koeken Chocolade');
  assert.equal(mapped?.brand, 'LU');
  assert.equal(mapped?.calories_kcal, 469);
  assert.equal(mapped?.protein_g, 6.4);
  assert.equal(mapped?.carbs_g, 65);
  assert.equal(mapped?.fat_g, 20);
  assert.equal(mapped?.fiber_g, 2.8);
  assert.equal(mapped?.is_belgian_market, true);
});

test('mapOpenFoodFactsProduct valt terug op product_name_en of generic_name als product_name ontbreekt', () => {
  const mapped = mapOpenFoodFactsProduct({
    product_name_en: 'Whole Wheat Bread',
    nutriments: { 'energy-kcal_100g': 235 },
  });

  assert.equal(mapped?.name, 'Whole Wheat Bread');
});

test('mapOpenFoodFactsProduct geeft null terug zonder bruikbare naam', () => {
  const mapped = mapOpenFoodFactsProduct({
    nutriments: { 'energy-kcal_100g': 100 },
  });

  assert.equal(mapped, null);
});

test('mapOpenFoodFactsProduct geeft null terug zonder calorieën per 100g (onvolledige entry)', () => {
  const mapped = mapOpenFoodFactsProduct({
    product_name: 'Onvolledig product',
    nutriments: {},
  });

  assert.equal(mapped, null);
});

test('mapOpenFoodFactsProduct herkent niet-Belgische producten en ontbrekende merken correct', () => {
  const mapped = mapOpenFoodFactsProduct({
    product_name: 'Test product zonder merk',
    countries_tags: ['en:netherlands'],
    nutriments: { 'energy-kcal_100g': 50 },
  });

  assert.equal(mapped?.brand, null);
  assert.equal(mapped?.barcode, null);
  assert.equal(mapped?.is_belgian_market, false);
});

test('mapOpenFoodFactsProduct geeft null terug voor niet-object input', () => {
  assert.equal(mapOpenFoodFactsProduct(null), null);
  assert.equal(mapOpenFoodFactsProduct('niet een object'), null);
  assert.equal(mapOpenFoodFactsProduct(undefined), null);
});
