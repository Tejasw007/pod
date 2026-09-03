import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const { podId } = await request.json();
    if (!podId) {
      return NextResponse.json({ error: "Missing podId" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Verify pod exists
    const { data: pod, error: podErr } = await supabase
      .from("pods")
      .select("id, status")
      .eq("pod_code", podId)
      .single();

    if (podErr || !pod) {
      return NextResponse.json({ error: "Pod not found" }, { status: 404 });
    }

    // 2. Invalidate previous active sessions for this pod
    await supabase
      .from("pod_sessions")
      .update({ is_active: false })
      .eq("pod_id", pod.id)
      .eq("is_active", true);

    // 3. Create new session token (valid for 5 mins)
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { data: session, error: sessErr } = await supabase
      .from("pod_sessions")
      .insert({
        pod_id: pod.id,
        token: token,
        expires_at: expiresAt,
        is_active: true,
      })
      .select()
      .single();

    if (sessErr) {
      throw sessErr;
    }

    return NextResponse.json({
      sessionId: session.id,
      token: session.token,
      expiresAt: session.expires_at,
      podDbId: pod.id,
    });
  } catch (err) {
    console.error("Pod Session API Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
