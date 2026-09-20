import { Nav, Hero, Trust, DemoSection, Features, HowItWorks, Privacy, Faq, FinalCta, Footer, StickyCta } from './components/Sections';

export default function App() {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-card focus:px-4 focus:py-2">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <Trust />
        <DemoSection />
        <Features />
        <HowItWorks />
        <Privacy />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <StickyCta />
    </>
  );
}
