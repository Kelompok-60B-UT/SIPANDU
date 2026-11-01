import AuthShell from "@/components/auth/AuthShell";
import { RegisterFormSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <AuthShell
      headline={
        <>
          Jadi bagian dari
          <span className="lg:block"> perubahan lingkungan</span>
          <span className="lg:block"> kita.</span>
        </>
      }
    >
      <RegisterFormSkeleton />
    </AuthShell>
  );
}
