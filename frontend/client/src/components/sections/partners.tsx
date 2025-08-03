import { Container } from "@/components/ui/container";
import { useTranslations } from "@/lib/language-context";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Partners() {
  const t = useTranslations();

  return (
    <section id="partners" className="py-16 bg-gray-50 dark:bg-gray-900">
      <Container>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            {t('partners_title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            {t('partners_subtitle')}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Transak Partnership Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg">
            <div className="p-1 bg-gradient-to-r from-blue-500 to-purple-600 w-full h-1"></div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 relative mr-4 flex-shrink-0">
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 rounded-md">
                      <span className="text-white font-bold text-xl">T</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold">Transak</h3>
                </div>
                <span className="bg-green-100 text-green-800 text-xs px-2.5 py-0.5 rounded-full dark:bg-green-900 dark:text-green-300">
                  {t('active_partner')}
                </span>
              </div>
              
              <p className="mb-6 text-muted-foreground">
                {t('transak_partner_description')}
              </p>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{t('integrated_service')}</span>
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href="https://transak.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center"
                  >
                    {t('visit_partner')} <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center justify-center h-10 w-10 rounded-md bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium">{t('feature_available')}</p>
                    <p className="text-sm text-muted-foreground">{t('transak_feature_available_description')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Placeholder for future partners */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden opacity-50 transition-all hover:shadow-lg">
            <div className="p-1 bg-gray-300 dark:bg-gray-600 w-full h-1"></div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 relative mr-4 flex-shrink-0">
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-md">
                      <span className="text-gray-500 dark:text-gray-400 font-bold text-xl">?</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold">{t('future_partner')}</h3>
                </div>
                <span className="bg-gray-100 text-gray-800 text-xs px-2.5 py-0.5 rounded-full dark:bg-gray-700 dark:text-gray-300">
                  {t('coming_soon')}
                </span>
              </div>
              
              <p className="mb-6 text-muted-foreground">
                {t('future_partner_description')}
              </p>
              
              <div className="flex justify-between items-center opacity-50">
                <span className="text-sm font-medium">{t('future_service')}</span>
                <Button variant="outline" size="sm" disabled>
                  {t('stay_tuned')}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Placeholder for future partners */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden opacity-50 transition-all hover:shadow-lg">
            <div className="p-1 bg-gray-300 dark:bg-gray-600 w-full h-1"></div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 relative mr-4 flex-shrink-0">
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-md">
                      <span className="text-gray-500 dark:text-gray-400 font-bold text-xl">?</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold">{t('future_partner')}</h3>
                </div>
                <span className="bg-gray-100 text-gray-800 text-xs px-2.5 py-0.5 rounded-full dark:bg-gray-700 dark:text-gray-300">
                  {t('coming_soon')}
                </span>
              </div>
              
              <p className="mb-6 text-muted-foreground">
                {t('future_partner_description')}
              </p>
              
              <div className="flex justify-between items-center opacity-50">
                <span className="text-sm font-medium">{t('future_service')}</span>
                <Button variant="outline" size="sm" disabled>
                  {t('stay_tuned')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
