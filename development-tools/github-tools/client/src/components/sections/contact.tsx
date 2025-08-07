import { useTranslations } from "@/lib/language-context";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Mail, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Form validation schema
const formSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(5, "Subject is too short").default("Contact from website"),
  message: z.string().min(10, "Message is too short"),
});

export default function Contact() {
  const t = useTranslations();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "Contact from website",
      message: ""
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    setSubmitResult(null);
    
    try {
      // Use the direct endpoint that bypasses Vite middleware
      const response = await fetch('/api/contact-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      // Log the raw response for debugging
      console.log('Home contact form response:', response);
      
      // Try to parse the response as JSON
      let data;
      try {
        data = await response.json();
        console.log('Home contact form response data:', data);
      } catch (parseError) {
        console.error('Error parsing response as JSON:', parseError);
        throw new Error('Failed to parse server response');
      }
      
      if (response.ok) {
        setSubmitResult({
          success: true,
          message: data.message || t('contact_success')
        });
        // Reset form on success
        form.reset({
          name: "",
          email: "",
          subject: "Contact from website",
          message: ""
        });
      } else {
        setSubmitResult({
          success: false,
          message: data.message || t('contact_error')
        });
      }
    } catch (error) {
      console.error('Error submitting contact form:', error);
      setSubmitResult({
        success: false,
        message: typeof error === 'object' && error !== null && 'message' in error
          ? (error as Error).message
          : t('contact_error')
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="contact" className="py-20 bg-muted/30">
      <div className="container">
        <h2 className="text-3xl font-bold text-center mb-4">
          {t('contact_us')}
        </h2>
        <p className="text-center text-muted-foreground mb-12">
          {t('contact_subtitle')}
        </p>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-medium mb-2">{t('office_address')}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {t('company_address')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-medium mb-2">{t('email')}</h3>
                    <p className="text-sm text-muted-foreground">support@evo-exchange.com</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('name')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('name_placeholder')} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} placeholder={t('email_placeholder')} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('message')}</FormLabel>
                        <FormControl>
                          <Textarea className="min-h-[100px]" {...field} placeholder={t('message_placeholder')} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {submitResult && (
                    <Alert variant={submitResult.success ? "default" : "destructive"} className="my-4">
                      <div className="flex items-center gap-2">
                        {submitResult.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        <AlertDescription>{submitResult.message}</AlertDescription>
                      </div>
                    </Alert>
                  )}
                  
                  <div className="text-xs text-muted-foreground mt-2 mb-4">
                    By submitting this form, you agree to the processing of your personal data 
                    in accordance with our Privacy Policy. All communication will be in English.
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{t('sending')}</span>
                      </div>
                    ) : (
                      t('send_message')
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}