import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export async function POST() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:3000"), {
        status: 302,
    });
}
