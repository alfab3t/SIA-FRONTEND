/**
 * Utility functions untuk permission checking
 */

/**
 * Check apakah user memiliki permission tertentu
 * @param {Object} userData - Data user dari getUserData()
 * @param {string} permission - Nama permission yang ingin dicek
 * @returns {boolean}
 */
export const hasPermission = (userData, permission) => {
  return userData?.permission?.includes(permission) || false;
};

/**
 * Check apakah user memiliki salah satu dari beberapa permission
 * @param {Object} userData - Data user dari getUserData()
 * @param {string[]} permissions - Array nama permission
 * @returns {boolean}
 */
export const hasAnyPermission = (userData, permissions) => {
  if (!userData?.permission || !Array.isArray(permissions)) return false;
  return permissions.some(permission => userData.permission.includes(permission));
};

/**
 * Check apakah user memiliki semua permission yang disebutkan
 * @param {Object} userData - Data user dari getUserData()
 * @param {string[]} permissions - Array nama permission
 * @returns {boolean}
 */
export const hasAllPermissions = (userData, permissions) => {
  if (!userData?.permission || !Array.isArray(permissions)) return false;
  return permissions.every(permission => userData.permission.includes(permission));
};

/**
 * Generate actions untuk tabel berdasarkan permission
 * @param {Object} userData - Data user dari getUserData()
 * @param {string} module - Nama module (contoh: 'drop_out', 'pengunduran_diri')
 * @param {Object} options - Options untuk customize actions
 * @returns {string[]}
 */
export const getTableActions = (userData, module, options = {}) => {
  const {
    includeDetail = true,
    includeEdit = true,
    includeDelete = true,
    includeApprove = false,
    customActions = []
  } = options;

  const actions = [];

  if (includeDetail) {
    actions.push("Detail");
  }

  if (includeEdit && hasPermission(userData, `${module}.edit`)) {
    actions.push("Edit");
  }

  if (includeDelete && hasPermission(userData, `${module}.delete`)) {
    actions.push("Delete");
  }

  if (includeApprove && hasPermission(userData, `${module}.approve_reject`)) {
    actions.push("Approve", "Reject");
  }

  // Tambahkan custom actions
  actions.push(...customActions);

  return actions;
};
