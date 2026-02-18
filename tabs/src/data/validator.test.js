// Polyfill for replaceAll in older Node.js versions
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function (search, replacement) {
    return this.split(search).join(replacement);
  };
}

const validator = require('./validator');

describe('validator', () => {
  describe('validatePhone', () => {
    test('should return undefined for valid phone numbers', () => {
      expect(validator.validatePhone('+1234567890')).toBeUndefined();
      expect(validator.validatePhone('123-456-7890')).toBeUndefined();
      expect(validator.validatePhone('123.456.7890')).toBeUndefined();
      expect(validator.validatePhone('123 456 7890')).toBeUndefined();
      expect(validator.validatePhone('+1-234-567-8900')).toBeUndefined();
    });

    test('should return error message for invalid phone numbers', () => {
      expect(validator.validatePhone('abc123')).toBe(
        'Only numbers and characters +, -, . are allowed.',
      );
      expect(validator.validatePhone('123@456')).toBe(
        'Only numbers and characters +, -, . are allowed.',
      );
      expect(validator.validatePhone('123#456')).toBe(
        'Only numbers and characters +, -, . are allowed.',
      );
    });

    test('should return undefined for empty or null values', () => {
      expect(validator.validatePhone('')).toBeUndefined();
      expect(validator.validatePhone(null)).toBeUndefined();
      expect(validator.validatePhone(undefined)).toBeUndefined();
    });
  });

  describe('validateName', () => {
    test('should return error for empty name', () => {
      expect(validator.validateName('')).toBe('Please fill out this field!');
      expect(validator.validateName(null)).toBe('Please fill out this field!');
      expect(validator.validateName(undefined)).toBe('Please fill out this field!');
    });

    test('should return error for name shorter than 2 characters', () => {
      expect(validator.validateName('t')).toBe('Please enter at least 2 characters!');
      expect(validator.validateName('a')).toBe('Please enter at least 2 characters!');
    });

    test('should return undefined for valid names', () => {
      expect(validator.validateName('John')).toBeUndefined();
      expect(validator.validateName('Jane Doe')).toBeUndefined();
      expect(validator.validateName('AB')).toBeUndefined(); // At least 2 characters required
    });
  });

  describe('validateMandatoryField', () => {
    test('should return error for empty values', () => {
      expect(validator.validateMandatoryField('')).toBe('Please fill out this field!');
      expect(validator.validateMandatoryField(null)).toBe('Please fill out this field!');
      expect(validator.validateMandatoryField(undefined)).toBe('Please fill out this field!');
    });

    test('should return error for empty arrays', () => {
      expect(validator.validateMandatoryField([])).toBe('Please fill out this field!');
    });

    test('should return undefined for valid values', () => {
      expect(validator.validateMandatoryField('valid value')).toBeUndefined();
      expect(validator.validateMandatoryField(['item1', 'item2'])).toBeUndefined();
      expect(validator.validateMandatoryField(123)).toBeUndefined();
      expect(validator.validateMandatoryField(true)).toBeUndefined();
      expect(validator.validateMandatoryField(1)).toBeUndefined(); // Non-zero number is valid
    });
  });
});
