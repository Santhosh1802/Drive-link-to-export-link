import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2,
  Copy,
  Check,
  FileText,
  Presentation,
  Image as ImageIcon,
  Video,
  Music,
  AlertTriangle,
  ExternalLink,
  RotateCcw,
} from "lucide-react";

/**
 * Drive Link Converter + Preview
 * --------------------------------
 * Drop this component into any React app (Vite/CRA).
 * Tailwind required.
 * No backend needed.
 *
 * What it does:
 * - Accepts Google Drive / Docs / Slides / File links
 * - Converts to an exportable / embeddable link depending on selected file type
 * - Shows a preview for verification
 * - Copy-to-clipboard
 *
 * Notes:
 * - For PPT preview, we use Microsoft Office viewer (works best with direct downloadable URLs)
 * - For PDF preview, we use Google Docs Viewer (safe for direct URLs)
 * - For Images/Video/Audio, we use native HTML elements
 */

type FileType = "ppt" | "pdf" | "image" | "video" | "audio";

type ConvertResult = {
  fileId?: string;
  exportUrl?: string;
  embedUrl?: string;
  previewUrl?: string;
  notes?: string[];
  error?: string;
};

const FILE_TYPES: Array<{
  key: FileType;
  label: string;
  icon: React.ReactNode;
  hint: string;
  description: string;
}> = [
  {
    key: "ppt",
    label: "PPT / PPTX",
    icon: <Presentation className="h-4 w-4" />,
    hint: "Uses Microsoft Office viewer",
    description: "PowerPoint Presentation - Slideshow format for presentations",
  },
  {
    key: "pdf",
    label: "PDF",
    icon: <FileText className="h-4 w-4" />,
    hint: "Uses PDF viewer (iframe)",
    description:
      "Portable Document Format - Universal document format for viewing and sharing",
  },
  {
    key: "image",
    label: "Image",
    icon: <ImageIcon className="h-4 w-4" />,
    hint: "Uses <img />",
    description:
      "Image File - Pictures and graphics in various formats (PNG, JPG, GIF, etc.)",
  },
  {
    key: "video",
    label: "Video",
    icon: <Video className="h-4 w-4" />,
    hint: "Uses <video />",
    description:
      "Video File - Motion picture content in formats like MP4, WebM, etc.",
  },
  {
    key: "audio",
    label: "Audio",
    icon: <Music className="h-4 w-4" />,
    hint: "Uses <audio />",
    description:
      "Audio File - Sound content in formats like MP3, WAV, OGG, etc.",
  },
];

function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function extractGoogleFileId(input: string): string | null {
  const url = input.trim();
  if (!url) return null;

  // Common patterns:
  // 1) https://drive.google.com/file/d/<ID>/view?...
  // 2) https://docs.google.com/presentation/d/<ID>/edit?...
  // 3) https://docs.google.com/document/d/<ID>/edit?...
  // 4) https://docs.google.com/spreadsheets/d/<ID>/edit?...
  // 5) https://drive.google.com/open?id=<ID>
  // 6) https://drive.google.com/uc?id=<ID>&export=download

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/presentation\/d\/([a-zA-Z0-9_-]+)/,
    /\/document\/d\/([a-zA-Z0-9_-]+)/,
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/uc\?id=([a-zA-Z0-9_-]+)/,
  ];

  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }

  return null;
}

function isProbablyGoogleLink(input: string) {
  const s = input.trim().toLowerCase();
  return s.includes("drive.google.com") || s.includes("docs.google.com");
}

