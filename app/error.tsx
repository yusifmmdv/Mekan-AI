"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container section">
      <div className="empty">
        <h1>Məlumat yüklənmədi.</h1>
        <p>Bağlantını yoxlayın və yenidən cəhd edin.</p>
        <button className="btn" onClick={reset}>
          Yenidən yoxla
        </button>
      </div>
    </div>
  );
}
