"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export default function ThemeProvider({ children }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      themes={["dark", "light"]}
      // No custom `value` mapping — that's what caused the crash. Mapping
      // "dark" to an empty string ("") made next-themes call
      // classList.add("")/remove("") internally, and DOMTokenList throws a
      // SyntaxError on an empty token; it's simply not a valid class name.
      // Default behavior (theme name = class name) works fine here: an
      // unused .dark class landing on <html> is harmless since :root
      // already holds the dark tokens as the default, and .light in
      // globals.css still overrides correctly when that class is applied.
    >
      {children}
    </NextThemesProvider>
  );
}