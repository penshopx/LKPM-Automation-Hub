import { createContext, useContext, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useGetCurrentUser } from "@workspace/api-client-react";
import Onboarding from "@/pages/onboarding";

export type AccountRole = "konsultan" | "perusahaan";

const RoleContext = createContext<AccountRole>("konsultan");

export function useRole(): AccountRole {
  return useContext(RoleContext);
}

export function OnboardingGate({ children }: { children: ReactNode }) {
  const { data, isLoading, isError, refetch } = useGetCurrentUser();

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const role = (data?.role ?? null) as AccountRole | null;

  // Pengguna baru yang belum memilih peran diarahkan ke onboarding.
  // Bila profil gagal dimuat, jangan kunci pengguna — anggap konsultan.
  if (!isError && role === null) {
    return <Onboarding onDone={() => refetch()} />;
  }

  return (
    <RoleContext.Provider value={role ?? "konsultan"}>
      {children}
    </RoleContext.Provider>
  );
}
