import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  School, Users, GraduationCap, ClipboardList, CreditCard, Megaphone,
  BarChart3, Check, ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EduGuinée — Gestion scolaire numérique en Guinée" },
      { name: "description", content: "Plateforme complète pour écoles primaires, collèges, lycées et centres de formation. Élèves, notes, paiements, communication." },
      { property: "og:title", content: "EduGuinée — Gestion scolaire numérique" },
      { property: "og:description", content: "Digitalisez votre établissement scolaire en Guinée." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Users, title: "Gestion des élèves", desc: "Inscriptions, dossiers, classes, photos." },
  { icon: GraduationCap, title: "Enseignants", desc: "Matières, emploi du temps, salaires." },
  { icon: ClipboardList, title: "Notes & bulletins", desc: "Moyennes, classement, bulletins PDF." },
  { icon: CreditCard, title: "Paiements", desc: "Frais, reçus, relances automatiques." },
  { icon: Megaphone, title: "Communication", desc: "Annonces, notifications aux parents." },
  { icon: BarChart3, title: "Rapports", desc: "Statistiques financières et académiques." },
];

const PLANS = [
  { name: "Basic", price: "100 000", features: ["Jusqu'à 200 élèves", "Gestion élèves & classes", "Notes & bulletins", "Support email"] },
  { name: "Standard", price: "150 000", popular: true, features: ["Jusqu'à 600 élèves", "Tout Basic", "Paiements & comptabilité", "Espace parent", "Support prioritaire"] },
  { name: "Premium", price: "200 000", features: ["Élèves illimités", "Tout Standard", "Rapports avancés", "Multi-établissements", "Support dédié"] },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <School className="size-5" />
            </div>
            <div>
              <div className="font-display font-bold text-lg leading-none">EduGuinée</div>
              <div className="text-xs text-muted-foreground mt-1">Gestion scolaire</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#fonctionnalites" className="text-muted-foreground hover:text-foreground">Fonctionnalités</a>
            <a href="#tarifs" className="text-muted-foreground hover:text-foreground">Tarifs</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Connexion</Button></Link>
            <Link to="/auth"><Button size="sm">Commencer</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/10 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-20 lg:py-28 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-sm font-medium mb-6">
              <span className="size-2 rounded-full bg-accent" />
              Conçu pour les écoles guinéennes
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
              La gestion scolaire qui simplifie le quotidien de votre établissement.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
              EduGuinée digitalise inscriptions, notes, paiements, comptabilité et communication.
              Écoles primaires, collèges, lycées et centres de formation.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth">
                <Button size="lg" className="gap-2">Démarrer gratuitement <ArrowRight className="size-4" /></Button>
              </Link>
              <a href="#tarifs"><Button size="lg" variant="outline">Voir les tarifs</Button></a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="fonctionnalites" className="py-20 border-t">
        <div className="max-w-6xl mx-auto px-4 lg:px-6">
          <div className="max-w-2xl mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold">Tout votre établissement, en un seul endroit.</h2>
            <p className="mt-4 text-muted-foreground">Des outils pensés pour les directeurs, enseignants, parents et élèves.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="p-6 rounded-xl border bg-card hover:border-primary/40 transition-colors">
                  <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4"><Icon className="size-5" /></div>
                  <h3 className="font-display font-semibold text-lg">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="tarifs" className="py-20 border-t bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold">Des tarifs adaptés à chaque école</h2>
            <p className="mt-4 text-muted-foreground">Sans engagement. Annulez à tout moment.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((p) => (
              <div key={p.name} className={"p-8 rounded-2xl border bg-card relative " + (p.popular ? "border-primary shadow-lg ring-1 ring-primary/20" : "")}>
                {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">Recommandé</div>}
                <h3 className="font-display text-2xl font-bold">{p.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{p.price}</span>
                  <span className="text-muted-foreground">GNF/mois</span>
                </div>
                <ul className="mt-6 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2"><Check className="size-4 text-primary mt-0.5 shrink-0" />{f}</li>
                  ))}
                </ul>
                <Link to="/auth"><Button className="w-full mt-6" variant={p.popular ? "default" : "outline"}>Choisir {p.name}</Button></Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 flex flex-col sm:flex-row justify-between gap-4 text-sm text-muted-foreground">
          <div>© 2026 EduGuinée. Conçu en Guinée pour les écoles guinéennes.</div>
          <div>Conakry · contact@eduguinee.gn</div>
        </div>
      </footer>
    </div>
  );
}
