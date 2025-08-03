import { useTranslations } from "@/lib/language-context";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Building, Award } from "lucide-react";
import { Container } from "@/components/ui/container";

export default function About() {
  const t = useTranslations();

  return (
    <section id="about" className="py-20 bg-muted/30 w-full">
      <Container className="mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">
          {t('about_title')}
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardContent className="pt-6">
              <Shield className="h-12 w-12 mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">{t('licensed_regulated_title')}</h3>
              <p className="text-muted-foreground">
                {t('licensed_regulated_desc')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Building className="h-12 w-12 mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">{t('based_in_prague_title')}</h3>
              <p className="text-muted-foreground">
                {t('based_in_prague_desc')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Award className="h-12 w-12 mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">{t('enterprise_security_title')}</h3>
              <p className="text-muted-foreground">
                {t('enterprise_security_desc')}
              </p>
            </CardContent>
          </Card>
        </div>
      </Container>
    </section>
  );
}