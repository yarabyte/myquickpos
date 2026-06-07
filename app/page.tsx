"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import {
  Monitor,
  Globe,
  BarChart3,
  Shield,
  ArrowRight,
  CheckCircle2,
  Zap,
  Receipt,
  Package,
  Smartphone,
  WifiOff,
  Users,
  Heart,
  Coffee,
  ChevronRight,
  Play,
  Star,
  TrendingUp,
  Clock,
  Menu,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { AnimateOnScroll } from "@/components/ui/animate-on-scroll"

const FEATURES = [
  {
    icon: Globe,
    title: "Multi-location",
    description: "Manage all your terminals from a single dashboard",
  },
  {
    icon: BarChart3,
    title: "Real-time analytics",
    description: "Track sales, revenue, and performance instantly",
  },
  {
    icon: Shield,
    title: "Secure & reliable",
    description: "Role-based access with encrypted data at rest",
  },
  {
    icon: Receipt,
    title: "Custom receipts",
    description: "Print or email branded receipts with your logo and details",
  },
  {
    icon: Package,
    title: "Inventory management",
    description: "Track stock levels, categories, and product variants",
  },
  {
    icon: Smartphone,
    title: "Touch-optimized",
    description: "Designed for tablets and touch screens at the counter",
  },
  {
    icon: WifiOff,
    title: "Offline mode",
    description: "Keep selling when the connection drops — syncs when back online",
  },
  {
    icon: Users,
    title: "Team & roles",
    description: "Add cashiers and managers with role-based permissions",
  },
]

const TESTIMONIALS = [
  {
    quote:
      "MyQuickPOS transformed how we manage our restaurant. Setting up terminals across three locations took minutes, not hours.",
    name: "Maria Rodriguez",
    role: "Owner, La Cocina Restaurant",
    initials: "MR",
  },
  {
    quote:
      "Finally, a POS that just works. No subscriptions, no hidden fees. We switched from our old system and never looked back.",
    name: "James Chen",
    role: "Manager, Urban Café",
    initials: "JC",
  },
  {
    quote:
      "The touch interface is perfect for our busy counter. Our staff picked it up in a day. Best decision we made this year.",
    name: "Sarah Williams",
    role: "Owner, The Daily Bakery",
    initials: "SW",
  },
]

const BENEFITS = [
  "Set up in under 2 minutes",
  "No credit card required",
  "Free to get started",
]

