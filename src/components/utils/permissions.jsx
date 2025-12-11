// Role-based Access Control (RBAC) System
// Defines permissions for each user role in the application

export const ROLES = {
  SUPER_ADMIN: 'admin', // Platform super admin
  BUSINESS_ADMIN: 'business_admin', // Business owner/administrator
  CASE_MANAGER: 'case_manager', // Care coordinator
  BILLING_STAFF: 'billing_staff', // Billing specialist
  CAREGIVER: 'caregiver', // Field caregiver
  VIEWER: 'viewer', // Read-only access
};

export const PERMISSIONS = {
  // Business Management
  MANAGE_BUSINESS: [ROLES.SUPER_ADMIN],
  VIEW_BUSINESS: [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN],
  
  // User Management
  MANAGE_USERS: [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN],
  INVITE_USERS: [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN],
  
  // Client/Patient Management
  CREATE_CLIENTS: [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER],
  VIEW_CLIENTS: [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER, ROLES.CAREGIVER, ROLES.VIEWER],
  EDIT_CLIENTS: [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER],
  DELETE_CLIENTS: [ROLES.BUSINESS_ADMIN],
  
  // Caregiver Management
  CREATE_CAREGIVERS: [ROLES.BUSINESS_ADMIN],
  VIEW_CAREGIVERS: [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER, ROLES.VIEWER],
  EDIT_CAREGIVERS: [ROLES.BUSINESS_ADMIN],
  DELETE_CAREGIVERS: [ROLES.BUSINESS_ADMIN],
  
  // Scheduling
  CREATE_SHIFTS: [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER],
  VIEW_SHIFTS: [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER, ROLES.CAREGIVER, ROLES.VIEWER],
  EDIT_SHIFTS: [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER],
  DELETE_SHIFTS: [ROLES.BUSINESS_ADMIN],
  
  // Clinical Documentation
  CREATE_CARE_PLANS: [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER],
  VIEW_CARE_PLANS: [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER, ROLES.CAREGIVER],
  EDIT_CARE_PLANS: [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER],
  DELETE_CARE_PLANS: [ROLES.BUSINESS_ADMIN],
  
  CREATE_ASSESSMENTS: [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER],
  VIEW_ASSESSMENTS: [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER, ROLES.CAREGIVER],
  EDIT_ASSESSMENTS: [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER],
  
  UPLOAD_DOCUMENTS: [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER],
  VIEW_DOCUMENTS: [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER, ROLES.CAREGIVER],
  DELETE_DOCUMENTS: [ROLES.BUSINESS_ADMIN],
  
  // Visit Tracking & EVV
  CREATE_VISITS: [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER, ROLES.CAREGIVER],
  VIEW_VISITS: [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER, ROLES.CAREGIVER, ROLES.VIEWER],
  EDIT_VISITS: [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER, ROLES.CAREGIVER],
  CLOCK_IN_OUT: [ROLES.CAREGIVER],
  
  // Visit Notes
  CREATE_VISIT_NOTES: [ROLES.CAREGIVER],
  VIEW_VISIT_NOTES: [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER, ROLES.CAREGIVER],
  EDIT_VISIT_NOTES: [ROLES.CAREGIVER],
  DELETE_VISIT_NOTES: [ROLES.BUSINESS_ADMIN],
  
  // Billing & Payments
  CREATE_INVOICES: [ROLES.BUSINESS_ADMIN, ROLES.BILLING_STAFF],
  VIEW_INVOICES: [ROLES.BUSINESS_ADMIN, ROLES.BILLING_STAFF, ROLES.VIEWER],
  EDIT_INVOICES: [ROLES.BUSINESS_ADMIN, ROLES.BILLING_STAFF],
  DELETE_INVOICES: [ROLES.BUSINESS_ADMIN],
  
  CREATE_PAYMENTS: [ROLES.BUSINESS_ADMIN, ROLES.BILLING_STAFF],
  VIEW_PAYMENTS: [ROLES.BUSINESS_ADMIN, ROLES.BILLING_STAFF, ROLES.VIEWER],
  EDIT_PAYMENTS: [ROLES.BUSINESS_ADMIN, ROLES.BILLING_STAFF],
  
  MANAGE_BILLING_RATES: [ROLES.BUSINESS_ADMIN],
  VIEW_BILLING_RATES: [ROLES.BUSINESS_ADMIN, ROLES.BILLING_STAFF],
  
  EXPORT_CLAIMS: [ROLES.BUSINESS_ADMIN, ROLES.BILLING_STAFF],
  VIEW_CLAIMS: [ROLES.BUSINESS_ADMIN, ROLES.BILLING_STAFF],
  
  // HR & Onboarding
  CREATE_ONBOARDING_TASKS: [ROLES.BUSINESS_ADMIN],
  VIEW_ONBOARDING_TASKS: [ROLES.BUSINESS_ADMIN, ROLES.CAREGIVER],
  EDIT_ONBOARDING_TASKS: [ROLES.BUSINESS_ADMIN, ROLES.CAREGIVER],
  DELETE_ONBOARDING_TASKS: [ROLES.BUSINESS_ADMIN],
  
  // Reports & Analytics
  VIEW_REPORTS: [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER, ROLES.BILLING_STAFF, ROLES.VIEWER],
  EXPORT_REPORTS: [ROLES.BUSINESS_ADMIN, ROLES.BILLING_STAFF],
  
  // Settings
  MANAGE_SETTINGS: [ROLES.BUSINESS_ADMIN],
  VIEW_SETTINGS: [ROLES.BUSINESS_ADMIN],
  
  // Referrals
  CREATE_REFERRALS: [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER],
  VIEW_REFERRALS: [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER, ROLES.VIEWER],
  EDIT_REFERRALS: [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER],
  DELETE_REFERRALS: [ROLES.BUSINESS_ADMIN],
};

