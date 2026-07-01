import { useEffect, useRef } from "react";
import {
  Switch,
  Route,
  Redirect,
  useLocation,
  Router as WouterRouter,
} from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  Show,
  useClerk,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";

// Pages
import Dashboard from "@/pages/dashboard";
import Companies from "@/pages/companies";
import CompanyDetail from "@/pages/company-detail";
import IzinDetail from "@/pages/izin-detail";
import Reports from "@/pages/reports";
import ReportDetail from "@/pages/report-detail";
import Team from "@/pages/team";
import OssPreview from "@/pages/oss-preview";
import Calendar from "@/pages/calendar";
import DataQuality from "@/pages/data-quality";
import TemplateIntake from "@/pages/template-intake";
import OssFieldGuide from "@/pages/oss-field-guide";
import GlossaryFaq from "@/pages/glossary-faq";
import NarrativeTemplates from "@/pages/narrative-templates";
import PrintChecklist from "@/pages/print-checklist";
import Blueprint from "@/pages/blueprint";
import IndexMap from "@/pages/index-map";
import SopData from "@/pages/sop-data";
import AgentPlaybook from "@/pages/agent-playbook";
import CaseStudies from "@/pages/case-studies";
import Regulation from "@/pages/regulation";
import Asisten from "@/pages/asisten";
import Mentor from "@/pages/mentor";
import KonsultanOnline from "@/pages/konsultan-online";
import Landing from "@/pages/landing";
import Settings from "@/pages/settings";
import Langganan from "@/pages/langganan";
import LanggananSukses from "@/pages/langganan-sukses";
import { HelpdeskWidget } from "@/components/helpdesk-widget";
import { OnboardingGate } from "@/lib/role";

const queryClient = new QueryClient();

// REQUIRED — copy verbatim. Resolves the key from window.location.hostname so the
// same build serves multiple Clerk custom domains.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — copy verbatim. Empty in dev, auto-set in prod.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Clerk passes full paths to routerPush/routerReplace, but wouter's
// setLocation prepends the base — strip it to avoid doubling.
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(221 83% 53%)",
    colorForeground: "hsl(222 47% 11%)",
    colorMutedForeground: "hsl(215 16% 47%)",
    colorDanger: "hsl(0 84% 60%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(0 0% 100%)",
    colorInputForeground: "hsl(222 47% 11%)",
    colorNeutral: "hsl(214 32% 91%)",
    fontFamily: '"Inter", sans-serif',
    borderRadius: "0.375rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-white border border-[hsl(214_32%_91%)] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-sm",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[hsl(222_47%_11%)] text-xl font-semibold",
    headerSubtitle: "text-[hsl(215_16%_47%)]",
    socialButtonsBlockButtonText: "text-[hsl(222_47%_11%)]",
    formFieldLabel: "text-[hsl(222_47%_11%)]",
    footerActionLink: "text-[hsl(221_83%_53%)] font-medium",
    footerActionText: "text-[hsl(215_16%_47%)]",
    dividerText: "text-[hsl(215_16%_47%)]",
    identityPreviewEditButton: "text-[hsl(221_83%_53%)]",
    formFieldSuccessText: "text-[hsl(142_71%_35%)]",
    alertText: "text-[hsl(222_47%_11%)]",
    logoBox: "h-10 flex items-center justify-center",
    logoImage: "h-9 w-auto",
    socialButtonsBlockButton:
      "border border-[hsl(214_32%_91%)] hover:bg-[hsl(210_40%_96%)]",
    formButtonPrimary:
      "bg-[hsl(221_83%_53%)] hover:opacity-90 text-white normal-case",
    formFieldInput:
      "bg-white border border-[hsl(214_32%_91%)] text-[hsl(222_47%_11%)]",
    footerAction: "text-[hsl(215_16%_47%)]",
    dividerLine: "bg-[hsl(214_32%_91%)]",
    otpCodeFieldInput: "border border-[hsl(214_32%_91%)]",
    main: "gap-4",
  },
};

const clerkLocalization = {
  signIn: {
    start: {
      title: "Masuk ke LKPM-Flow",
      subtitle: "Akses ruang kerja pelaporan LKPM Anda",
    },
  },
  signUp: {
    start: {
      title: "Buat akun LKPM-Flow",
      subtitle: "Mulai kelola pelaporan LKPM Anda",
    },
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

// Helps the webview stay up-to-date when the signed-in user changes by
// clearing the QueryClient cache so one consultant never sees another's data.
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const cacheClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        cacheClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, cacheClient]);

  return null;
}

function AuthenticatedApp() {
  return (
    <OnboardingGate>
      <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/companies" component={Companies} />
        <Route path="/companies/:id" component={CompanyDetail} />
        <Route path="/izin/:id" component={IzinDetail} />
        <Route path="/reports" component={Reports} />
        <Route path="/reports/:id/oss-preview" component={OssPreview} />
        <Route path="/reports/:id" component={ReportDetail} />
        <Route path="/team" component={Team} />
        <Route path="/konsultan-online" component={KonsultanOnline} />
        <Route path="/asisten" component={Asisten} />
        <Route path="/mentor" component={Mentor} />
        <Route path="/blueprint" component={Blueprint} />
        <Route path="/index-map" component={IndexMap} />
        <Route path="/sop-data" component={SopData} />
        <Route path="/agent-playbook" component={AgentPlaybook} />
        <Route path="/case-studies" component={CaseStudies} />
        <Route path="/regulation" component={Regulation} />
        <Route path="/template-intake" component={TemplateIntake} />
        <Route path="/oss-field-guide" component={OssFieldGuide} />
        <Route path="/glossary-faq" component={GlossaryFaq} />
        <Route path="/narrative-templates" component={NarrativeTemplates} />
        <Route path="/print-checklist" component={PrintChecklist} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/data-quality" component={DataQuality} />
        <Route path="/pengaturan" component={Settings} />
        <Route path="/langganan/sukses" component={LanggananSukses} />
        <Route path="/langganan" component={Langganan} />
        <Route component={NotFound} />
      </Switch>
      </Layout>
    </OnboardingGate>
  );
}

// Public area for signed-out users: the base path shows the landing page,
// every other route redirects to it (never drop users on a bare sign-in).
function PublicArea() {
  const [location] = useLocation();
  if (location === "/") return <Landing />;
  return <Redirect to="/" />;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route>
        <Show when="signed-in">
          <AuthenticatedApp />
        </Show>
        <Show when="signed-out">
          <PublicArea />
        </Show>
      </Route>
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={clerkLocalization}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <AppRoutes />
          <HelpdeskWidget />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
