import React from 'react';
import { useLanguage } from '@/lib/language-context';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'cs', name: 'Čeština' }
];

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-2 px-2 rounded-full hover:bg-primary/10"
        >
          <Globe className="h-4 w-4" />
          <span className="uppercase text-xs font-medium">
            {language}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {languages.map((lang) => (
          <DropdownMenuItem 
            key={lang.code}
            className={`flex justify-between items-center ${language === lang.code ? 'bg-primary/10 font-medium' : ''}`}
            onClick={() => setLanguage(lang.code as 'en' | 'de' | 'cs')}
          >
            <span>{lang.name}</span>
            {language === lang.code && (
              <div className="w-2 h-2 rounded-full bg-primary/80"></div>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}