import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, User, UserCog, FileText, Loader2, X } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from "@/lib/utils";

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const navigate = useNavigate();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['global-search-clients', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const all = await base44.entities.Client.list();
      return all.filter(c => 
        c.name?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        c.phone?.includes(debouncedQuery)
      ).slice(0, 5);
    },
    enabled: debouncedQuery.length > 1,
  });

  const { data: caregivers = [], isLoading: loadingCaregivers } = useQuery({
    queryKey: ['global-search-caregivers', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const all = await base44.entities.Caregiver.list();
      return all.filter(c => 
        c.name?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        c.phone?.includes(debouncedQuery)
      ).slice(0, 5);
    },
    enabled: debouncedQuery.length > 1,
  });

  const { data: documents = [], isLoading: loadingDocuments } = useQuery({
    queryKey: ['global-search-documents', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const all = await base44.entities.ClinicalDocument.list();
      return all.filter(d => 
        d.file_name?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        d.client_name?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        d.document_type?.toLowerCase().includes(debouncedQuery.toLowerCase())
      ).slice(0, 5);
    },
    enabled: debouncedQuery.length > 1,
  });

  const isLoading = loadingClients || loadingCaregivers || loadingDocuments;
  const hasResults = clients.length > 0 || caregivers.length > 0 || documents.length > 0;

  const handleSelect = (type, id) => {
    setOpen(false);
    setSearchQuery('');
    
    if (type === 'client') {
      navigate(createPageUrl('Clients'));
    } else if (type === 'caregiver') {
      navigate(createPageUrl('Caregivers'));
    } else if (type === 'document') {
      navigate(createPageUrl('ClinicalDocumentation'));
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setDebouncedQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search clients, caregivers, documents..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOpen(e.target.value.length > 1);
            }}
            onFocus={() => searchQuery.length > 1 && setOpen(true)}
            className="pl-9 pr-9 bg-slate-50 border-slate-200"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={handleClear}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[400px] p-0" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandList className="max-h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : !hasResults && debouncedQuery.length > 1 ? (
              <CommandEmpty>No results found</CommandEmpty>
            ) : (
              <>
                {clients.length > 0 && (
                  <CommandGroup heading="Clients">
                    {clients.map((client) => (
                      <CommandItem
                        key={client.id}
                        onSelect={() => handleSelect('client', client.id)}
                        className="flex items-center gap-3 py-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900">{client.name}</p>
                          <p className="text-sm text-slate-500 truncate">
                            {client.email || client.phone}
                          </p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {caregivers.length > 0 && (
                  <CommandGroup heading="Caregivers">
                    {caregivers.map((caregiver) => (
                      <CommandItem
                        key={caregiver.id}
                        onSelect={() => handleSelect('caregiver', caregiver.id)}
                        className="flex items-center gap-3 py-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <UserCog className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900">{caregiver.name}</p>
                          <p className="text-sm text-slate-500 truncate">
                            {caregiver.email || caregiver.phone}
                          </p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {documents.length > 0 && (
                  <CommandGroup heading="Documents">
                    {documents.map((doc) => (
                      <CommandItem
                        key={doc.id}
                        onSelect={() => handleSelect('document', doc.id)}
                        className="flex items-center gap-3 py-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{doc.file_name}</p>
                          <p className="text-sm text-slate-500">
                            {doc.client_name} • {doc.document_type?.replace('_', ' ')}
                          </p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}