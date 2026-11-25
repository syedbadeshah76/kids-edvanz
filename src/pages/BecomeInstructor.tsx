import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GraduationCap, Upload, X, FileText, Video, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MainLayout } from "@/components/layout/MainLayout";
import { useToast } from "@/hooks/use-toast";
import { instructorService } from "@/services/instructor.service";
import { countries, getCitiesByCountry } from "@/data/countriesCities";

const schema = z.object({
  firstName: z.string().trim().min(2, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  confirmPassword: z.string(),
  country: z.string().min(1, "Country is required"),
  city: z.string().trim().min(1, "City is required").max(80),
  phone: z.string().trim().min(7, "Phone is required").max(20),
  specialization: z.string().trim().min(2, "Specialization is required").max(120),
  qualification: z.string().trim().min(2, "Qualification is required").max(160),
  experience: z.string().trim().min(10, "Describe your experience").max(1000),
  bio: z.string().trim().min(10).max(500),
  linkedin: z.string().url("Invalid URL").optional().or(z.literal("")),
  portfolio: z.string().url("Invalid URL").optional().or(z.literal("")),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match", path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

const BecomeInstructor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [resume, setResume] = useState<File | null>(null);
  const [introVideo, setIntroVideo] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { country: "India" },
  });
  const country = watch("country");
  const city = watch("city");

  const availableCities = useMemo(() => {
    return country ? getCitiesByCountry(country) : [];
  }, [country]);

  const onResume = (f: File | null) => {
    if (!f) return;
    if (f.type !== "application/pdf") { toast({ title: "PDF only", variant: "destructive" }); return; }
    if (f.size > 10 * 1024 * 1024) { toast({ title: "Max 10MB", variant: "destructive" }); return; }
    setResume(f);
  };

  const onVideo = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) { toast({ title: "Video files only", variant: "destructive" }); return; }
    if (f.size > 100 * 1024 * 1024) { toast({ title: "Max 100MB", variant: "destructive" }); return; }
    setIntroVideo(f);
  };

  const onSubmit = async (data: FormData) => {
    if (!resume) { toast({ title: "Resume required", description: "Upload your resume in PDF format", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("firstName", data.firstName);
      fd.append("lastName", data.lastName);
      fd.append("email", data.email);
      fd.append("password", data.password);
      fd.append("phone", data.phone);
      fd.append("country", data.country);
      fd.append("city", data.city);
      fd.append("location", `${data.city}, ${data.country}`);
      fd.append("specialization", data.specialization);
      fd.append("highestQualification", data.qualification);
      fd.append("experienceYears", "3");
      fd.append("bio", data.bio);
      if (data.linkedin) fd.append("linkedin", data.linkedin);
      if (data.portfolio) fd.append("portfolio", data.portfolio);
      fd.append("resume", resume);
      if (introVideo) fd.append("introVideo", introVideo);

      await instructorService.apply(fd);
      toast({ title: "Application Submitted!", description: "We'll review your application and get back to you within 2-3 business days." });
      navigate("/instructor-pending");
    } catch (e: any) {
      toast({ title: "Submission failed", description: e?.response?.data?.message || e?.message || "Please check your details and try again", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="container max-w-3xl py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-4">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Teach on EDVANZ</h1>
          <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
            Share your knowledge with millions of learners worldwide. Apply to become an instructor today.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Personal */}
          <div className="bg-card rounded-2xl border p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold">Personal Information</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input placeholder="John" {...register("firstName")} />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Last Name *</Label>
                <Input placeholder="Doe" {...register("lastName")} />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" placeholder="john@example.com" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input placeholder="+91 9876543210" {...register("phone")} />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Password *</Label>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <Input type={showPassword ? "text" : "password"} placeholder="Min. 8 characters" {...register("password")} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Confirm Password *</Label>
                <Input type={showPassword ? "text" : "password"} placeholder="Re-enter password" {...register("confirmPassword")} />
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Country *</Label>
                <Select
                  value={country}
                  onValueChange={(v) => {
                    setValue("country", v, { shouldValidate: true });
                    setValue("city", "", { shouldValidate: true });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.code} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.country && <p className="text-xs text-destructive">{errors.country.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>City *</Label>
                <Select
                  value={city || ""}
                  disabled={!country}
                  onValueChange={(v) => setValue("city", v, { shouldValidate: true })}
                >
                  <SelectTrigger className={!country ? "opacity-50 cursor-not-allowed" : ""}>
                    <SelectValue placeholder={country ? "Select city" : "Select country first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCities.map((cityName) => (
                      <SelectItem key={cityName} value={cityName}>
                        {cityName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
              </div>
            </div>
          </div>

          {/* Professional */}
          <div className="bg-card rounded-2xl border p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold">Professional Details</h2>
            <div className="space-y-1.5">
              <Label>Specialization *</Label>
              <Input placeholder="e.g. Web Development, React, Node.js" {...register("specialization")} />
              {errors.specialization && <p className="text-xs text-destructive">{errors.specialization.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Highest Qualification *</Label>
              <Input placeholder="e.g. Master of Computer Applications" {...register("qualification")} />
              {errors.qualification && <p className="text-xs text-destructive">{errors.qualification.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Teaching / Industry Experience *</Label>
              <Textarea placeholder="Tell us about your industry experience and any teaching or mentoring you've done..." rows={3} {...register("experience")} />
              {errors.experience && <p className="text-xs text-destructive">{errors.experience.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Short Bio *</Label>
              <Textarea placeholder="A brief bio that will be displayed on your instructor profile..." rows={3} {...register("bio")} />
              {errors.bio && <p className="text-xs text-destructive">{errors.bio.message}</p>}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>LinkedIn Profile</Label>
                <Input placeholder="https://linkedin.com/in/..." {...register("linkedin")} />
                {errors.linkedin && <p className="text-xs text-destructive">{errors.linkedin.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Portfolio / Website</Label>
                <Input placeholder="https://yourportfolio.com" {...register("portfolio")} />
                {errors.portfolio && <p className="text-xs text-destructive">{errors.portfolio.message}</p>}
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-card rounded-2xl border p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold">Upload Documents</h2>
            <div>
              <Label>Resume / CV * (PDF, max 10MB)</Label>
              <div className="mt-1.5">
                {resume ? (
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
                    <div className="flex items-center gap-2 text-sm font-medium truncate">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate">{resume.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">({(resume.size / 1024 / 1024).toFixed(1)}MB)</span>
                    </div>
                    <button type="button" onClick={() => setResume(null)} className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-sm font-medium">Click to upload your resume</span>
                    <span className="text-xs text-muted-foreground mt-0.5">PDF only, max 10MB</span>
                    <input type="file" accept=".pdf" className="hidden" onChange={(e) => onResume(e.target.files?.[0] || null)} />
                  </label>
                )}
              </div>
            </div>
            <div>
              <Label>Intro / Demo Video (Optional — MP4, WebM, max 100MB)</Label>
              <div className="mt-1.5">
                {introVideo ? (
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
                    <div className="flex items-center gap-2 text-sm font-medium truncate">
                      <Video className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate">{introVideo.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">({(introVideo.size / 1024 / 1024).toFixed(1)}MB)</span>
                    </div>
                    <button type="button" onClick={() => setIntroVideo(null)} className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                    <Video className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-sm font-medium">Upload a 1-2 min intro video</span>
                    <span className="text-xs text-muted-foreground mt-0.5">MP4, WebM up to 100MB</span>
                    <input type="file" accept="video/*" className="hidden" onChange={(e) => onVideo(e.target.files?.[0] || null)} />
                  </label>
                )}
              </div>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full text-base font-semibold h-12 rounded-xl" disabled={submitting}>
            {submitting ? "Submitting Application..." : "Submit Application"}
          </Button>
        </form>
      </div>
    </MainLayout>
  );
};

export default BecomeInstructor;
