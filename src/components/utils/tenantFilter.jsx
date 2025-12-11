import { base44 } from '@/api/base44Client';

/**
 * Utility to ensure all queries are filtered by business_id
 * This enforces tenant isolation at the query level
 */
export async function getTenantFilter() {
  try {
    const user = await base44.auth.me();
    
    // Super admin can see all data
    if (user.role === 'admin') {
      return {};
    }
    
    // All other users must filter by their business_id
    if (!user.business_id) {
      throw new Error('User is not assigned to any agency');
    }
    
    return { business_id: user.business_id };
  } catch (error) {
    console.error('Failed to get tenant filter:', error);
    return { business_id: null }; // Will return no results
  }
}

/**
 * Wrapper for entity list queries with automatic tenant filtering
 */
export async function listWithTenantFilter(entityName, sort = null, limit = null) {
  const filter = await getTenantFilter();
  
  // If admin with no filter, list all
  if (Object.keys(filter).length === 0) {
    return base44.entities[entityName].list(sort, limit);
  }
  
  // Otherwise filter by business_id
  return base44.entities[entityName].filter(filter, sort, limit);
}

/**
 * Check if user has access to create records for a specific business
 */
export async function canAccessBusiness(businessId) {
  const user = await base44.auth.me();
  
  // Super admin can access all businesses
  if (user.role === 'admin') {
    return true;
  }
  
  // Regular users can only access their own business
  return user.business_id === businessId;
}

/**
 * Ensure record data includes business_id before creation
 */
export async function enforceBusinessId(data) {
  const user = await base44.auth.me();
  
  // If super admin and business_id is already set, allow it
  if (user.role === 'admin' && data.business_id) {
    return data;
  }
  
  // Otherwise, enforce user's business_id
  if (!user.business_id) {
    throw new Error('User is not assigned to any agency');
  }
  
  return {
    ...data,
    business_id: user.business_id,
  };
}