// ============================================================
// RESPONSIVE AGENT — Detection Rules & Patterns
// ============================================================

/**
 * Each rule has:
 *  - id: unique identifier
 *  - name: human-readable name
 *  - description: what it detects
 *  - severity: "high" | "medium" | "low"
 *  - category: grouping
 *  - pattern: RegExp to detect the issue
 *  - fileTypes: which file extensions to scan
 *  - suggestion: what to do instead
 *  - autoFixable: can we auto-fix this?
 */

export const CSS_RULES = [
  {
    id: "fixed-width-px",
    name: "Fixed Width in Pixels",
    description: "Container elements using fixed pixel widths won't adapt to smaller screens",
    severity: "high",
    category: "layout",
    pattern: /width\s*:\s*(\d{3,})px/g,
    fileTypes: [".css", ".scss", ".less"],
    suggestion: "Use max-width, percentage, or clamp() instead. E.g., max-width: 100%; width: clamp(300px, 80%, 1200px);",
    autoFixable: true,
    fix: (match, value) => {
      const px = parseInt(value);
      if (px >= 1000) return `max-width: ${px}px; width: 100%`;
      if (px >= 500) return `max-width: ${px}px; width: 90%`;
      return `max-width: ${px}px; width: 100%`;
    },
  },
  {
    id: "fixed-height-px",
    name: "Fixed Height in Pixels",
    description: "Fixed heights can cause content overflow on smaller screens",
    severity: "medium",
    category: "layout",
    pattern: /height\s*:\s*(\d{3,})px/g,
    fileTypes: [".css", ".scss", ".less"],
    suggestion: "Use min-height instead of height, or use auto/fit-content",
    autoFixable: true,
    fix: (match, value) => `min-height: ${value}px; height: auto`,
  },
  {
    id: "font-size-px",
    name: "Font Size in Pixels",
    description: "Pixel font sizes don't scale with user preferences or viewport",
    severity: "medium",
    category: "typography",
    pattern: /font-size\s*:\s*(\d+)px/g,
    fileTypes: [".css", ".scss", ".less"],
    suggestion: "Use rem or em units for accessible, scalable typography",
    autoFixable: true,
    fix: (match, value) => {
      const rem = (parseInt(value) / 16).toFixed(3).replace(/\.?0+$/, "");
      return `font-size: ${rem}rem`;
    },
  },
  {
    id: "no-media-queries",
    name: "No Media Queries Found",
    description: "Stylesheet has no responsive breakpoints defined",
    severity: "high",
    category: "responsiveness",
    pattern: null, // special check — absence detection
    fileTypes: [".css", ".scss", ".less"],
    suggestion: "Add media queries for mobile (max-width: 640px), tablet (max-width: 1024px), and desktop",
    autoFixable: false,
  },
  {
    id: "absolute-position",
    name: "Absolute Positioning",
    description: "Absolute positioning can break layouts on different screen sizes",
    severity: "medium",
    category: "layout",
    pattern: /position\s*:\s*absolute/g,
    fileTypes: [".css", ".scss", ".less"],
    suggestion: "Consider using flexbox/grid-based placement, or ensure the parent has position: relative with proper containment",
    autoFixable: false,
  },
  {
    id: "overflow-hidden",
    name: "Overflow Hidden",
    description: "overflow: hidden can clip important content on small screens",
    severity: "low",
    category: "layout",
    pattern: /overflow\s*:\s*hidden/g,
    fileTypes: [".css", ".scss", ".less"],
    suggestion: "Use overflow: auto or overflow-x: auto to allow scrolling when content overflows",
    autoFixable: false,
  },
  {
    id: "fixed-margin-padding",
    name: "Large Fixed Margin/Padding",
    description: "Large fixed margins or paddings won't scale on mobile",
    severity: "low",
    category: "spacing",
    pattern: /(?:margin|padding)(?:-(?:top|bottom|left|right))?\s*:\s*(\d{2,})px/g,
    fileTypes: [".css", ".scss", ".less"],
    suggestion: "Use relative units (rem, em, %) or clamp() for responsive spacing",
    autoFixable: false,
  },
];

export const HTML_RULES = [
  {
    id: "missing-viewport",
    name: "Missing Viewport Meta Tag",
    description: "Without viewport meta, mobile browsers won't scale the page correctly",
    severity: "high",
    category: "meta",
    pattern: null, // absence detection
    fileTypes: [".html"],
    suggestion: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> to <head>',
    autoFixable: true,
  },
  {
    id: "img-no-responsive",
    name: "Non-Responsive Images",
    description: "Images without max-width can overflow their containers",
    severity: "high",
    category: "media",
    pattern: /<img[^>]+(max-width)[^>]+>/g, // Stub so it doesn't hang
    fileTypes: [".html", ".jsx", ".tsx", ".vue"],
    suggestion: "Add max-width: 100%; height: auto; to images, or use CSS class with responsive styles",
    autoFixable: false,
  },
];

export const INLINE_STYLE_RULES = [
  {
    id: "inline-fixed-width",
    name: "Inline Fixed Width",
    description: "Inline styles with fixed pixel widths are not responsive",
    severity: "high",
    category: "layout",
    pattern: /style\s*=\s*\{\{.*?width\s*[:=]\s*['"]?(\d{3,})px['"]?.*?\}\}/g,
    fileTypes: [".jsx", ".tsx", ".vue", ".html"],
    suggestion: "Move to CSS classes with responsive values, or use percentage/viewport units",
    autoFixable: false,
  },
  {
    id: "inline-fixed-height",
    name: "Inline Fixed Height",
    description: "Inline styles with fixed pixel heights are not responsive",
    severity: "medium",
    category: "layout",
    pattern: /style\s*=\s*\{\{.*?height\s*[:=]\s*['"]?(\d{3,})px['"]?.*?\}\}/g,
    fileTypes: [".jsx", ".tsx", ".vue", ".html"],
    suggestion: "Use min-height or CSS classes instead",
    autoFixable: false,
  },
];

export const TAILWIND_RULES = [
  {
    id: "tw-no-responsive-prefix",
    name: "Tailwind: Fixed Width Without Responsive Variant",
    description: "Tailwind width utility used without responsive prefixes (sm:, md:, lg:)",
    severity: "medium",
    category: "tailwind",
    pattern: /w-\[(\d{3,})px\]/g,
    fileTypes: [".jsx", ".tsx", ".vue", ".html"],
    suggestion: "Add responsive variants: w-full md:w-[500px] lg:w-[800px]",
    autoFixable: false,
  },
  {
    id: "tw-hidden-no-responsive",
    name: "Tailwind: Hidden Without Responsive Control",
    description: "Element is always hidden, which may not be the intent on larger screens",
    severity: "low",
    category: "tailwind",
    pattern: /className="[^"]*\s?hidden\s?[^"]*"/g,
    fileTypes: [".jsx", ".tsx"],
    suggestion: "Consider using hidden md:block for responsive show/hide",
    autoFixable: false,
  },
];

export const ALL_RULES = [...CSS_RULES, ...HTML_RULES, ...INLINE_STYLE_RULES, ...TAILWIND_RULES];

export const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };
export const SEVERITY_EMOJI = { high: "🔴", medium: "🟡", low: "🟢" };
