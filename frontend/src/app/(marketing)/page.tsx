"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  Receipt,
  Package,
  ShoppingCart,
  BarChart3,
  MapPin,
  Users,
  CheckCircle2,
  ArrowRight,
  Phone,
  Building2,
  MapPinIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const features = [
  {
    icon: Receipt,
    title: "Billing & GST Invoicing",
    description: "Create GST-compliant invoices instantly. Auto-calculate CGST/SGST, manage credit limits, and print or WhatsApp invoices in seconds.",
  },
  {
    icon: Package,
    title: "Stock & Batch Management",
    description: "Track every batch with expiry dates, MRP, PTR and PTS. Get alerts before stock runs low or batches expire.",
  },
  {
    icon: ShoppingCart,
    title: "Purchase Management",
    description: "Record purchases from suppliers, manage debit notes, and keep supplier balances up to date automatically.",
  },
  {
    icon: BarChart3,
    title: "GST Reports & Downloads",
    description: "Download GST-ready Excel reports for sales and purchases. One click — complete data formatted for your CA.",
  },
  {
    icon: MapPin,
    title: "Field Force Tracking",
    description: "Track your sales reps in real time, assign routes, log customer visits, and take orders on the go.",
  },
  {
    icon: Users,
    title: "Multi-Role Access Control",
    description: "Give each team member exactly the right access — billing operators, warehouse managers, accountants, and sales reps.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "₹1,499",
    period: "/month",
    description: "Perfect for small pharmacies getting started.",
    features: [
      "Up to 3 users",
      "Billing & invoicing",
      "Stock management",
      "GST reports",
      "Email support",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "₹2,999",
    period: "/month",
    description: "For growing distributors with a larger team.",
    features: [
      "Up to 10 users",
      "Everything in Starter",
      "Purchase management",
      "Field force tracking",
      "Priority support",
    ],
    cta: "Get Started",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large operations with custom requirements.",
    features: [
      "Unlimited users",
      "Everything in Growth",
      "Custom integrations",
      "Dedicated onboarding",
      "SLA support",
    ],
    cta: "Contact Us",
    highlighted: false,
  },
];

export default function LandingPage() {
  const [form, setForm] = useState({ name: "", phone: "", business: "", city: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.business) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    const message = encodeURIComponent(
      `Hi PharmaFlow Pro,\n\nI'd like to request a demo.\n\nName: ${form.name}\nPhone: ${form.phone}\nBusiness: ${form.business}\nCity: ${form.city}`
    );
    window.open(`https://wa.me/919999999999?text=${message}`, "_blank");
    toast.success("Opening WhatsApp — send the message to book your demo!");
    setForm({ name: "", phone: "", business: "", city: "" });
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/pharmaflow-logo.png" alt="PharmaFlow Pro" width={36} height={36} className="rounded-lg" />
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              PharmaFlow Pro
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#contact" className="hover:text-slate-900 transition-colors">Contact</a>
          </nav>
          <Link href="/app/login">
            <Button variant="outline" size="sm">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          Built for Indian Wholesale Pharma Distributors
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 leading-tight mb-6">
          The Complete Pharma<br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent"> Management Platform</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10">
          Billing, GST reports, stock, purchases, field force — everything a wholesale pharma distributor needs in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="#contact">
            <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8">
              Get a Free Demo
            </Button>
          </a>
          <Link href="/app/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">
              Sign In <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Everything you need to run your business</h2>
            <p className="text-slate-500 text-lg">From the first invoice to the monthly GST filing — covered.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <Card key={f.title} className="border border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                    <f.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-900">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Simple, transparent pricing</h2>
            <p className="text-slate-500 text-lg">No hidden fees. Cancel anytime.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative border ${plan.highlighted ? "border-blue-500 shadow-lg shadow-blue-100" : "border-slate-200 shadow-sm"}`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-slate-900">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className={`text-3xl font-bold ${plan.highlighted ? "text-blue-600" : "text-slate-900"}`}>{plan.price}</span>
                    {plan.period && <span className="text-slate-400 text-sm">{plan.period}</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-2">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <a href="#contact">
                    <Button
                      className={`w-full mt-2 ${plan.highlighted ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                      variant={plan.highlighted ? "default" : "outline"}
                      size="sm"
                    >
                      {plan.cta}
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact / Demo */}
      <section id="contact" className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Book a free demo</h2>
              <p className="text-slate-500 text-lg mb-8">
                See PharmaFlow Pro in action. We'll walk you through the full platform and set up your account — for free.
              </p>
              <div className="space-y-4 text-sm text-slate-600">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  <span>Live demo tailored to your business</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  <span>Free onboarding and data setup</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  <span>No commitment required</span>
                </div>
              </div>
            </div>

            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Your Name *</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="name"
                        placeholder="Rajesh Kumar"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="phone"
                        placeholder="+91 98765 43210"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="business">Business Name *</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="business"
                        placeholder="Your Pharma Distributors"
                        value={form.business}
                        onChange={(e) => setForm({ ...form, business: e.target.value })}
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">City</Label>
                    <div className="relative">
                      <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="city"
                        placeholder="Chennai"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full bg-green-600 hover:bg-green-700 text-white">
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Request Demo on WhatsApp
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/pharmaflow-logo.png" alt="PharmaFlow Pro" width={24} height={24} className="rounded" />
            <span className="text-sm font-semibold text-slate-700">PharmaFlow Pro</span>
          </div>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} PharmaFlow Pro. All rights reserved.</p>
          <Link href="/app/login" className="text-sm text-blue-600 hover:underline font-medium">
            Sign In to App →
          </Link>
        </div>
      </footer>
    </div>
  );
}
