export const getAllowedTypesFromTitle = (title = '') => {
  const normalized = String(title).toUpperCase();
  if (normalized.includes('TITRE+PHOTO+VID')) return { image: true, video: true };
  if (normalized.includes('TITRE+PHOTO')) return { image: true, video: false };
  if (normalized.includes('TITRE+VIDEO') || normalized.includes('TITRE+VID')) {
    return { image: false, video: true };
  }
  if (normalized.includes('TITRE')) return { image: false, video: false };
  return null;
};

export const getAllowedTypesFromFormat = (format = '') => {
  switch (String(format).toLowerCase()) {
    case 'article-thumbnail-video': return { image: true, video: true };
    case 'article-photo': return { image: true, video: false };
    case 'article-video': return { image: false, video: true };
    case 'article': return { image: false, video: false };
    default: return null;
  }
};

export const getManagerMediaNoteKind = (title, mediaList, format = '') => {
  const list = Array.isArray(mediaList) ? mediaList : [];
  if (list.length > 0) return 'replace';

  const expectedByFormat = getAllowedTypesFromFormat(format);
  const expectedByTitle = getAllowedTypesFromTitle(title);
  const expected = expectedByFormat || expectedByTitle;
  const expectsMedia = !!(expected && (expected.image || expected.video));
  return expectsMedia ? 'mismatch' : 'text-only';
};
