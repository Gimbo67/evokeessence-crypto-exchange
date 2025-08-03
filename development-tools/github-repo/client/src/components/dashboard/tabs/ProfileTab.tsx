import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Loader2, AlertCircle, Clock, CalendarClock, X, CheckCircle, XCircle } from "lucide-react";
import { useUser, type User } from "@/hooks/use-user";
import { useTranslations } from "@/lib/language-context";
import { Badge } from "@/components/ui/badge";
import axios from "axios";

const profileSchema = z.object({
  fullName: z.string()
    .min(2, "Full name must be at least 2 characters long")
    .regex(/^[a-zA-Z\s'-]+$/, "Please use only letters, spaces, hyphens, and apostrophes"),
  email: z.string()
    .email("Please enter a valid email address")
    .min(5, "Email address is too short")
    .max(254, "Email address is too long"),
  phoneNumber: z.string()
    .min(6, "Phone number must be at least 6 characters long")
    .regex(/^[+]?[\d\s-]+$/, "Please enter a valid phone number")
    .transform(val => val.replace(/\s+/g, '')),
  address: z.string()
    .min(5, "Address must be at least 5 characters long")
    .max(200, "Address is too long"),
  countryOfResidence: z.string()
    .min(2, "Please select your country of residence"),
  gender: z.string()
    .min(1, "Please select your gender")
});

type ProfileFormData = z.infer<typeof profileSchema>;

// Define the interface for profile update requests
interface ProfileUpdateRequest {
  id: number;
  userId: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: number | null;
  adminComment?: string | null;
  fullName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  countryOfResidence?: string | null;
  gender?: string | null;
}

interface ProfileTabProps {
  user: User;
}

export default function ProfileTab({ user }: ProfileTabProps) {
  const { toast } = useToast();
  const { updateProfile } = useUser();
  const [progress, setProgress] = React.useState(0);
  const formRef = React.useRef<HTMLFormElement>(null);
  const t = useTranslations();
  
  // Fetch profile update requests for the current user
  const { data: profileUpdateRequests, isLoading: loadingRequests, refetch: refetchRequests } = useQuery({
    queryKey: ['/api/user/profile-updates'],
    queryFn: async () => {
      const response = await axios.get('/api/user/profile-updates');
      return response.data;
    },
    retry: 1
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: React.useMemo(() => ({
      fullName: user?.fullName || "",
      email: user?.email || "",
      phoneNumber: user?.phoneNumber || "",
      address: user?.address || "",
      countryOfResidence: user?.countryOfResidence || "",
      gender: user?.gender || "",
    }), [user]),
    mode: "onBlur"
  });

  React.useEffect(() => {
    if (user) {
      form.reset({
        fullName: user.fullName || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        address: user.address || "",
        countryOfResidence: user.countryOfResidence || "",
        gender: user.gender || "",
      });
    }
  }, [user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      setProgress(0);
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      try {
        const updatedProfile = await updateProfile(data);
        setProgress(100);
        return updatedProfile;
      } catch (error) {
        setProgress(0);
        throw error;
      } finally {
        clearInterval(progressInterval);
      }
    },
    onSuccess: (data) => {
      toast({
        title: t("success"),
        description: t("profile_update_success")
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: `${t("profile_update_error")}: ${error.message}`
      });
    }
  });

  // Add mutation for canceling profile update requests
  const cancelProfileUpdateMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await axios.delete(`/api/user/profile-updates/${requestId}`);
      return response.data;
    },
    onSuccess: () => {
      // Refresh the requests data
      refetchRequests();
      toast({
        title: t("success"),
        description: t("profile_update_cancelled")
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: `${t("profile_update_cancel_error")}: ${error.message}`
      });
    }
  });

  // Handle canceling a profile update request
  const handleCancelRequest = async (requestId: number) => {
    try {
      await cancelProfileUpdateMutation.mutateAsync(requestId);
    } catch (error) {
      console.error('Cancel profile update error:', error);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfileMutation.mutateAsync(data);
      // After successful or failed submission, refresh the requests
      refetchRequests();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  // Helper to check if there are pending profile update requests
  const hasPendingRequests = profileUpdateRequests?.requests?.some(
    (req: ProfileUpdateRequest) => req.status === 'pending'
  );

  return (
    <div className="space-y-6">
      {/* Display pending profile update requests if any */}
      {hasPendingRequests && (
        <Card className="border-orange-400 border-l-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Clock className="mr-2 h-5 w-5 text-orange-500" />
              {t("pending_profile_updates")}
            </CardTitle>
            <CardDescription>
              {t("profile_update_pending_description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            {profileUpdateRequests?.requests
              ?.filter((req: ProfileUpdateRequest) => req.status === 'pending')
              .map((request: ProfileUpdateRequest) => (
                <div 
                  key={request.id} 
                  className="border rounded-md p-4 space-y-3 bg-muted/10"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        {t("pending")}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleCancelRequest(request.id)}
                      disabled={cancelProfileUpdateMutation.isPending}
                    >
                      {cancelProfileUpdateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 mr-1" />
                      )}
                      {t("cancel")}
                    </Button>
                  </div>
                  
                  <div className="grid gap-2">
                    {/* Show changed fields */}
                    {request.fullName !== null && (
                      <div className="text-sm">
                        <span className="font-medium">{t("full_name")}: </span>
                        <span>{request.fullName}</span>
                      </div>
                    )}
                    {request.email !== null && (
                      <div className="text-sm">
                        <span className="font-medium">{t("email")}: </span>
                        <span>{request.email}</span>
                      </div>
                    )}
                    {request.phoneNumber !== null && (
                      <div className="text-sm">
                        <span className="font-medium">{t("phone_number")}: </span>
                        <span>{request.phoneNumber}</span>
                      </div>
                    )}
                    {request.address !== null && (
                      <div className="text-sm">
                        <span className="font-medium">{t("address")}: </span>
                        <span>{request.address}</span>
                      </div>
                    )}
                    {request.countryOfResidence !== null && (
                      <div className="text-sm">
                        <span className="font-medium">{t("country_of_residence")}: </span>
                        <span>{t(`country_${request.countryOfResidence}`)}</span>
                      </div>
                    )}
                    {request.gender !== null && (
                      <div className="text-sm">
                        <span className="font-medium">{t("gender")}: </span>
                        <span>{t(`gender_${request.gender}`)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Profile Information Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t("profile_information")}</CardTitle>
          {hasPendingRequests && (
            <CardDescription className="text-orange-500">
              {t("cannot_update_while_pending")}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              ref={formRef}
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              aria-label="Profile update form"
            >
            {updateProfileMutation.isError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {updateProfileMutation.error instanceof Error
                    ? `${t("error")}: ${updateProfileMutation.error.message}. ${t("try_again_contact_support")}`
                    : t("profile_update_error")}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("full_name")}</FormLabel>
                    <FormControl>
                      <Input {...field} aria-label="Full name input" />
                    </FormControl>
                    <FormDescription>
                      {t("enter_legal_full_name")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("email")}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} aria-label="Email input" />
                    </FormControl>
                    <FormDescription>
                      {t("email_important_notifications")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("phone_number")}</FormLabel>
                    <FormControl>
                      <Input {...field} aria-label="Phone number input" />
                    </FormControl>
                    <FormDescription>
                      {t("phone_format_info")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("address")}</FormLabel>
                    <FormControl>
                      <Input {...field} aria-label="Address input" />
                    </FormControl>
                    <FormDescription>
                      {t("enter_physical_address")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("gender")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("select_gender")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">{t("gender_male")}</SelectItem>
                        <SelectItem value="female">{t("gender_female")}</SelectItem>
                        <SelectItem value="other">{t("gender_other")}</SelectItem>
                        <SelectItem value="prefer_not_to_say">{t("gender_prefer_not_to_say")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t("used_for_kyc_purposes")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="countryOfResidence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("country_of_residence")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("select_country")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ch">{t("country_switzerland")}</SelectItem>
                        <SelectItem value="de">{t("country_germany")}</SelectItem>
                        <SelectItem value="at">{t("country_austria")}</SelectItem>
                        <SelectItem value="fr">{t("country_france")}</SelectItem>
                        <SelectItem value="it">{t("country_italy")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t("select_country")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {updateProfileMutation.isPending && progress > 0 && (
              <div className="space-y-2" role="status" aria-label="Update progress">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-center text-muted-foreground">
                  {progress === 100 ? t("profile_update_success") : `${t("updating")}... ${progress}%`}
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={updateProfileMutation.isPending || hasPendingRequests}
              className="w-full md:w-auto"
              aria-label={updateProfileMutation.isPending ? t("updating") : t("update_profile")}
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  {t("updating")}...
                </>
              ) : (
                t("update_profile")
              )}
            </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}