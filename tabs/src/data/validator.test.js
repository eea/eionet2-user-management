const validator = require('./validator');

test('validateName', () => {
  expect(validator.validateName('t')).toBe(
    'Please enter at least 2 characters!'
  );
});

test('validateMandatoryField-alwaysFail', () => {
  expect(validator.validateMandatoryField('test')).toBe(undefined);
});
