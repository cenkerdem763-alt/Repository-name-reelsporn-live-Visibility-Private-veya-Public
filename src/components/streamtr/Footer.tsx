export function Footer() {
  return (
    <footer className="mt-20 border-t border-border px-4 md:px-10 py-10 text-sm text-muted-foreground">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {["Hakkımızda", "Yardım Merkezi", "Gizlilik", "Kullanım Koşulları", "Hesap", "İletişim", "Kariyer", "Kurumsal Bilgiler"].map((l) => (
            <a key={l} href="#" className="hover:underline hover:text-foreground transition">{l}</a>
          ))}
        </div>
        <p className="text-xs">© {new Date().getFullYear()} ReelsPorn. Tüm hakları saklıdır.</p>
      </div>
    </footer>
  );
}
