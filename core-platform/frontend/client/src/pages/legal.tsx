import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useTranslations } from "@/lib/language-context";
import { Container } from "@/components/ui/container";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function LegalPage() {
  const t = useTranslations();

  // Group legal documents by category for better organization
  const legalDocs = [
    // Terms and Policies
    {
      title: t('terms_of_service'),
      content: t('terms_of_service_content')
    },
    {
      title: t('privacy_detailed'),
      content: t('privacy_detailed_content')
    },
    {
      title: t('cookies_detailed'),
      content: t('cookies_detailed_content')
    },

    // Risk and Refund Policies
    {
      title: t('risk_disclosure'),
      content: t('risk_disclosure_content')
    },
    {
      title: t('refund_policy'),
      content: t('refund_policy_content')
    },

    // Compliance
    {
      title: t('compliance_policy'),
      content: t('compliance_policy_content')
    },
    {
      title: t('anti_money_laundering'),
      content: t('legal_aml_content')
    },
    {
      title: t('kyc_aml_policy'),
      content: t('kyc_aml_policy_content')
    },

    // Security and Asset Protection
    {
      title: t('security_measures'),
      content: t('security_measures_content')
    },
    {
      title: t('assurance_testing_policy'),
      content: t('assurance_testing_policy_content')
    },
    {
      title: t('platform_security'),
      content: t('platform_security_content')
    },
    {
      title: t('asset_custody'),
      content: t('asset_custody_content')
    },

    // Trading and Rules
    {
      title: t('trading_rules'),
      content: t('trading_rules_content')
    },

    // Legal Framework
    {
      title: t('jurisdiction'),
      content: t('jurisdiction_content')
    },
    {
      title: t('dispute_resolution'),
      content: t('dispute_resolution_content')
    },

    // Company Information
    {
      title: t('company_information'),
      content: t('legal_imprint_content')
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background w-full">
      <Header />
      <main className="flex-1 py-20 w-full">
        <Container className="w-full">
          <div className="text-center mb-12 w-full">
            <h1 className="text-4xl font-bold mb-4">{t('legal_information')}</h1>
            <p className="text-xl text-muted-foreground">
              {t('important_documents')}
            </p>
          </div>

          <div className="max-w-4xl mx-auto w-full">

            <Accordion type="single" collapsible className="w-full space-y-4">
              {legalDocs.map((doc, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`} 
                  className="border rounded-lg px-4 bg-card"
                >
                  <AccordionTrigger className="text-left py-4 hover:no-underline hover:bg-muted/50 rounded-lg text-lg font-medium">
                    {doc.title || "Unnamed Policy"}
                  </AccordionTrigger>
                  <AccordionContent className="py-4 text-muted-foreground text-base whitespace-pre-line leading-relaxed">
                    {doc.content || "Missing content"}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}