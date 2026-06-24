const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  eml: "message/rfc822",
  txt: "text/plain",
};

export const inferPendencyFileType = (file: Pick<File, "name" | "type">): string => {
  const browserType = file.type?.toLowerCase().split(";", 1)[0].trim();
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  const extensionType = MIME_BY_EXTENSION[extension];

  if (extensionType) return extensionType;
  if (browserType && browserType !== "application/octet-stream") return browserType;
  return browserType || "application/octet-stream";
};
