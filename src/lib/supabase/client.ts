import { createBrowserClient } from "@supabase/ssr";

const CP_PREFIX = "cp_";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return document.cookie
            .split("; ")
            .filter(Boolean)
            .filter((c) => c.startsWith(CP_PREFIX))
            .map((c) => {
              const eqIdx = c.indexOf("=");
              return {
                name: c.substring(0, eqIdx).slice(CP_PREFIX.length),
                value: c.substring(eqIdx + 1),
              };
            });
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const parts = [`${CP_PREFIX}${name}=${value}`];
            if (options?.path) parts.push(`path=${options.path}`);
            if (options?.maxAge != null) parts.push(`max-age=${options.maxAge}`);
            if (options?.domain) parts.push(`domain=${options.domain}`);
            if (options?.sameSite) parts.push(`samesite=${options.sameSite}`);
            if (options?.secure) parts.push("secure");
            document.cookie = parts.join(";");
          });
        },
      },
    }
  );
}
