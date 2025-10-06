// This is a Server Component (no 'use client' directive)
import "./styles/globals.css";
import ClientRootLayout from "@/components/layout/ClientRootLayout";
import ToastContainer from "@/components/ui/Toast/ToastContainer";

export const metadata = {
  title: "Prospire - Elevate Your Pilates Experience",
  description:
    "A web platform for Pilates studios, connecting instructors and students seamlessly.",
  icons: {
    icon: "/assets/prospire-logo.svg",
    apple: "/assets/prospire-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <ClientRootLayout>
          {children}
          <ToastContainer />
        </ClientRootLayout>
      </body>
    </html>
  );
}