function buildDriveDirectDownload(fileId: string) {
  // Works for Drive files (when permissions allow public access)
  // For large files, Google may show a warning page; still the standard direct link.
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

function buildDriveDirectView(fileId: string) {
  // Often works for images, sometimes for other media types.
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

function buildSlidesExportPptx(fileId: string) {
  // For Google Slides
  return `https://docs.google.com/presentation/d/${fileId}/export/pptx`;
}

function buildSlidesEmbed(fileId: string) {
  // For Google Slides embed
  return `https://docs.google.com/presentation/d/${fileId}/embed?start=false&loop=false&delayms=3000`;
}

function buildDocsViewer(urlToFile: string) {
  // Google Docs Viewer for direct file URLs
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(urlToFile)}`;
}

function buildMicrosoftOfficeViewer(urlToFile: string) {
  // Microsoft Office online viewer for PPT/PPTX
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(urlToFile)}`;
}

function convertLink(input: string, type: FileType): ConvertResult {
  const raw = input.trim();
  if (!raw) return { error: "Paste a link first." };

  // If not a Google link, we still allow preview using the same strategy.
  // But export conversion will only be done for Google links.
  const google = isProbablyGoogleLink(raw);
  const fileId = google ? extractGoogleFileId(raw) : null;

  // If it is a Google link but fileId couldn't be extracted
  if (google && !fileId) {
    return {
      error:
        "This looks like a Google link, but I couldn't extract the file ID. Please paste a full Drive/Docs link.",
    };
  }

  // If it's not google, treat raw as direct URL.
  if (!google) {
    const direct = raw;

    // Preview strategy
    if (type === "ppt") {
      return {
        exportUrl: direct,
        previewUrl: buildMicrosoftOfficeViewer(direct),
        notes: [
          "This is not a Google Drive link. Using it as-is.",
          "For PPT preview, the URL must be publicly accessible.",
        ],
      };
    }

    if (type === "pdf") {
      return {
        exportUrl: direct,
        previewUrl: buildDocsViewer(direct),
        notes: [
          "This is not a Google Drive link. Using it as-is.",
          "If the PDF doesn't render, ensure the link is public and allows direct access.",
        ],
      };
    }

    // For media
    return {
      exportUrl: direct,
      previewUrl: direct,
      notes: ["This is not a Google Drive link. Using it as-is."],
    };
  }

  // Google link
  const id = fileId!;

  // We generate both a recommended export URL and a preview URL.
  // Different types need different URLs.
  switch (type) {
    case "ppt": {
      // Best for your provided example (Google Slides link)
      const exportUrl = buildSlidesExportPptx(id);

      // Preview:
      // - Option A: Google Slides embed (works for Slides, not for PPTX)
      // - Option B: Microsoft viewer using a direct file URL
      // We'll do:
      // 1) Prefer Slides embed (fast)
      // 2) Provide Microsoft viewer too using exported PPTX link
      const embedUrl = buildSlidesEmbed(id);

      return {
        fileId: id,
        exportUrl,
        embedUrl,
        previewUrl: embedUrl,
        notes: [
          "Export URL downloads as PPTX.",
          "Preview uses Google Slides embed.",
          "If you want PPT-style preview, switch to Microsoft viewer (provided below).",
        ],
      };
    }

    case "pdf": {
      // If it was a Google Slides link, this also works:
      // /export/pdf
      // But user wants generic.
      // For Drive files, we use direct download.
      // For docs/slides links, we can use export/pdf.

      // Heuristic: if it is docs.google.com/presentation
      const lower = raw.toLowerCase();
      let exportUrl = buildDriveDirectDownload(id);

      if (lower.includes("docs.google.com/presentation")) {
        exportUrl = `https://docs.google.com/presentation/d/${id}/export/pdf`;
      } else if (lower.includes("docs.google.com/document")) {
        exportUrl = `https://docs.google.com/document/d/${id}/export?format=pdf`;
      } else if (lower.includes("docs.google.com/spreadsheets")) {
        // Sheets PDF export needs more params; fallback to drive download.
        exportUrl = buildDriveDirectDownload(id);
      }

      return {
        fileId: id,
        exportUrl,
        previewUrl: buildDocsViewer(exportUrl),
        notes: [
          "Preview uses Google Docs Viewer.",
          "Make sure the file is shared publicly (Anyone with the link → Viewer).",
        ],
      };
    }

    case "image": {
      // Most reliable for images stored in Drive
      // If it is a Google Docs/Slides, it won't be an image.
      const exportUrl = buildDriveDirectView(id);
      return {
        fileId: id,
        exportUrl,
        previewUrl: exportUrl,
        notes: [
          "This works best when the Drive file is actually an image.",
          "If it fails, your file may not be an image or it may not be public.",
        ],
      };
    }

    case "video": {
      // Direct download is the most consistent for <video>
      const exportUrl = buildDriveDirectDownload(id);
      return {
        fileId: id,
        exportUrl,
        previewUrl: exportUrl,
        notes: [
          "For Drive videos, direct playback depends on CORS and file permissions.",
          "If it doesn't play, try hosting on a CDN or use a streaming server.",
        ],
      };
    }

    case "audio": {
      const exportUrl = buildDriveDirectDownload(id);
      return {
        fileId: id,
        exportUrl,
        previewUrl: exportUrl,
        notes: [
          "For Drive audio, direct playback depends on permissions and browser support.",
        ],
      };
    }

    default:
      return { error: "Unsupported type." };
  }
}

function Preview({ type, result }: { type: FileType; result: ConvertResult }) {
  if (!result.previewUrl) return null;

  // PPT: iframe (Google Slides embed OR Microsoft viewer)
  if (type === "ppt") {
    return (
      <div className="w-full">
        <div className="aspect-video w-full overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <iframe
            title="PPT Preview"
            src={result.previewUrl}
            className="h-full w-full"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  // PDF: iframe
  if (type === "pdf") {
    return (
      <div className="w-full">
        <div className="h-[70vh] w-full overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <iframe
            title="PDF Preview"
            src={result.previewUrl}
            className="h-full w-full"
          />
        </div>
      </div>
    );
  }

  // Image
  if (type === "image") {
    return (
      <div className="w-full">
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <img
            src={result.previewUrl}
            alt="Preview"
            className="w-full max-h-[70vh] object-contain"
            loading="lazy"
          />
        </div>
      </div>
    );
  }

  // Video
  if (type === "video") {
    return (
      <div className="w-full">
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <video
            src={result.previewUrl}
            className="w-full max-h-[70vh]"
            controls
          />
        </div>
      </div>
    );
  }

  // Audio
  if (type === "audio") {
    return (
      <div className="w-full">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <audio src={result.previewUrl} controls className="w-full" />
        </div>
      </div>
    );
  }

  return null;
}

export default function DriveLinkConverterPage() {
  const [type, setType] = useState<FileType>("ppt");
  const [input, setInput] = useState(
    "https://docs.google.com/presentation/d/1KocQY1Q3rQfZGl8BTNSG8fEqGh-XpUq0/edit?usp=drive_link&ouid=115550835616350388612&rtpof=true&sd=true",
  );
  const [copied, setCopied] = useState(false);
  const [forceMsViewer, setForceMsViewer] = useState(false);

  const result = useMemo(() => {
    const r = convertLink(input, type);

    // Special: if user chooses PPT and toggles Microsoft viewer,
    // use the Microsoft preview URL.
    if (type === "ppt" && forceMsViewer && r.exportUrl) {
      return {
        ...r,
        previewUrl: buildMicrosoftOfficeViewer(r.exportUrl),
        notes: [...(r.notes ?? []), "Microsoft viewer enabled for preview."],
      };
    }

    return r;
  }, [input, type, forceMsViewer]);

  // Reset Microsoft toggle when leaving PPT
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (type !== "ppt") setForceMsViewer(false);
  }, [type]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Fallback
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    }
  }

  function reset() {
    setInput("");
    setCopied(false);
  }

  const outputUrl = result.exportUrl ?? "";

  return (
    <div className="min-h-screen w-full bg-linear-to-b from-slate-50 to-white px-4 py-10 text-slate-900 dark:from-slate-950 dark:to-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm dark:text-slate-950">
              <img src="/favicon.png" className="h-5 w-5"></img>
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Google Drive Link Converter
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Convert Drive/Docs links into exportable URLs + preview before
                you use them.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Main grid */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[420px_1fr]">
          {/* Left panel */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
          >
            {/* File type selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">1) Select file type</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  affects export + preview
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {FILE_TYPES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setType(t.key)}
                    className={classNames(
                      "group flex items-start gap-2 rounded-2xl border px-3 py-3 text-left transition",
                      type === t.key
                        ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950"
                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900",
                    )}
                  >
                    <div
                      className={classNames(
                        "mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl",
                        type === t.key
                          ? "bg-white/15"
                          : "bg-slate-100 dark:bg-slate-900",
                      )}
                    >
                      {t.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold leading-5">
                        {t.label}
                      </div>
                      <div
                        className={classNames(
                          "text-xs",
                          // When a type is selected we previously used `text-white/80`.
                          // In dark mode the selected button background becomes white,
                          // which made the hint text white-on-white and unreadable.
                          // Use a dark-mode specific color for the selected state so
                          // the hint remains visible in both themes.
                          type === t.key
                            ? "text-white/80 dark:text-slate-700"
                            : "text-slate-500 dark:text-slate-400",
                        )}
                      >
                        {t.hint}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {type === "ppt" && (
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <Presentation className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        PPT preview mode
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          Use Microsoft viewer (PPT-like)
                        </div>
                        <button
                          onClick={() => setForceMsViewer((s) => !s)}
                          className={classNames(
                            "relative inline-flex h-7 w-12 items-center rounded-full border transition",
                            forceMsViewer
                              ? "border-slate-900 bg-slate-900 dark:border-white dark:bg-white"
                              : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950",
                          )}
                        >
                          <span
                            className={classNames(
                              "inline-block h-5 w-5 transform rounded-full transition",
                              forceMsViewer
                                ? "translate-x-6 bg-white dark:bg-slate-950"
                                : "translate-x-1 bg-slate-900 dark:bg-white",
                            )}
                          />
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        If your file is a Google Slides link, the default embed
                        is the most reliable.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">2) Paste link</div>
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>

              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-3 text-slate-400">
                  <Link2 className="h-4 w-4" />
                </div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={5}
                  placeholder="Paste a Google Drive/Docs link here..."
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm outline-none ring-0 transition focus:border-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                />
              </div>

              {/* Error */}
              <AnimatePresence>
                {result.error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                    <div className="text-sm">{result.error}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Output */}
            <div className="mt-6 space-y-3">
              <div className="text-sm font-medium">3) Exportable link</div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Output
                    </div>
                    <div className="mt-1 break-all text-sm font-medium">
                      {outputUrl || (
                        <span className="text-slate-400">
                          Exportable link will appear here…
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2">
                    <button
                      onClick={() => outputUrl && copy(outputUrl)}
                      disabled={!outputUrl}
                      className={classNames(
                        "inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition",
                        outputUrl
                          ? "bg-slate-900 text-white hover:opacity-90 dark:bg-white dark:text-slate-950"
                          : "cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                      )}
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy
                        </>
                      )}
                    </button>

                    {outputUrl && (
                      <a
                        href={outputUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open
                      </a>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {!!result.notes?.length && (
                  <div className="mt-3 space-y-1">
                    {result.notes.map((n, i) => (
                      <div
                        key={i}
                        className="text-xs text-slate-600 dark:text-slate-300"
                      >
                        • {n}
                      </div>
                    ))}
                  </div>
                )}

                {/* Extra links for PPT */}
                {type === "ppt" && result.exportUrl && (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      PPT preview alternatives
                    </div>

                    <div className="grid gap-2">
                      <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-950">
                        <div className="font-semibold">Microsoft Viewer</div>
                        <div className="mt-1 break-all text-slate-600 dark:text-slate-300">
                          {buildMicrosoftOfficeViewer(result.exportUrl)}
                        </div>
                      </div>

                      {result.embedUrl && (
                        <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-950">
                          <div className="font-semibold">
                            Google Slides Embed
                          </div>
                          <div className="mt-1 break-all text-slate-600 dark:text-slate-300">
                            {result.embedUrl}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                Tip: your Drive file must be shared as{" "}
                <span className="font-semibold">
                  Anyone with the link → Viewer
                </span>{" "}
                for previews to work.
              </div>
            </div>
          </motion.div>

          {/* Right panel */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Preview</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Verify the converted link works
                </div>
              </div>

              {result.fileId && (
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                  File ID: <span className="font-mono">{result.fileId}</span>
                </div>
              )}
            </div>

            {/* File type description */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {FILE_TYPES.find((t) => t.key === type)?.label}
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {FILE_TYPES.find((t) => t.key === type)?.description}
                  </p>
                </div>

                {result.previewUrl && (
                  <button
                    onClick={() => result.previewUrl && copy(result.previewUrl)}
                    className="ml-3 inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
                    title="Copy preview URL"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Copy URL</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {!result.previewUrl || result.error ? (
              <div className="flex h-[60vh] w-full items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                <div className="max-w-sm">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-900">
                    <Link2 className="h-5 w-5" />
                  </div>
                  <div className="mt-3 text-sm font-semibold">
                    Paste a link to preview
                  </div>
                  <div className="mt-1 text-xs">
                    Choose a file type, paste a link, and the preview will
                    render here.
                  </div>
                </div>
              </div>
            ) : (
              <Preview type={type} result={result} />
            )}

            {/* Small footer */}
            <div className="rounded-3xl border border-slate-200/70 bg-white p-4 text-xs text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                Important
              </div>
              <div className="mt-2 space-y-1">
                <div>
                  • Private Drive files will not preview (permissions required).
                </div>
                <div>
                  • Video/Audio playback from Drive may fail due to CORS.
                </div>
                <div>
                  • For production, prefer storing files on S3/Cloudflare
                  R2/CDN.
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
