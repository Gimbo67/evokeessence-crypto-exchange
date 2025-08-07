import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/language-selector";

export function Header() {
  const { user, logout } = useAuth();
  const t = useTranslations();
  const [_, navigate] = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  return (
    <header className="border-b py-4">
      <div className="container flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          {t('app_name') || 'EvokeEssence Exchange'}
        </Link>
        <nav className="flex items-center gap-4">
          <LanguageSelector />
          
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">
                {user.username}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
              >
                {t('logout')}
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  {t('login')}
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">
                  {t('register')}
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}