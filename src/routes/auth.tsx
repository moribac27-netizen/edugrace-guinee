import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { School } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Connexion — MBGEduGuinée" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [signIn, setSignIn] = useState({ email: "", password: "" });
  const [signUp, setSignUp] = useState({ email: "", password: "", fullName: "", phone: "" });

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(signIn);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Connexion réussie");
    navigate({ to: "/dashboard" });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signUp.email,
      password: signUp.password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { full_name: signUp.fullName, phone: signUp.phone },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Compte créé. Vérifiez votre email si requis.");
    navigate({ to: "/dashboard" });
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) return toast.error("Connexion Google indisponible");
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-3 mb-8 justify-center">
          <div className="size-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <School className="size-6" />
          </div>
          <div>
            <div className="font-display font-bold text-2xl leading-none">MBGEduGuinée</div>
            <div className="text-xs text-muted-foreground mt-1">Gestion scolaire numérique</div>
          </div>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Bienvenue</CardTitle>
            <CardDescription>Connectez-vous ou créez votre compte établissement</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="signin">Connexion</TabsTrigger>
                <TabsTrigger value="signup">Inscription</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-3">
                  <div><Label>Email</Label><Input type="email" required value={signIn.email} onChange={(e) => setSignIn({ ...signIn, email: e.target.value })} /></div>
                  <div><Label>Mot de passe</Label><Input type="password" required value={signIn.password} onChange={(e) => setSignIn({ ...signIn, password: e.target.value })} /></div>
                  <Button type="submit" className="w-full" disabled={loading}>Se connecter</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-3">
                  <div><Label>Nom complet</Label><Input required value={signUp.fullName} onChange={(e) => setSignUp({ ...signUp, fullName: e.target.value })} /></div>
                  <div><Label>Téléphone</Label><Input value={signUp.phone} onChange={(e) => setSignUp({ ...signUp, phone: e.target.value })} placeholder="+224..." /></div>
                  <div><Label>Email</Label><Input type="email" required value={signUp.email} onChange={(e) => setSignUp({ ...signUp, email: e.target.value })} /></div>
                  <div><Label>Mot de passe</Label><Input type="password" required minLength={6} value={signUp.password} onChange={(e) => setSignUp({ ...signUp, password: e.target.value })} /></div>
                  <Button type="submit" className="w-full" disabled={loading}>Créer le compte</Button>
                </form>
              </TabsContent>
            </Tabs>
            <div className="my-4 flex items-center gap-3">
              <div className="h-px bg-border flex-1" />
              <span className="text-xs text-muted-foreground">ou</span>
              <div className="h-px bg-border flex-1" />
            </div>
            <Button variant="outline" className="w-full" onClick={handleGoogle}>Continuer avec Google</Button>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-4">
          Premier utilisateur ? Vous serez créé comme <span className="font-medium">parent</span>. Demandez à un admin de modifier votre rôle.
        </p>
      </div>
    </div>
  );
}
