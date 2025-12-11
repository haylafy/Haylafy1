import React from 'react';
import { hasPermission } from '@/components/utils/permissions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * ProtectedAction - Wrapper component to conditionally render UI elements based on permissions
 * @param {Object} props
 * @param {Object} props.user - Current user object
 * @param {string} props.permission - Required permission key
 * @param {React.ReactNode} props.children - Content to render if permission is granted
 * @param {React.ReactNode} props.fallback - Optional fallback content if permission denied
 * @param {boolean} props.showTooltip - Show tooltip on hover when permission denied
 */
export default function ProtectedAction({ 
  user, 
  permission, 
  children, 
  fallback = null,
  showTooltip = true 
}) {
  const hasAccess = hasPermission(user, permission);
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  if (showTooltip && children) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-not-allowed opacity-50">
              {React.cloneElement(children, { disabled: true })}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>You don't have permission to perform this action</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return null;
}