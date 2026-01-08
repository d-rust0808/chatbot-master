/**
 * User Role Types
 * 
 * WHY: Define role hierarchy và permissions
 * - sp-admin: Super admin, quản trị hệ thống, tạo tenants và admin accounts
 * - admin: Admin của tenant, triển khai cho khách hàng
 * 
 * NOTE: Customer không phải user - họ chỉ là data trong conversations/messages
 *       khi khách hàng chat hoặc đặt hàng qua chatbot
 */

export enum SystemRole {
  SUPER_ADMIN = 'sp-admin',
  ADMIN = 'admin',
}

export enum TenantRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

/**
 * Check if user has system role
 */
export function hasSystemRole(userRole: string | undefined, requiredRole: SystemRole): boolean {
  if (!userRole) return false;
  
  // Role hierarchy: sp-admin > admin
  const roleHierarchy: Record<SystemRole, number> = {
    [SystemRole.SUPER_ADMIN]: 2,
    [SystemRole.ADMIN]: 1,
  };
  
  const userLevel = roleHierarchy[userRole as SystemRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(userRole: string | undefined): boolean {
  return userRole === SystemRole.SUPER_ADMIN;
}

/**
 * Check if user is admin or super admin
 */
export function isAdminOrSuperAdmin(userRole: string | undefined): boolean {
  return userRole === SystemRole.SUPER_ADMIN || userRole === SystemRole.ADMIN;
}

