"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/neon/auth";

export async function login(_prevState: unknown, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await getAuth().signIn.email({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function register(_prevState: unknown, formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Unlike Supabase, signUp signs the user in and sets the session cookie in one
  // call, so the old admin-createUser-then-signIn dance (a workaround for
  // Supabase's ~3-request email rate limit) is gone.
  const { error } = await getAuth().signUp.email({ email, password, name });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  await getAuth().signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
