import React, { useEffect, useLayoutEffect, useState, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPresseLocale } from "../../actions/presseLocaleActions";
import { resolveApiUrl } from "../../utils/apiUrls";
import {
  getPresseLocaleMediaApiRoot,
  getPresseLocaleMediaOrigin,
  absolutizePresseLocaleMediaPath,
} from "../../utils/presseLocaleApi";
import PresseTextOnly from "../presseView/types/PresseTextOnly";
import PresseImageOnly from "../presseView/types/PresseImageOnly";
import PresseVideoOnly from "../presseView/types/PresseVideoOnly";
import PresseImageVideo from "../presseView/types/PresseImageVideo";
import "../../styles/pages/MessagesList.scss";

const getPresseViewType = (p) => {
  const hasImage = Array.isArray(p.media) && p.media.some(m => (m.type || "").toLowerCase().includes("image"));
  const hasVideo = Array.isArray(p.media) && p.media.some(m => (m.type || "").toLowerCase().includes("video"));

  if (!hasImage && !hasVideo) return "text-only";
  if (hasImage && !hasVideo) return "image-only";
  if (!hasImage && hasVideo) return "video-only";
  if (hasImage && hasVideo) return "image-and-video";
  return "unknown";
};

export default function PresseLocaleList() {
  const dispatch = useDispatch();
  const presses = useSelector((s) => s.presseLocale.filteredMessages);
  const [localPresses, setLocalPresses] = useState([]);

  const BASE_URL = useMemo(
    () =>
      resolveApiUrl(
        process.env.REACT_APP_PRESSE_LOCALE_BASE_URL || process.env.REACT_APP_BASE_URL,
        getPresseLocaleMediaOrigin(),
        'BASE_URL'
      ),
    []
  );

  const [activeId, setActiveId] = useState(null);
  const toggle = (id) => setActiveId(prev => prev === id ? null : id);
  const isActive = (id) => activeId === id;

  const [videoActiveId, setVideoActiveId] = useState(null);
  const toggleVideo = (id) => setVideoActiveId(prev => prev === id ? null : id);
  const isVideoActive = (id) => videoActiveId === id;

  const videoRefs = useRef({});

  const pressesKey = useMemo(() => {
    if (!Array.isArray(presses)) return "";
    return presses.map((p) => p?.id).filter(Boolean).join(",");
  }, [presses]);

  useEffect(() => { dispatch(fetchPresseLocale()); }, [dispatch]);

  /** Évite d’afficher l’ancienne liste enrichie quand les ids Redux changent (sinon médias décalés / cartes obsolètes). */
  useLayoutEffect(() => {
    setLocalPresses([]);
  }, [pressesKey]);

  useEffect(() => {
    let cancelled = false;
    if (!Array.isArray(presses) || presses.length === 0) {
      setLocalPresses([]);
      return;
    }
    const valid = presses.filter((p) => p && p.id);
    if (valid.length === 0) return;

    const load = async () => {
      const mediaRoot = getPresseLocaleMediaApiRoot().replace(/\/$/, "");
      const enriched = await Promise.all(
        valid.map(async (p) => {
          const { media: _ignoreReduxMedia, ...presseSansMedia } = p;
          try {
            const res = await fetch(`${mediaRoot}/getMedia/${p.id}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
            });
            if (!res.ok) return { ...presseSansMedia, media: [] };
            const data = await res.json();
            const raw = Array.isArray(data) ? data : [];
            const normalized = raw
              .filter((f) => f && String(f.messageId) === String(p.id))
              .map((f) => ({
                ...f,
                path: absolutizePresseLocaleMediaPath(f.url || f.path),
              }));

            return { ...presseSansMedia, media: normalized };
          } catch {
            return { ...presseSansMedia, media: [] };
          }
        })
      );
      if (!cancelled) setLocalPresses(enriched);
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- médias rechargés quand pressesKey (ids) change
  }, [pressesKey]);

  /** Ids Redux courants (triés) : on n’affiche le `media` enrichi côté navigateur que si localPresses est aligné. */
  const pressesIdsSorted = useMemo(() => {
    if (!Array.isArray(presses)) return '';
    return presses
      .map((p) => p?.id)
      .filter(Boolean)
      .slice()
      .sort((a, b) => a - b)
      .join(',');
  }, [presses]);

  const localIdsSorted = useMemo(() => {
    if (!Array.isArray(localPresses)) return '';
    return localPresses
      .map((p) => p?.id)
      .filter(Boolean)
      .slice()
      .sort((a, b) => a - b)
      .join(',');
  }, [localPresses]);

  const mediaFromBrowserReady =
    pressesIdsSorted.length > 0 && pressesIdsSorted === localIdsSorted && localPresses.length > 0;

  const displayPresses = useMemo(() => {
    if (!Array.isArray(presses)) return [];
    if (mediaFromBrowserReady) {
      return localPresses.map((p) => ({
        ...p,
        media: Array.isArray(p.media) ? p.media : [],
      }));
    }
    /* Pas encore chargé ou reset : ignorer `media` Redux (souvent enrichi par le serveur avec la mauvaise URL getMedia). */
    return presses.map((p) => {
      const { media: _pollution, ...rest } = p;
      return { ...rest, media: [] };
    });
  }, [localPresses, presses, mediaFromBrowserReady]);

  return (
    <div className="presse">
      <div className="presse__container">
        <div className="presse__container__title">📍 Presse Locale</div>

        <div className="presse__container__messagelist">
          {!Array.isArray(presses) ? (
            <p className="presse__container__messagelist__error">⚠️ Erreur : données non disponibles.</p>
          ) : presses.length === 0 ? (
            <div className="presse__container__messagelist__empty">
              <h3 className="presse__container__messagelist__empty__nothing">📭 Aucune presse locale</h3>
              <p className="presse__container__messagelist__empty__add">Aucun contenu disponible.</p>
            </div>
          ) : (
            displayPresses.map((p) => {
              const type = getPresseViewType(p);

              if (type === "text-only")
                return <PresseTextOnly key={p.id} presse={p} isActive={isActive} toggle={toggle} />;

              if (type === "image-only")
                return <PresseImageOnly key={p.id} presse={p} isActive={isActive} toggle={toggle} BASE_URL={BASE_URL} />;

              if (type === "video-only")
                return (
                  <PresseVideoOnly
                    key={p.id}
                    presse={p}
                    isActive={isActive}
                    toggle={toggle}
                    isVideoActive={isVideoActive}
                    toggleVideo={toggleVideo}
                    BASE_URL={BASE_URL}
                    videoRefs={videoRefs}
                  />
                );

              if (type === "image-and-video")
                return (
                  <PresseImageVideo
                    key={p.id}
                    presse={p}
                    isActive={isActive}
                    toggle={toggle}
                    isVideoActive={isVideoActive}
                    toggleVideo={toggleVideo}
                    BASE_URL={BASE_URL}
                    videoRefs={videoRefs}
                  />
                );

              return (
                <div key={p.id} className="presse__message presse__message--unknown">
                  <p>⚠️ Format non reconnu.</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
