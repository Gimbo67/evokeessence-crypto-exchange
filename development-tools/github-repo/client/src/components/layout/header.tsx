import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, Sun, Moon } from "lucide-react";
import { useTranslations } from "@/lib/language-context";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/language-context";
import { LanguageSelector } from "@/components/language-selector";
import { Container } from "@/components/ui/container";

export default function Header() {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );
  const { language, setLanguage } = useLanguage();
  const t = useTranslations();
  const [location] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/auth';
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const cycleLanguage = () => {
    switch (language) {
      case 'en':
        setLanguage('cs');
        break;
      case 'cs':
        setLanguage('de');
        break;
      case 'de':
      default:
        setLanguage('en');
        break;
    }
  };

  return (
    <header className="fixed w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 border-b">
      <Container className="mx-auto flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-bold text-2xl bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            EvokeEssence
          </span>
        </Link>

        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
          <Link 
            href="/team" 
            className={`transition-colors hover:text-primary ${location === '/team' ? 'text-primary' : ''}`}
          >
            {t('nav_team')}
          </Link>
          <Link 
            href="/faq"
            className={`transition-colors hover:text-primary ${location === '/faq' ? 'text-primary' : ''}`}
          >
            {t('nav_faq')}
          </Link>
          <Link 
            href="/contact"
            className={`transition-colors hover:text-primary ${location === '/contact' ? 'text-primary' : ''}`}
          >
            {t('nav_contact')}
          </Link>
          <Link 
            href="/legal"
            className={`transition-colors hover:text-primary ${location === '/legal' ? 'text-primary' : ''}`}
          >
            {t('nav_legal')}
          </Link>
        </nav>

        <div className="flex items-center space-x-4">
          <LanguageSelector />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="relative"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {isAuthenticated ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">{t('nav_dashboard')}</Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                {t('nav_logout')}
              </Button>
            </>
          ) : (
            <Link href="/auth">
              <Button size="sm">Login</Button>
            </Link>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <div className="flex flex-col space-y-6 mt-6">
                <Link href="/team" className="text-lg font-medium">{t('nav_team')}</Link>
                <Link href="/faq" className="text-lg font-medium">{t('nav_faq')}</Link>
                <Link href="/contact" className="text-lg font-medium">{t('nav_contact')}</Link>
                <Link href="/legal" className="text-lg font-medium">{t('nav_legal')}</Link>
                {isAuthenticated ? (
                  <>
                    <Link href="/dashboard" className="text-lg font-medium">{t('nav_dashboard')}</Link>
                    <Button variant="ghost" onClick={handleLogout}>{t('nav_logout')}</Button>
                  </>
                ) : (
                  <Link href="/auth" className="text-lg font-medium">Login</Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  );
}