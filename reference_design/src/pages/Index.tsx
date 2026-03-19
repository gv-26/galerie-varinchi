import Header from "@/components/Header";
import Hero from "@/components/Hero";
import BrandStory from "@/components/BrandStory";
import VisualShowcase from "@/components/VisualShowcase";
import CallToAction from "@/components/CallToAction";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <BrandStory />
      <VisualShowcase />
      <CallToAction />
      <Footer />
    </div>
  );
};

export default Index;
