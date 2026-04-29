import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dase | Підтвердження замовлень",
  description: "Вебзастосунок для підтвердження ювелірних замовлень.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body>
        <a className="skip-link" href="#main-content">
          Перейти до основного вмісту
        </a>
        {children}
      </body>
    </html>
  );
}
