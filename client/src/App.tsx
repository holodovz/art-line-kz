/** Signal Workshop routing: dedicated RU, KZ and EN URLs preserve language-specific SEO and share one UI system. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Switch><Route path="/en" component={() => <Home lang="en" />} /><Route path="/en/" component={() => <Home lang="en" />} /><Route path="/kz" component={() => <Home lang="kz" />} /><Route path="/kz/" component={() => <Home lang="kz" />} /><Route path="/" component={() => <Home lang="ru" />} /><Route component={() => <Home lang="ru" />} /></Switch><Toaster /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
