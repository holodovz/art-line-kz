/** Single-page school portal. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Switch><Route path="/" component={Home} /><Route component={Home} /></Switch><Toaster /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
