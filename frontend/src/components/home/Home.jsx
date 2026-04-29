import React, { useEffect, useState } from 'react';
import Spinner from '../common/Spinner';
import './Home.scss';

const API = '/api/home-config';

const Home = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(0);
  const [thumbLoaded, setThumbLoaded] = useState([false, false, false]);
  const [cardLoadedByIndex, setCardLoadedByIndex] = useState({});

  useEffect(() => {
    let cancelled = false;
    fetch(API)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setThumbLoaded([false, false, false]);
          setCardLoadedByIndex({});
        }
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
        <div className="home-page__loading">
          <Spinner size="large" text="Chargement de la page d'accueil..." />
        </div>
      </div>
    );
  }

  const cat = data.categories[selected];
  const isCardLoaded = !!cardLoadedByIndex[selected];

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
              {!thumbLoaded[i] ? (
                <span className="home-page__image-loader home-page__image-loader--thumb">
                  <Spinner size="small" text="" />
                </span>
              ) : null}
              <img
                className={`home-page__cat-thumb ${thumbLoaded[i] ? 'home-page__cat-thumb--visible' : ''}`}
                src={c.imageUrl}
                alt=""
                onLoad={() => {
                  setThumbLoaded((prev) => {
                    if (prev[i]) return prev;
                    const next = [...prev];
                    next[i] = true;
                    return next;
                  });
                }}
                onError={() => {
                  setThumbLoaded((prev) => {
                    if (prev[i]) return prev;
                    const next = [...prev];
                    next[i] = true;
                    return next;
                  });
                }}
              />
              {selected === i ? <span className="home-page__cat-check">✓</span> : null}
            </span>
            <span className="home-page__cat-label">{c.label}</span>
          </button>
        ))}
      </div>

      <article className="home-page__card">
        <div className="home-page__card-header">{cat.label}</div>
        <div className="home-page__card-media-wrap">
          {!isCardLoaded ? (
            <div className="home-page__image-loader home-page__image-loader--card">
              <Spinner size="medium" text="Chargement de l'image..." />
            </div>
          ) : null}
          <img
            className={`home-page__card-img ${isCardLoaded ? 'home-page__card-img--visible' : ''}`}
            src={cat.imageUrl}
            alt={cat.label}
            onLoad={() => {
              setCardLoadedByIndex((prev) => ({ ...prev, [selected]: true }));
            }}
            onError={() => {
              setCardLoadedByIndex((prev) => ({ ...prev, [selected]: true }));
            }}
          />
        </div>
      </article>
    </div>
  );
};

export default Home;
