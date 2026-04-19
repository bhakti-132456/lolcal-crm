import { useEffect, useState } from "react";

export function Logo() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setTheme(mediaQuery.matches ? "dark" : "light");
    
    setTheme(mediaQuery.matches ? "dark" : "light");
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <img 
        src={theme === "dark" ? "/src/assets/axon_white.svg" : "/src/assets/axon_blue.svg"} 
        alt="AXON Logo" 
        className="h-8 w-auto"
      />
      <span className="text-xl font-bold tracking-tighter text-white">AXON</span>
    </div>
  );
}
