import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { TrpcProvider } from "@/lib/trpcProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import CryptoLayout from "@/components/CryptoLayout";
import Dashboard from "@/pages/Dashboard";
import AssetsPage from "@/pages/Assets";
import SendPage from "@/pages/Send";
import ReceivePage from "@/pages/Receive";
import HistoryPage from "@/pages/History";
import DiagnosticsPage from "@/pages/Diagnostics";
import ProfilePage from "@/pages/Profile";
import { AppLockProvider } from "@/contexts/AppLockContext";
import { WalletProvider } from "@/contexts/WalletContext";

function Router() {
  return (
    <CryptoLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/assets" component={AssetsPage} />
        <Route path="/send" component={SendPage} />
        <Route path="/receive" component={ReceivePage} />
        <Route path="/history" component={HistoryPage} />
        <Route path="/diagnostics" component={DiagnosticsPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route> <Dashboard /> </Route>
      </Switch>
    </CryptoLayout>
  );
}

export default function App() {
  return (
    <TrpcProvider>
      <ThemeProvider defaultTheme="dark" switchable={false}>
        <TooltipProvider>
          <WalletProvider>
            <AppLockProvider>
              <Router />
              <Toaster richColors position="top-center" />
            </AppLockProvider>
          </WalletProvider>
        </TooltipProvider>
      </ThemeProvider>
    </TrpcProvider>
  );
}
