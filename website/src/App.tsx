import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ProblemSection } from './components/ProblemSection';
import { HowItWorks } from './components/HowItWorks';
import { ComparisonTable } from './components/ComparisonTable';
import { FeatureGrid } from './components/FeatureGrid';
import { RealWorkflow } from './components/RealWorkflow';
import { PrivacySection } from './components/PrivacySection';
import { FAQ } from './components/FAQ';
import { FinalCTA } from './components/FinalCTA';
import { Footer } from './components/Footer';

export function App() {
  return (
    <div className="min-h-screen bg-[#08090F] text-[#F4F5F7] antialiased selection:bg-[#FF4D43] selection:text-white">
      <Navbar />
      <main>
        <Hero />
        <ProblemSection />
        <HowItWorks />
        <ComparisonTable />
        <FeatureGrid />
        <RealWorkflow />
        <PrivacySection />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

export default App;
