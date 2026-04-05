import React, { useEffect, useState } from 'react';
import './Home.scss';

const API = '/api/home-config';

const Home = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(API)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Chargement impossible');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="home-page">
        <p className="home-page__error" role="alert">
          Impossible de charger la page d&apos;accueil ({error}). Vérifiez que le service home-config-backend
          tourne (port 7020) et le proxy /api/home-config.
        </p>
      </div>
    );
  }

  if (!data || !Array.isArray(data.categories) || data.categories.length !== 3) {
    return (
      <div className="home-page">
        <p className="home-page__loading">Chargement…</p>
      </div>
    );
  }

  const cat = data.categories[selected];

  return (
    <div className="home-page">
      <header className="home-page__hero">
        <p>{data.heroText}</p>
      </header>

      <div className="home-page__categories" role="tablist" aria-label="Thèmes">
        {data.categories.map((c, i) => (
          <button
            key={c.label + i}
            type="button"
            role="tab"
            aria-selected={selected === i}
            className={`home-page__cat-btn ${selected === i ? 'home-page__cat-btn--active' : ''}`}
            onClick={() => setSelected(i)}
          >
            <span className="home-page__cat-thumb-wrap">
              <img className="home-page__cat-thumb" src={c.imageUrl} alt="" />
              {selected === i ? <span className="home-page__cat-check">✓</span> : null}
            </span>
            <span className="home-page__cat-label">{c.label}</span>
          </button>
        ))}
      </div>

      <article className="home-page__card">
        <div className="home-page__card-header">{cat.label}</div>
        <img className="home-page__card-img" src={cat.imageUrl} alt={cat.label} />
      </article>
    </div>
  );
};

export default Home;
