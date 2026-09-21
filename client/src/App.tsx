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
import { BenchmarkProvider } from "@/lib/benchmarkContext";
import Benchmarks from "@/pages/Benchmarks";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/fund/:id" component={FundDetail} />
      <Route path="/compare" component={Compare} />
      <Route path="/benchmarks" component={Benchmarks} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AsOfProvider>
          <BenchmarkProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <AppRouter />
          </Router>
          </BenchmarkProvider>
        </AsOfProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
