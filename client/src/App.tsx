import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import FundDetail from "@/pages/FundDetail";
import Compare from "@/pages/Compare";
import { AsOfProvider } from "@/lib/asOfContext";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/fund/:id" component={FundDetail} />
      <Route path="/compare" component={Compare} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AsOfProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <AppRouter />
          </Router>
        </AsOfProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
