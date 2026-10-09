import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container section">
      <div className="empty">
        <h1>Səhifə tapılmadı.</h1>
        <p>Linki yoxlayın və ya əsas səhifəyə qayıdın.</p>
        <Link href="/" className="btn">
          Əsas səhifə
        </Link>
      </div>
    </div>
  );
}
