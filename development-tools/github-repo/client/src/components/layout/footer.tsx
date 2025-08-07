import { useTranslations } from "@/lib/language-context";
import { COMPANY_ADDRESS } from "@/lib/config";
import { Link } from "wouter";
import { Container } from "@/components/ui/container";

export default function Footer() {
  const t = useTranslations();

  return (
    <footer className="border-t py-8 md:py-12 bg-muted/50 w-full">
      <Container className="w-full">
        <div className="grid gap-8 md:grid-cols-2 w-full">
          <div>
            <h3 className="text-lg font-semibold mb-4">EvokeEssence s.r.o</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {COMPANY_ADDRESS}
            </p>
            <div className="text-sm flex flex-wrap gap-5 text-muted-foreground">
              <Link href="/legal">
                <span className="hover:text-primary transition-colors">{t('nav_legal') || 'Legal'}</span>
              </Link>
              <Link href="/security-policy">
                <span className="hover:text-primary transition-colors">Security Policy</span>
              </Link>
              <Link href="/responsible-disclosure">
                <span className="hover:text-primary transition-colors">Responsible Disclosure</span>
              </Link>
            </div>
          </div>
          <div className="text-sm text-muted-foreground text-right">
            © {new Date().getFullYear()} EvokeEssence s.r.o<br />
            Licensed by FAU
          </div>
        </div>
      </Container>
    </footer>
  );
}