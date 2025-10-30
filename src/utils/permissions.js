/**
 * Permission utilities for role-based access control
 */

/**
 * Check if the current user is an admin
 * @param {Object} user - The current user object
 * @returns {boolean} - True if user is admin, false otherwise
 */
export const isAdmin = (user) => {
  return user && user.role === 'admin';
};

/**
 * Check if the current user can perform admin actions
 * @param {Object} user - The current user object
 * @returns {boolean} - True if user can perform admin actions, false otherwise
 */
export const canPerformAdminActions = (user) => {
  return isAdmin(user);
};

/**
 * Check if the current user can delete items
 * @param {Object} user - The current user object
 * @returns {boolean} - True if user can delete items, false otherwise
 */
export const canDelete = (user) => {
  return canPerformAdminActions(user);
};

/**
 * Check if the current user can archive items
 * @param {Object} user - The current user object
 * @returns {boolean} - True if user can archive items, false otherwise
 */
export const canArchive = (user) => {
  return canPerformAdminActions(user);
};

/**
 * Check if the current user can restore items
 * @param {Object} user - The current user object
 * @returns {boolean} - True if user can restore items, false otherwise
 */
export const canRestore = (user) => {
  return canPerformAdminActions(user);
};
