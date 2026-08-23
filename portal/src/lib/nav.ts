export const MARKETING_SITE_URL = "https://koalacademy-web.netlify.app/";

export function normalizePath(path: string) {
  if (!path || path === "/") return "/";
  return path.replace(/\/+$/, "") || "/";
}

export function isActivePath(pathname: string, href: string) {
  return normalizePath(pathname) === normalizePath(href);
}

export function isDashboardPath(pathname: string) {
  const path = normalizePath(pathname);
  return path === "/" || path === "/dashboard";
}

export function isLessonsSection(pathname: string) {
  const path = normalizePath(pathname);
  return path === "/lessons" || path.startsWith("/lessons/") || path.startsWith("/grades/");
}
