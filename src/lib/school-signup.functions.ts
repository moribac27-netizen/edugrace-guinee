import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  phone: z.string().optional().nullable(),
  schoolName: z.string().min(1),
  schoolAddress: z.string().optional().nullable(),
  schoolPhone: z.string().optional().nullable(),
});

export const registerSchool = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Create school
    const { data: school, error: schoolErr } = await supabaseAdmin
      .from("schools")
      .insert({
        name: data.schoolName,
        address: data.schoolAddress ?? null,
        phone: data.schoolPhone ?? null,
        email: data.email,
      })
      .select("id")
      .single();
    if (schoolErr || !school) {
      throw new Error(`Impossible de créer l'établissement: ${schoolErr?.message ?? "erreur inconnue"}`);
    }

    // 2. Create admin user (auto-confirmed so login works immediately)
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        phone: data.phone ?? null,
        school_id: school.id,
        role: "admin",
      },
    });
    if (userErr || !userRes.user) {
      // rollback the school
      await supabaseAdmin.from("schools").delete().eq("id", school.id);
      const msg = userErr?.message ?? "";
      if (/already registered|already been registered|exists/i.test(msg)) {
        throw new Error("Cette adresse e-mail est déjà utilisée. Connectez-vous ou utilisez une autre adresse.");
      }
      throw new Error(`Impossible de créer le compte administrateur: ${msg || "erreur inconnue"}`);
    }

    return { schoolId: school.id, userId: userRes.user.id, emailConfirmed: true };
  });
