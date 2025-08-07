import { useTranslations } from "@/lib/language-context";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

// Placeholder navigation function.  Replace with your routing library's navigation method.
const handleNavigate = (path: string) => {
  // Implement your navigation logic here using react-router-dom or similar.
  // Example using react-router-dom: navigate(path);
  console.log(`Navigating to: ${path}`);
};

export default function Hero() {
  const t = useTranslations();
  const [_, setLocation] = useLocation();

  return (
    <section className="relative overflow-hidden w-full">
      <div className="gradient-bg absolute inset-0" />
      <motion.div 
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-blue-600 opacity-30 dark:opacity-40 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
        />
      </motion.div>

      <Container className="relative pt-32 pb-24 mx-auto">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
              <span className="bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-primary dark:to-purple-400">
                {t('secure_crypto_exchange')}
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-12 dark:text-gray-300">
              {t('licensed_regulated')}
            </p>
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-white px-8 py-3 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all"
              onClick={() => setLocation("/auth")}
            >
              {t('nav_login')}
            </Button>
          </motion.div>
        </div>
      </Container>

      <motion.div
        className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <div
          className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-primary to-blue-600 dark:from-blue-400 dark:to-purple-400 opacity-30 dark:opacity-40 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
        />
      </motion.div>
    </section>
  );
}