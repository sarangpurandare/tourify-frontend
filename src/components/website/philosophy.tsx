export function Philosophy() {
  const items = [
    { n: "01", t: "Small groups. Never more than 20.", d: "Travel with a handpicked group of like-minded explorers. One round table at every dinner. Everybody has a seat. Everybody gets heard." },
    { n: "02", t: "Travel at your own pace.", d: "No rushing through destinations. Our thoughtfully crafted itineraries give you time to actually experience each place, not just photograph it." },
    { n: "03", t: "Hidden trails & local experiences.", d: "We seek the stories behind the destinations. Local guides, family-run stays, and experiences that most travellers never discover." },
    { n: "04", t: "Stress-free, start to finish.", d: "Visa support, on-ground logistics, dietary planning — everything handled. Your only job is to show up and enjoy the journey." },
  ];
  return (
    <section className="philosophy reveal">
      <div className="container">
        <div className="philosophy-grid">
          <div>
            <div className="eyebrow">How we travel</div>
            <p className="philosophy-text" style={{ marginTop: 24 }}>
              Most travel companies sell <em>destinations.</em> We design the experiences in between — the local cook, the hidden trail, the morning nobody schedules.
            </p>
          </div>
          <div className="philosophy-cards">
            {items.map(it => (
              <div className="philosophy-card" key={it.n}>
                <div className="head">
                  <span className="num">{it.n}</span>
                  <h4>{it.t}</h4>
                </div>
                <p>{it.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
