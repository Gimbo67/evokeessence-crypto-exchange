import { useTranslations } from "@/lib/language-context";
import { Container } from "@/components/ui/container";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQ() {
  const t = useTranslations();

  const faqs = [
    {
      question: t("what_is_evokeessence"),
      answer: t("faq_what_answer")
    },
    {
      question: t("how_to_start"),
      answer: t("faq_start_answer")
    },
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
      question: t("cold_storage"),
      answer: t("faq_storage_answer")
    }
  ];

  return (
    <section id="faq" className="py-20 bg-muted/30">
      <Container className="mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">{t('faq_title')}</h2>
          <p className="text-xl text-muted-foreground">
            {t('faq_subtitle')}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent>
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Container>
    </section>
  );
}