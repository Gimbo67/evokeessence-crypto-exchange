import { useTranslations } from "@/lib/language-context";
import { Container } from "@/components/ui/container";
import { 
  UserPlus, 
  FileCheck, 
  Wallet, 
  ArrowRightCircle,
  ShieldCheck
} from "lucide-react";

export default function GettingStarted() {
  const t = useTranslations();

  const steps = [
    {
      icon: UserPlus,
      title: t('step_register'),
      description: t('step_register_desc')
    },
    {
      icon: FileCheck,
      title: t('step_verify'),
      description: t('step_verify_desc')
    },
    {
      icon: Wallet,
      title: t('step_deposit'),
      description: t('step_deposit_desc')
    },
    {
      icon: ShieldCheck,
      title: t('step_secure'),
      description: t('step_secure_desc')
    }
  ];

  return (
    <section className="py-16 bg-background">
      <Container className="mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">{t('getting_started')}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('getting_started_subtitle')}
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2" />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-background relative z-10 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <step.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>

                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 right-0 -translate-y-1/2 -translate-x-1/2">
                    <ArrowRightCircle className="w-6 h-6 text-primary" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}