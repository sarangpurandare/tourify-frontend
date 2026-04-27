import "./website.css";

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..700,0..100,0..1;1,9..144,300..700,0..100,0..1&family=Mulish:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&family=Caveat:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <div className="website-shell">
        {children}
      </div>
    </>
  );
}
