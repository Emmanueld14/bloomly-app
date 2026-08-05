import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (request.nextUrl.pathname.startsWith("/admin")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("next", request.nextUrl.pathname);
      redirectUrl.searchParams.set("error", "missing_supabase_env");
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdminRoute = path.startsWith("/admin");
  const isAuthPage = path === "/login" || path === "/signup";
  const isAccountRoute = path.startsWith("/account");

  if ((isAdminRoute || isAccountRoute) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  if ((isAdminRoute || isAccountRoute) && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.is_active === false) {
      await supabase.auth.signOut();
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("error", "account_deactivated");
      return NextResponse.redirect(redirectUrl);
    }

    if (isAdminRoute && profile?.role !== "admin") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/account";
      redirectUrl.searchParams.set("error", "admin_required");
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (isAuthPage && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, username, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.is_active === false) {
      await supabase.auth.signOut();
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("error", "account_deactivated");
      return NextResponse.redirect(redirectUrl);
    }

    const redirectUrl = request.nextUrl.clone();
    const incomplete =
      !profile?.username || /^user_[a-f0-9]{8}$/i.test(profile.username);
    if (incomplete) {
      // Static /profile-setup lives on the Cloudflare site root (outside Next).
      return NextResponse.redirect(
        new URL(
          `/profile-setup/?next=${encodeURIComponent(
            profile?.role === "admin" ? "/admin/" : "/account/"
          )}`,
          request.url
        )
      );
    }
    redirectUrl.pathname = profile?.role === "admin" ? "/admin" : "/account";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
