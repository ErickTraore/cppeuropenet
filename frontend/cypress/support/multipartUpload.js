/**
 * Corps multipart/form-data (Node buffer) pour cy.request, sans dépendance npm.
 */
function buildMultipartFileField(boundary, fieldName, fileName, mimeType, fileBuffer, extraFields) {
  const parts = [];
  const fields = extraFields || {};
  Object.entries(fields).forEach(([k, v]) => {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${String(v)}\r\n`
      )
    );
  });
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    )
  );
  parts.push(fileBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  return Buffer.concat(parts);
}

module.exports = { buildMultipartFileField };
