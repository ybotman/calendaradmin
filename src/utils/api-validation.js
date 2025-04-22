/**
 * API validation utilities
 * Provides functions for validating API requests
 */

/**
 * Validate and extract appId from search parameters
 * Returns appId if valid or throws an error if missing or invalid
 * NEVER DEFAULTS to a fallback value - application must provide a valid appId
 * 
 * @param {URLSearchParams} searchParams - The URL search parameters
 * @returns {string} The validated appId
 * @throws {Error} If appId is missing or invalid
 */
export const validateAppId = (searchParams) => {
  // Check if appId exists
  if (!searchParams.has('appId')) {
    throw new Error('Missing required parameter: appId');
  }
  
  const appId = searchParams.get('appId');
  
  // Validate appId format
  if (!appId || appId.trim() === '') {
    throw new Error('Invalid appId: cannot be empty');
  }
  
  // Basic pattern check (can be expanded as needed)
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(appId)) {
    throw new Error('Invalid appId format: must contain only alphanumeric characters, underscores, or hyphens');
  }
  
  return appId;
};

/**
 * Check if appId exists without validation errors
 * Returns boolean instead of throwing errors
 * 
 * @param {URLSearchParams} searchParams - The URL search parameters
 * @returns {Object} Result object with isValid and appId properties
 */
export const hasValidAppId = (searchParams) => {
  try {
    const appId = validateAppId(searchParams);
    return { isValid: true, appId };
  } catch (error) {
    return { isValid: false, error: error.message };
  }
};

/**
 * Extract validated and typed parameters from request
 * Will throw error if appId validation fails - NEVER defaults appId
 * 
 * @param {URLSearchParams} searchParams - The URL search parameters
 * @param {Object} paramConfig - Configuration for parameter extraction with types and default values
 * @returns {Object} Extracted parameters
 * @throws {Error} If appId validation fails
 */
export const extractParams = (searchParams, paramConfig) => {
  const params = {};
  
  // Always validate and include appId - this will throw if invalid
  params.appId = validateAppId(searchParams);
  
  // Extract other parameters based on config
  Object.entries(paramConfig).forEach(([paramName, config]) => {
    if (searchParams.has(paramName)) {
      const rawValue = searchParams.get(paramName);
      
      // Convert to appropriate type
      if (config.type === 'boolean') {
        params[paramName] = rawValue === 'true';
      } else if (config.type === 'number') {
        params[paramName] = Number(rawValue);
      } else if (config.type === 'date') {
        params[paramName] = new Date(rawValue);
      } else {
        // Default to string
        params[paramName] = rawValue;
      }
    } else if (config.default !== undefined) {
      // Use default value if parameter is not provided
      params[paramName] = config.default;
    }
  });
  
  return params;
};

/**
 * Validate request body
 * 
 * @param {Object} body - The request body to validate
 * @param {Object} schema - Schema definition for validation
 * @returns {Object} Validation result { isValid, errors }
 */
export const validateRequestBody = (body, schema) => {
  const errors = [];
  
  // Check required fields
  for (const [field, config] of Object.entries(schema)) {
    if (config.required && (body[field] === undefined || body[field] === null)) {
      errors.push(`Missing required field: ${field}`);
      continue;
    }
    
    // If field exists, check type
    if (body[field] !== undefined && body[field] !== null) {
      const value = body[field];
      let typeError = false;
      
      if (config.type === 'string' && typeof value !== 'string') {
        typeError = true;
      } else if (config.type === 'number' && typeof value !== 'number') {
        typeError = true;
      } else if (config.type === 'boolean' && typeof value !== 'boolean') {
        typeError = true;
      } else if (config.type === 'array' && !Array.isArray(value)) {
        typeError = true;
      } else if (config.type === 'object' && (typeof value !== 'object' || Array.isArray(value) || value === null)) {
        typeError = true;
      }
      
      if (typeError) {
        errors.push(`Invalid type for field '${field}': expected ${config.type}`);
      }
      
      // Additional validations based on schema
      if (config.pattern && typeof value === 'string' && !new RegExp(config.pattern).test(value)) {
        errors.push(`Invalid format for field '${field}'`);
      }
      
      if (config.min !== undefined && typeof value === 'number' && value < config.min) {
        errors.push(`Field '${field}' must be at least ${config.min}`);
      }
      
      if (config.max !== undefined && typeof value === 'number' && value > config.max) {
        errors.push(`Field '${field}' must be at most ${config.max}`);
      }
      
      if (config.minLength !== undefined && typeof value === 'string' && value.length < config.minLength) {
        errors.push(`Field '${field}' must be at least ${config.minLength} characters long`);
      }
      
      if (config.maxLength !== undefined && typeof value === 'string' && value.length > config.maxLength) {
        errors.push(`Field '${field}' must be at most ${config.maxLength} characters long`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
  validateAppId,
  hasValidAppId,
  extractParams,
  validateRequestBody
};