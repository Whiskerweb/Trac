import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { ValueProps } from '@/components/landing/ValueProps';
import { Footer } from '@/components/landing/Footer';
import { Logos } from '@/components/landing/Logos';
import { MissionSelector } from '@/components/landing/MissionSelector';
import { B2BFeatures } from '@/components/landing/B2BFeatures';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="min-h-screen bg-white selection:bg-blue-100 selection:text-blue-900">
      <Navbar />
      <main>
        <Hero />
        <Logos />
        <MissionSelector />
        <B2BFeatures />
        {/* <ValueProps /> Keeping old value props for now, can perform cleanup later if redundant */}
        <Features />
      </main>
      <Footer />
    </div>
  );
}
