import { useTranslations } from "@/lib/language-context";
import { motion } from "framer-motion";
import { SiAppstore } from "react-icons/si";
import { FaMobileAlt } from "react-icons/fa";
import { Container } from "@/components/ui/container";

export default function MobileApp() {
  const t = useTranslations();

  return (
    <section className="py-16 bg-slate-50 dark:bg-slate-900 w-full">
      <Container className="w-full">
        <motion.div 
          className="max-w-5xl mx-auto w-full"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="text-center mb-12 w-full">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              {t('mobile_app_title') || "Mobile App"}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('mobile_app_description') || "Trade on the go with our secure iOS mobile app. Access your funds, follow markets, and execute trades from anywhere."}
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full">
            <div className="w-full md:w-1/2">
              <div className="bg-slate-900 dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                <div className="flex items-center">
                  <FaMobileAlt className="text-primary text-4xl mr-4" />
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{t('mobile_app_features') || "Key Features"}</h3>
                    <ul className="text-gray-300 space-y-2">
                      <li className="flex items-center">
                        <span className="mr-2">✓</span> {t('mobile_app_feature_1') || "Real-time market updates"}
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2">✓</span> {t('mobile_app_feature_2') || "Secure trading anytime, anywhere"}
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2">✓</span> {t('mobile_app_feature_3') || "Push notifications for price alerts"}
                      </li>
                      <li className="flex items-center">
                        <span className="mr-2">✓</span> {t('mobile_app_feature_4') || "Biometric authentication"}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full md:w-1/2 flex flex-col items-center">
              <div className="mb-6 text-center w-full">
                <h3 className="text-xl font-bold mb-3">{t('mobile_app_download') || "Coming in 2025"}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('mobile_app_available') || "Available by end of 2025"}
                </p>
              </div>
              
              <div 
                className="flex items-center bg-black text-white px-6 py-3 rounded-lg opacity-75 cursor-default"
              >
                <SiAppstore className="text-2xl mr-3" />
                <div>
                  <div className="text-xs">Coming to the</div>
                  <div className="text-xl font-semibold">App Store</div>
                </div>
              </div>
              
              <p className="mt-4 text-sm text-muted-foreground">
                {t('mobile_app_coming_soon') || "Android version planned for 2026"}
              </p>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}