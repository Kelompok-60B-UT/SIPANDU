import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/landing/Hero";
import Stats from "@/components/landing/Stats";
import Features from "@/components/landing/Features";
import Categories from "@/components/landing/Categories";
import Steps from "@/components/landing/Steps";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <Features />
        <Categories />
        <Steps />
      </main>
    </>
  );
}
