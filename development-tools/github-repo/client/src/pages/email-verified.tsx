import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useLanguage, useTranslations } from '@/lib/language-context';
import { useToast } from '@/hooks/use-toast';

export default function EmailVerifiedPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = (key: string) => {
    // Simple fallback translation function that returns the key if no translation exists
    return key;
  };
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Verifying your email address...');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get token and userId from URL parameters
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const userId = params.get('userId');

        if (!token || !userId) {
          setStatus('error');
          setMessage('Invalid verification link. Missing required parameters.');
          return;
        }

        // Make API call to verify email
        const response = await axios.get(`/api/verify-email?token=${token}&userId=${userId}`);
        
        if (response.data.success) {
          setStatus('success');
          setMessage(response.data.message || 'Your email has been verified successfully!');
        } else {
          setStatus('error');
          setMessage(response.data.message || 'Failed to verify email.');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'An error occurred during verification. Please try again later.');
        toast({
          title: 'Verification Error',
          description: error.response?.data?.message || 'An error occurred during verification.',
          variant: 'destructive'
        });
      }
    };

    verifyEmail();
  }, [toast]);

  const goToLogin = () => {
    navigate('/auth');
  };

  const goToDashboard = () => {
    navigate('/dashboard');
  };

  const renderIcon = () => {
    if (status === 'loading') {
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="text-blue-500"
        >
          <Clock size={50} />
        </motion.div>
      );
    } else if (status === 'success') {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 10 }}
          className="text-green-500"
        >
          <CheckCircle size={50} />
        </motion.div>
      );
    } else {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 10 }}
          className="text-red-500"
        >
          <XCircle size={50} />
        </motion.div>
      );
    }
  };

  return (
    <div className="container max-w-screen-md mx-auto py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {renderIcon()}
            </div>
            <CardTitle className="text-2xl">{t('Email Verification')}</CardTitle>
            <CardDescription>
              {status === 'loading' ? t('Processing your verification request...') : null}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant={status === 'success' ? 'default' : status === 'error' ? 'destructive' : 'default'}>
              <AlertTitle>
                {status === 'success' ? t('Verification Successful') : 
                 status === 'error' ? t('Verification Failed') : 
                 t('Verifying')}
              </AlertTitle>
              <AlertDescription>
                {message}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-center gap-4">
            {status === 'success' ? (
              <Button onClick={goToDashboard} className="w-full md:w-auto">
                {t('Go to Dashboard')}
              </Button>
            ) : (
              <Button onClick={goToLogin} className="w-full md:w-auto">
                {t('Go to Login')}
              </Button>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}