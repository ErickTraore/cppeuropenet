// File: presse/PresseList.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMessages } from "../../actions/messageActions";
import { getPresseGeneraleMediaApiBase, absolutizePresseGeneraleMediaUrl, getPresseGeneraleAssetOrigin } from "../../utils/presseGeneraleMedia";
import PresseTextOnly from "./types/PresseTextOnly";
import PresseImageOnly from "./types/PresseImageOnly";
import PresseVideoOnly from "./types/PresseVideoOnly";
import PresseImageVideo from "./types/PresseImageVideo";
import "../../styles/pages/MessagesList.scss";

const PRESSE_MEDIA_BASE = getPresseGeneraleMediaApiBase().replace(/\/$/, "");
const BASE_URL = getPresseGeneraleAssetOrigin();
const MEDIA_BACKEND_URL = `${PRESSE_MEDIA_BASE}/getMedia`;

/** Normalise les chemins médias (getMedia renvoie des paths relatifs /api/uploads/…). */
function mapPresseMediaPaths(mediaList) {
  return (Array.isArray(mediaList) ? mediaList : []).map((f) => ({
    ...f,
    path: absolutizePresseGeneraleMediaUrl(f.url || f.path),
  }));
}

const getPresseViewType = (p) => {
  const hasImage = Array.isArray(p.media) && p.media.some(m => (m.type || "").toLowerCase().includes("image"));
  const hasVideo = Array.isArray(p.media) && p.media.some(m => (m.type || "").toLowerCase().includes("video"));

  if (!hasImage && !hasVideo) return "text-only";
  if (hasImage && !hasVideo) return "image-only";
  if (!hasImage && hasVideo) return "video-only";
  if (hasImage && hasVideo) return "image-and-video";
  return "unknown";
};

export default function PresseList() {
  const dispatch = useDispatch();
  const presses = useSelector((s) => s.messages.messages);
  const [localPresses, setLocalPresses] = useState([]);

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

  useEffect(() => { dispatch(fetchMessages('presse')); }, [dispatch]);

  useEffect(() => {
    let cancelled = false;
    if (!Array.isArray(presses) || presses.length === 0) {
      setLocalPresses([]);
      return;
    }
    const valid = presses.filter((p) => p && p.id);
    if (valid.length === 0) return;

    const load = async () => {
      const enriched = await Promise.all(
        valid.map(async (p) => {
          // Médias déjà présents côté API : évite un second getMedia.
          // Si `media` est absent ou [] : enrichir depuis le navigateur (même origine → proxy → mediaGle).
          // (L’enrichissement serveur peut renvoyer [] si le backend presse n’atteint pas mediaGle, ex. localhost:7004 depuis Docker.)
          if (Array.isArray(p.media) && p.media.length > 0) {
            return { ...p, media: mapPresseMediaPaths(p.media) };
          }

          try {
            const res = await fetch(`${MEDIA_BACKEND_URL}/${p.id}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
            });
            if (!res.ok) return { ...p, media: [] };
            const data = await res.json();
            const normalized = mapPresseMediaPaths(data);

            return { ...p, media: normalized };
          } catch {
            return { ...p, media: [] };
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

  const displayPresses = useMemo(() => {
    const src = localPresses.length > 0 ? localPresses : presses;
    if (!Array.isArray(src)) return [];
    return src.map((p) => ({
      ...p,
      media: Array.isArray(p.media) ? p.media : [],
    }));
  }, [localPresses, presses]);

  return (
    <div className="presse">
      <div className="presse__container">
        <div className="presse__container__title">📝 Presse PPA-CI</div>

        <div className="presse__container__messagelist">
          {!Array.isArray(presses) ? (
            <p className="presse__container__messagelist__error">⚠️ Erreur : données non disponibles.</p>
          ) : presses.length === 0 ? (
            <div className="presse__container__messagelist__empty">
              <h3 className="presse__container__messagelist__empty__nothing">📭 Aucun message</h3>
              <p className="presse__container__messagelist__empty__add">Connectez-vous pour publier le premier message.</p>
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
