import "./globals.css";

export const metadata = {
  title: "Krovoro",
  description: "Intelligence That Works."
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
