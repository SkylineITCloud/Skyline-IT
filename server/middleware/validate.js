const { body, validationResult } = require('express-validator');

const contactRules = [
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name too long'),
  body('email').trim().isEmail().withMessage('Valid email required')
    .normalizeEmail(),
  body('message').trim().notEmpty().withMessage('Message is required')
    .isLength({ max: 2000 }).withMessage('Message too long'),
  body('company').optional().trim().isLength({ max: 200 }),
];

const subscribeRules = [
  body('email').trim().isEmail().withMessage('Valid email required')
    .normalizeEmail(),
];

const inquiryRules = [
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }),
  body('email').trim().isEmail().withMessage('Valid email required')
    .normalizeEmail(),
  body('service_type').trim().notEmpty().withMessage('Service type is required'),
  body('description').trim().notEmpty().withMessage('Description is required')
    .isLength({ max: 3000 }),
  body('company').optional().trim().isLength({ max: 200 }),
];

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

module.exports = { contactRules, subscribeRules, inquiryRules, handleValidationErrors };