/**
 * Check if a user has a specific permission
 * @param {Object} user - User object with role and user_role properties
 * @param {string} permission - Permission key from PERMISSIONS
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  if (!user) return false;
  
  // Get the user's role (check both 'role' for super admin and 'user_role' for business users)
  const userRole = user.role || user.user_role;
  
  if (!userRole) return false;
  
  // Super admins have all permissions
  if (userRole === ROLES.SUPER_ADMIN) return true;
  
  // Check if the permission exists and if the user's role is in the allowed roles
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  
  return allowedRoles.includes(userRole);
}

/**
 * Check if a user has any of the specified permissions
 * @param {Object} user - User object
 * @param {Array<string>} permissions - Array of permission keys
 * @returns {boolean}
 */
export function hasAnyPermission(user, permissions) {
  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Check if a user has all of the specified permissions
 * @param {Object} user - User object
 * @param {Array<string>} permissions - Array of permission keys
 * @returns {boolean}
 */
export function hasAllPermissions(user, permissions) {
  return permissions.every(permission => hasPermission(user, permission));
}

/**
 * Get all permissions for a user role
 * @param {string} role - User role
 * @returns {Array<string>}
 */
export function getRolePermissions(role) {
  if (role === ROLES.SUPER_ADMIN) {
    return Object.keys(PERMISSIONS);
  }
  
  return Object.keys(PERMISSIONS).filter(permission => 
    PERMISSIONS[permission].includes(role)
  );
}

/**
 * Check if user can access a specific page
 * @param {Object} user - User object
 * @param {string} pageName - Page name
 * @returns {boolean}
 */
export function canAccessPage(user, pageName) {
  if (!user) return false;
  
  const userRole = user.role || user.user_role;
  
  // Super admin can access everything
  if (userRole === ROLES.SUPER_ADMIN) return true;
  
  // Page access rules
  const pageAccess = {
    'Dashboard': [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER, ROLES.BILLING_STAFF, ROLES.VIEWER],
    'CaregiverDashboard': [ROLES.CAREGIVER],
    'InfoCenter': [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER, ROLES.BILLING_STAFF, ROLES.CAREGIVER, ROLES.VIEWER],
    'PatientOnboarding': [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER],
    'Services': [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER, ROLES.BILLING_STAFF, ROLES.CAREGIVER, ROLES.VIEWER],
    'Caregivers': [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER, ROLES.VIEWER],
    'Clients': [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER, ROLES.CAREGIVER, ROLES.VIEWER],
    'Scheduling': [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER, ROLES.CAREGIVER, ROLES.VIEWER],
    'VisitTracking': [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER, ROLES.CAREGIVER, ROLES.VIEWER],
    'ClinicalDocumentation': [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER, ROLES.CAREGIVER],
    'EVV': [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER, ROLES.CAREGIVER],
    'BillingAutomation': [ROLES.BUSINESS_ADMIN, ROLES.BILLING_STAFF],
    'Claims': [ROLES.BUSINESS_ADMIN, ROLES.BILLING_STAFF],
    'ClaimExport': [ROLES.BUSINESS_ADMIN, ROLES.BILLING_STAFF],
    'Reports': [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER, ROLES.BILLING_STAFF, ROLES.VIEWER],
    'Onboarding': [ROLES.BUSINESS_ADMIN, ROLES.CAREGIVER],
    'Settings': [ROLES.BUSINESS_ADMIN],
    'Referrals': [ROLES.BUSINESS_ADMIN, ROLES.CASE_MANAGER, ROLES.VIEWER],
    'CaregiverOnboarding': [ROLES.BUSINESS_ADMIN],
    'BusinessManagement': [ROLES.SUPER_ADMIN],
    'UserManagement': [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN],
    };
  
  const allowedRoles = pageAccess[pageName];
  if (!allowedRoles) return true; // Allow access if not specified
  
  return allowedRoles.includes(userRole);
}