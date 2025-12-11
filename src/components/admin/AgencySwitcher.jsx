import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

export default function AgencySwitcher() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [currentBusinessId, setCurrentBusinessId] = useState(null);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      setCurrentBusinessId(u.business_id);
    });
  }, []);

  const { data: businesses = [] } = useQuery({
    queryKey: ['all-businesses'],
    queryFn: () => base44.entities.Business.list(),
    enabled: user?.role === 'admin',
  });

  const currentBusiness = businesses.find(b => b.id === currentBusinessId);

  const handleSwitch = async (businessId) => {
    try {
      // Update user's business_id in the User entity
      await base44.auth.updateMe({ business_id: businessId });
      
      toast.success('Switched agency successfully');
      setCurrentBusinessId(businessId);
      setOpen(false);
      
      // Reload page to refresh all data
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      toast.error('Failed to switch agency');
    }
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[280px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <span className="truncate">
              {currentBusiness?.business_name || 'Select agency...'}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Search agency..." />
          <CommandEmpty>No agency found.</CommandEmpty>
          <CommandGroup>
            {businesses.map((business) => (
              <CommandItem
                key={business.id}
                value={business.business_name}
                onSelect={() => handleSwitch(business.id)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    currentBusinessId === business.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex-1">
                  <div className="font-medium">{business.business_name}</div>
                  <div className="text-xs text-slate-500">{business.email}</div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}