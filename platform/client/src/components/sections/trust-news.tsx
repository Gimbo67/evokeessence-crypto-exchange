import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { 
  Shield, 
  Lock, 
  Building2, 
  Users
} from "lucide-react";
import { useTranslations } from "@/lib/language-context";

export default function TrustNews() {
  const t = useTranslations(); // Initialize translation function

  const trustFactors = [
    {
      icon: Shield,
      titleKey: 'regulated_institution_title',
      descriptionKey: 'regulated_institution_desc'
    },
    {
      icon: Lock,
      titleKey: 'advanced_security_title',
      descriptionKey: 'advanced_security_desc'
    },
    {
      icon: Building2,
      titleKey: 'compliance_framework_title',
      descriptionKey: 'compliance_framework_desc'
    },
    {
      icon: Users,
      titleKey: 'customer_support_title',
      descriptionKey: 'customer_support_desc'
    }
  ];

  return (
    <section className="py-16">
      <Container className="mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">{t('why_trust_title')}</h2>
        </div>
        
        <div className="grid sm:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {trustFactors.map((factor, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0">
                  <factor.icon className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{t(factor.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t(factor.descriptionKey)}
                  </p>
                </div>
              </div>
        ))}
        </div>
      </Container>
    </section>
  );
}