export default function HomePage() {
  const [isVisible, setIsVisible] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsVisible(true)
    
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Header */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrollY > 50 
            ? 'bg-background/95 backdrop-blur-2xl border-b border-border/60 shadow-lg' 
            : 'bg-background/50 backdrop-blur-md border-b border-border/20'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="group flex items-center gap-2.5 transition-all duration-300 relative z-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/40 group-hover:scale-105">
              <Monitor className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">
              MyQuickPOS
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a 
              href="#features" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              Features
            </a>
            <a 
              href="#testimonials" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              Testimonials
            </a>
            <a 
              href="#donate" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              Support
            </a>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-muted-foreground hover:text-foreground transition-all duration-300"
            >
              <Link href="/login">Sign in</Link>
            </Button>
            <Button 
              size="sm" 
              asChild 
              className="shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all duration-300 hover:scale-105"
            >
              <Link href="/signup">
                Get started
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:bg-secondary active:scale-95"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-background/98 backdrop-blur-2xl border-b border-border shadow-xl animate-fade-in">
            <div className="mx-auto max-w-7xl px-4 py-6 space-y-4">
              <a 
                href="#features" 
                onClick={() => setMobileMenuOpen(false)}
                className="block py-3 px-4 text-base font-medium text-foreground hover:bg-secondary rounded-lg transition-colors duration-300"
              >
                Features
              </a>
              <a 
                href="#testimonials" 
                onClick={() => setMobileMenuOpen(false)}
                className="block py-3 px-4 text-base font-medium text-foreground hover:bg-secondary rounded-lg transition-colors duration-300"
              >
                Testimonials
              </a>
              <a 
                href="#donate" 
                onClick={() => setMobileMenuOpen(false)}
                className="block py-3 px-4 text-base font-medium text-foreground hover:bg-secondary rounded-lg transition-colors duration-300"
              >
                Support
              </a>
              <div className="border-t border-border pt-4 space-y-2">
                <Button
                  variant="ghost"
                  size="lg"
                  asChild
                  className="w-full justify-start text-base"
                >
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    Sign in
                  </Link>
                </Button>
                <Button 
                  size="lg" 
                  asChild 
                  className="w-full shadow-lg shadow-primary/25"
                >
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                    Get started
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section 
        ref={heroRef}
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-16"
      >
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          <div 
            className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJoc2woMCAwJSA4MCUgLyAwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"
            style={{ 
              transform: `translateY(${scrollY * 0.5}px)`,
              transition: 'transform 0.1s ease-out'
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl text-center space-y-8">
          {/* Badge */}
          <div
            className={`inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary backdrop-blur-sm transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            <Zap className="h-4 w-4 animate-pulse" />
            <span>Launch your POS in under 2 minutes</span>
            <ChevronRight className="h-4 w-4" />
          </div>

          {/* Main Headline */}
          <h1
            className={`text-5xl font-extrabold tracking-tight text-balance transition-all duration-700 sm:text-6xl md:text-7xl lg:text-8xl ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '200ms' }}
          >
            Point of sale{" "}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                that just works
              </span>
              <span className="absolute -inset-1 bg-primary/20 blur-2xl -z-10" />
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className={`mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground transition-all duration-700 sm:text-xl ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '300ms' }}
          >
            Modern touch-screen POS for restaurants, cafés, retail, jewelry stores, beauty shops, 
            bakeries, barber shops, and more. Set up terminals, manage inventory, and start accepting 
            payments — all from one beautiful dashboard.
          </p>

          {/* CTA Buttons */}
          <div
            className={`flex flex-col items-center justify-center gap-4 transition-all duration-700 sm:flex-row ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '400ms' }}
          >
            <Button
              size="lg"
              asChild
              className="group h-14 px-8 text-base font-semibold shadow-2xl shadow-primary/30 transition-all duration-500 hover:scale-105 hover:shadow-primary/40"
            >
              <Link href="/signup">
                Get started for free
                <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="group h-14 border-2 px-8 text-base font-semibold backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:border-primary/50"
            >
              <Link href="/login">
                <Play className="mr-2 h-5 w-5" />
                Watch demo
              </Link>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div
            className={`flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '500ms' }}
          >
            {BENEFITS.map((benefit, idx) => (
              <div key={benefit} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          {/* Social Proof */}
          <div
            className={`pt-8 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '600ms' }}
          >
            <div className="flex items-center justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-primary text-primary" />
              ))}
              <span className="ml-2 text-sm font-semibold">4.9/5</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Trusted by <span className="font-semibold text-foreground">4,200+</span> businesses worldwide
            </p>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="relative border-y border-border/50 bg-card/50 py-12 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div className="group text-center transition-all duration-500 hover:-translate-y-1">
              <div className="mb-2 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary mr-2" />
                <p className="text-3xl font-extrabold text-foreground">12k+</p>
              </div>
              <p className="text-sm text-muted-foreground">Active terminals</p>
            </div>
            <div className="group text-center transition-all duration-500 hover:-translate-y-1">
              <div className="mb-2 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary mr-2" />
                <p className="text-3xl font-extrabold text-foreground">99.9%</p>
              </div>
              <p className="text-sm text-muted-foreground">Uptime</p>
            </div>
            <div className="group text-center transition-all duration-500 hover:-translate-y-1">
              <div className="mb-2 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary mr-2" />
                <p className="text-3xl font-extrabold text-foreground">4.2k</p>
              </div>
              <p className="text-sm text-muted-foreground">Businesses</p>
            </div>
            <div className="group text-center transition-all duration-500 hover:-translate-y-1">
              <div className="mb-2 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary mr-2" />
                <p className="text-3xl font-extrabold text-foreground">&lt;2min</p>
              </div>
              <p className="text-sm text-muted-foreground">Setup time</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-24 sm:py-32 scroll-mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll animation="fade-up">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-sm">
                <Zap className="h-3.5 w-3.5" />
                Powerful Features
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
                Everything you need,
                <br />
                <span className="text-muted-foreground">nothing you don't</span>
              </h2>
              <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
                A complete solution for restaurants, cafés, retail, jewelry stores, beauty shops, bakeries, barber shops, and more
              </p>
            </div>
          </AnimateOnScroll>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, description }, idx) => (
              <AnimateOnScroll
                key={title}
                animation="fade-up"
                delay={idx * 80}
                rootMargin="0px 0px -100px 0px"
              >
                <div className="group relative h-full rounded-2xl border border-border bg-card p-8 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10">
                  <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="relative">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 transition-all duration-500 group-hover:scale-110 group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/30">
                      <Icon className="h-7 w-7 text-primary transition-colors duration-500 group-hover:text-primary-foreground" />
                    </div>
                    <h3 className="mt-6 text-xl font-bold">{title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative border-t border-border bg-card/30 py-24 sm:py-32 backdrop-blur-sm scroll-mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll animation="fade-up">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-sm">
                <Star className="h-3.5 w-3.5 fill-primary" />
                Testimonials
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                Loved by thousands
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                See what businesses around the world say about MyQuickPOS
              </p>
            </div>
          </AnimateOnScroll>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map(({ quote, name, role, initials }, idx) => (
              <AnimateOnScroll
                key={name}
                animation="fade-up"
                delay={idx * 100}
                rootMargin="0px 0px -80px 0px"
              >
                <div className="group relative h-full rounded-3xl border border-border bg-card p-8 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10">
                  <div className="absolute -top-4 -right-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 opacity-0 transition-all duration-500 group-hover:opacity-100">
                    <Star className="h-6 w-6 fill-primary text-primary" />
                  </div>
                  <div className="relative">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <blockquote className="text-base leading-relaxed text-foreground">
                      &ldquo;{quote}&rdquo;
                    </blockquote>
                    <div className="mt-6 flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-base font-bold text-primary ring-2 ring-primary/20 transition-all duration-300 group-hover:scale-110 group-hover:ring-4">
                        {initials}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{name}</p>
                        <p className="text-sm text-muted-foreground">{role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Donate - Free for life */}
      <AnimateOnScroll animation="scale" rootMargin="0px 0px -100px 0px">
        <section
          id="donate"
          className="scroll-mt-20 border-t border-border bg-gradient-to-b from-primary/5 via-primary/10 to-primary/5 py-24 sm:py-32"
        >
          <div className="mx-auto max-w-3xl px-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/20 shadow-lg shadow-primary/20 transition-all duration-500 hover:scale-110 hover:shadow-2xl hover:shadow-primary/30">
              <Heart className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <h2 className="mt-8 text-3xl font-extrabold sm:text-4xl md:text-5xl">
              Free forever.{" "}
              <span className="text-primary">No subscriptions.</span>
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              MyQuickPOS is 100% free with no hidden fees or subscriptions. If it
              helps your business thrive, consider supporting its development so we
              can keep it free for everyone.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                asChild
                className="h-12 border-2 border-primary/30 backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:border-primary hover:bg-primary/5 hover:shadow-lg"
              >
                <a
                  href="https://www.buymeacoffee.com/myquickpos"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Coffee className="mr-2 h-5 w-5" />
                  Buy Me a Coffee
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="h-12 border-2 border-primary/30 backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:border-primary hover:bg-primary/5 hover:shadow-lg"
              >
                <a
                  href="https://github.com/sponsors/myquickpos"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Heart className="mr-2 h-5 w-5" />
                  GitHub Sponsors
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="h-12 border-2 border-primary/30 backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:border-primary hover:bg-primary/5 hover:shadow-lg"
              >
                <a
                  href="https://paypal.me/myquickpos"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  PayPal
                </a>
              </Button>
            </div>
            <p className="mt-8 text-sm text-muted-foreground">
              Every donation helps maintain the servers and add new features.
            </p>
          </div>
        </section>
      </AnimateOnScroll>

      {/* CTA */}
      <AnimateOnScroll animation="fade-up" rootMargin="0px 0px -100px 0px">
        <section className="relative border-t border-border bg-card/30 py-24 sm:py-32 backdrop-blur-sm overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-3xl px-4 text-center space-y-8">
            <h2 className="text-4xl font-extrabold sm:text-5xl md:text-6xl">
              Ready to transform
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                your business?
              </span>
            </h2>
            <p className="mx-auto max-w-xl text-lg leading-relaxed text-muted-foreground">
              Join 4,200+ businesses using MyQuickPOS. Create your account for free—no credit card required.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                asChild
                className="group h-14 px-10 text-base font-bold shadow-2xl shadow-primary/30 transition-all duration-500 hover:scale-105 hover:shadow-primary/40"
              >
                <Link href="/signup">
                  Create free account
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="group h-14 border-2 px-10 text-base font-bold backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:border-primary/50"
              >
                <Link href="/login">
                  Sign in
                  <ChevronRight className="ml-1 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </AnimateOnScroll>

      {/* Footer */}
      <footer className="relative border-t border-border bg-gradient-to-b from-background via-card/30 to-card/50 py-16 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand Column */}
            <div className="space-y-4 sm:col-span-2 lg:col-span-1">
              <Link
                href="/"
                className="group inline-flex items-center gap-2.5 transition-all duration-300"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25 transition-all duration-500 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/40">
                  <Monitor className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-extrabold">MyQuickPOS</span>
              </Link>
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                Modern point of sale system that just works. Free forever, no subscriptions.
              </p>
              <div className="flex gap-3 pt-2">
                <a
                  href="https://github.com/myquickpos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:border-primary/50 hover:bg-primary/10"
                >
                  <Globe className="h-4 w-4" />
                </a>
                <a
                  href="https://twitter.com/myquickpos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:border-primary/50 hover:bg-primary/10"
                >
                  <Globe className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Product Column */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Product
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/signup"
                    className="inline-block text-sm text-muted-foreground transition-all duration-300 hover:translate-x-1 hover:text-foreground"
                  >
                    Get started
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="inline-block text-sm text-muted-foreground transition-all duration-300 hover:translate-x-1 hover:text-foreground"
                  >
                    Sign in
                  </Link>
                </li>
                <li>
                  <a
                    href="#donate"
                    className="inline-block text-sm text-muted-foreground transition-all duration-300 hover:translate-x-1 hover:text-foreground"
                  >
                    Donate
                  </a>
                </li>
              </ul>
            </div>

            {/* Features Column */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Features
              </h3>
              <ul className="space-y-3">
                <li>
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    Multi-terminal
                  </span>
                </li>
                <li>
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    Real-time sync
                  </span>
                </li>
                <li>
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    Offline mode
                  </span>
                </li>
                <li>
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    Analytics
                  </span>
                </li>
              </ul>
            </div>

            {/* Support Column */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Support
              </h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="https://github.com/myquickpos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-sm text-muted-foreground transition-all duration-300 hover:translate-x-1 hover:text-foreground"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:support@myquickpos.app"
                    className="inline-block text-sm text-muted-foreground transition-all duration-300 hover:translate-x-1 hover:text-foreground"
                  >
                    Contact
                  </a>
                </li>
                <li>
                  <a
                    href="/docs"
                    className="inline-block text-sm text-muted-foreground transition-all duration-300 hover:translate-x-1 hover:text-foreground"
                  >
                    Documentation
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} MyQuickPOS. Free forever, no subscriptions.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a
                href="/privacy"
                className="transition-colors duration-300 hover:text-foreground"
              >
                Privacy
              </a>
              <a
                href="/terms"
                className="transition-colors duration-300 hover:text-foreground"
              >
                Terms
              </a>
              <a
                href="/license"
                className="transition-colors duration-300 hover:text-foreground"
              >
                License
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
