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

export default function FAQPage() {
  const t = useTranslations();

  // Group questions by category for better organization
  const faqs = [
    // Getting Started
    {
      question: t("what_is_evokeessence"),
      answer: t("faq_what_answer")
    },
    {
      question: t("how_to_start"),
      answer: t("faq_start_answer")
    },

    // Account & Verification - Prominently featuring the requested questions
    {
      question: t("kyc_requirements"),
      answer: t("faq_kyc_answer")
    },
    {
      question: t("what_are_fees"),
      answer: t("faq_fees_answer")
    },
    {
      question: t("account_security"),
      answer: t("faq_security_answer")
    },
    {
      question: t("verification_levels"),
      answer: t("faq_verification_levels_answer")
    },
    {
      question: t("verification_time"),
      answer: t("faq_verification_time_answer")
    },

    // Trading & Fees
    {
      question: t("trading_fee_tiers"),
      answer: t("faq_fee_tiers_answer")
    },
    {
      question: t("trading_limits"),
      answer: t("faq_trading_limits_answer")
    },
    {
      question: t("margin_trading"),
      answer: t("faq_margin_answer")
    },

    // Deposits & Withdrawals
    {
      question: t("withdrawal_process"),
      answer: t("faq_withdrawal_answer")
    },
    {
      question: t("supported_currencies"),
      answer: t("faq_currencies_answer")
    },
    {
      question: t("token_listing"),
      answer: t("faq_token_listing_answer")
    },

    // Security & Support
    {
      question: t("cold_storage"),
      answer: t("faq_storage_answer")
    },
    {
      question: t("two_factor_auth"),
      answer: t("faq_2fa_answer")
    },
    {
      question: t("mobile_trading"),
      answer: t("faq_mobile_trading_answer")
    },
    {
      question: t("api_access"),
      answer: t("faq_api_access_answer")
    },
    {
      question: t("customer_support"),
      answer: t("faq_support_answer")
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background w-full">
      <Header />
      <main className="flex-1 py-20 w-full">
        <Container className="w-full">
          <div className="text-center mb-12 w-full">
            <h1 className="text-4xl font-bold mb-4">{t('faq_title')}</h1>
            <p className="text-xl text-muted-foreground">
              {t('faq_subtitle')}
            </p>
          </div>

          <div className="max-w-4xl mx-auto w-full">
            <Accordion type="single" collapsible className="w-full space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`} 
                  className="border rounded-lg px-4 bg-card"
                >
                  <AccordionTrigger className="text-left py-4 hover:no-underline hover:bg-muted/50 rounded-lg text-lg">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="py-4 text-muted-foreground text-base whitespace-pre-line">
                    {faq.answer}
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