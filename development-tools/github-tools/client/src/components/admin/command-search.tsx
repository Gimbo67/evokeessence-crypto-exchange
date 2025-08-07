import * as React from "react";
import {
  Search,
  Loader2,
  User,
  FileText,
  Users
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "@/lib/language-context";
import { useDebounce } from "@/hooks/use-debounce";

type SearchResult = {
  category: string;
  type: 'client' | 'transaction' | 'employee';
  id: string | number;
  title: string;
  subtitle: string;
};

export function CommandSearch() {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const debouncedValue = useDebounce(inputValue, 300);
  const [_, navigate] = useLocation();
  const t = useTranslations();

  const { data: searchResults = [], isLoading } = useQuery<SearchResult[]>({
    queryKey: ['/api/admin/search', debouncedValue],
    queryFn: async () => {
      const response = await fetch(`/api/admin/search?q=${encodeURIComponent(debouncedValue)}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Search failed');
      }
      return response.json();
    },
    enabled: debouncedValue.length > 0,
  });

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const onSelect = React.useCallback((result: SearchResult) => {
    setOpen(false);
    switch (result.type) {
      case 'client':
        navigate(`/admin/dashboard_clients/${result.id}`);
        break;
      case 'employee':
        navigate(`/admin/employees/${result.id}`);
        break;
      case 'transaction':
        navigate(`/admin/transactions?highlight=${result.id}`);
        break;
    }
  }, [navigate]);

  const renderResults = () => {
    if (!debouncedValue) {
      return <CommandEmpty>Type to start searching...</CommandEmpty>;
    }

    if (searchResults.length === 0) {
      return <CommandEmpty>{t('no_results_found')}</CommandEmpty>;
    }

    const clientResults = searchResults.filter(result => result.type === 'client');
    const transactionResults = searchResults.filter(result => result.type === 'transaction');
    const employeeResults = searchResults.filter(result => result.type === 'employee');

    return (
      <>
        {clientResults.length > 0 && (
          <>
            <CommandGroup heading={t('clients')}>
              {clientResults.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.title}
                  onSelect={() => onSelect(result)}
                  className="cursor-pointer hover:bg-accent"
                >
                  <User className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{result.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {result.subtitle}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {(transactionResults.length > 0 || employeeResults.length > 0) && <CommandSeparator />}
          </>
        )}

        {transactionResults.length > 0 && (
          <>
            <CommandGroup heading={t('transactions')}>
              {transactionResults.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.title}
                  onSelect={() => onSelect(result)}
                  className="cursor-pointer hover:bg-accent"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{result.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {result.subtitle}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {employeeResults.length > 0 && <CommandSeparator />}
          </>
        )}

        {employeeResults.length > 0 && (
          <CommandGroup heading={t('employees')}>
            {employeeResults.map((result) => (
              <CommandItem
                key={result.id}
                value={result.title}
                onSelect={() => onSelect(result)}
                className="cursor-pointer hover:bg-accent"
              >
                <Users className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{result.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {result.subtitle}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </>
    );
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 w-[300px] text-sm text-muted-foreground rounded-md border shadow-sm hover:bg-accent hover:text-accent-foreground"
      >
        <Search className="h-4 w-4" />
        <span>{t('search_placeholder')}</span>
        <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder={t('search_command_placeholder')}
          value={inputValue}
          onValueChange={setInputValue}
        />
        <CommandList>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            renderResults()
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}