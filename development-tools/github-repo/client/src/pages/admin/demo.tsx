import { useState } from "react";
import { AnimatedButton } from "@/components/ui/animated-button";
import { HoverCard } from "@/components/ui/animated-card";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useTranslations } from "@/lib/language-context";

export default function DemoPage() {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    setIsSuccess(false);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsLoading(false);
    setIsSuccess(true);

    // Reset success state after 2 seconds
    setTimeout(() => {
      setIsSuccess(false);
    }, 2000);
  };

  return (
    <div className="container py-6">
      <motion.h1 
        className="text-3xl font-bold mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {t('micro_interactions_demo')}
      </motion.h1>

      <div className="grid gap-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">{t('button_interactions')}</h2>
          <div className="flex gap-4">
            <AnimatedButton
              isLoading={isLoading}
              isSuccess={isSuccess}
              loadingText={t('processing')}
              successText={t('success')}
              onClick={handleClick}
            >
              {t('click_me')}
            </AnimatedButton>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">{t('card_interactions')}</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map((item) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: item * 0.1 }}
              >
                <HoverCard>
                  <CardHeader>
                    <CardTitle>
                      {t('interactive_card')} {item}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {t('hover_to_interact')}
                    </p>
                  </CardContent>
                </HoverCard>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}