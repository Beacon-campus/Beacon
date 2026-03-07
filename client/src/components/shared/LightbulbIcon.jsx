import React from "react";

const LightbulbIcon = ({ isSeen }) => {
  return (
    <svg 
      width="14" 
      height="14" 
      viewBox="0 0 512 512" 
      // User requested: Fill based on isSeen
      // But the SVG provided has fill="rgb(0,0,0)" and fill="rgb(254,254,254)" and fill="white"
      // I should override the fill or use currentColor and set color via class.
      // The user code snippet: fill={isSeen ? "#EAB308" : "#9CA3AF"}
      // To make the PATHS take this color, I should likely remove the 'fill' attributes from the paths 
      // or set them to 'currentColor' and put the color on the SVG.
      // However, the provided SVG is complex with multiple paths.
      // Let's try to preserve the user's intent: Use the provided path.
      // The user paste has <path ... fill="rgb(0,0,0)"/> and others.
      // I will remove explicit fills from paths and put fill on the SVG, 
      // or assume the user wants the whole icon to be that color.
      // Given the simple requirement "Yellow if seen, Grey if just delivered", 
      // I will assume a monochrome icon behavior.
      // White if delivered (on black bubble), Yellow if seen
      fill={isSeen ? "#EAB308" : "#FFFFFF"} 
      stroke={isSeen ? "none" : "#9CA3AF"} 
      strokeWidth={isSeen ? "0" : "32"}
      className="transition-all duration-300"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        <path d="M 318.51 386.93 L 317.81 392.00 L 256.57 392.00 C222.89,392.00 195.03,391.70 194.67,391.33 C194.30,390.97 194.00,389.46 194.00,387.99 C194.00,383.88 190.47,374.54 187.03,369.54 C185.33,367.07 180.24,361.95 175.72,358.17 C158.54,343.78 146.72,329.38 138.26,312.49 C108.52,253.16 127.67,181.29 183.04,144.43 C198.07,134.42 213.15,128.11 231.00,124.35 C243.92,121.64 270.07,121.90 284.00,124.89 C344.94,137.95 387.99,191.20 387.99,253.50 C387.99,289.65 374.81,321.58 349.61,346.50 C344.05,352.00 336.49,359.09 332.82,362.25 C325.20,368.81 319.70,378.30 318.51,386.93 ZM 270.54 478.48 C263.13,480.37 249.29,480.34 242.00,478.42 C215.87,471.56 195.09,446.27 195.01,421.25 L 195.00 416.00 L 318.29 416.00 L 317.67 423.32 C315.46,449.51 296.30,471.94 270.54,478.48 ZM 482.90 264.92 C479.90,266.75 477.96,266.99 466.50,266.93 C452.85,266.87 449.99,266.27 446.16,262.69 C440.62,257.52 439.49,250.55 443.27,244.90 C447.20,239.01 450.62,238.00 466.60,238.00 C479.58,238.00 480.97,238.18 484.10,240.26 C488.85,243.42 491.39,248.95 490.56,254.30 C489.81,259.11 487.75,261.96 482.90,264.92 ZM 62.33 265.64 C60.13,266.56 54.91,266.99 46.28,266.96 C31.81,266.91 27.56,265.53 23.90,259.70 C21.10,255.24 21.69,247.03 25.08,243.40 C29.58,238.58 31.91,238.00 46.70,238.00 C63.38,238.00 66.27,239.02 69.81,246.16 C71.58,249.72 71.96,251.68 71.44,254.48 C70.59,259.01 66.65,263.83 62.33,265.64 ZM 121.38 124.61 C113.73,127.81 108.19,125.15 95.90,112.39 C87.16,103.32 85.11,98.92 86.87,93.02 C89.11,85.57 95.87,81.46 103.78,82.74 C106.74,83.22 109.51,85.32 117.70,93.29 C128.51,103.80 130.67,107.48 129.67,113.62 C128.92,118.25 125.39,122.94 121.38,124.61 ZM 263.91 65.21 C258.37,69.35 251.22,68.13 245.50,62.06 L 242.50 58.87 L 242.22 43.69 C241.96,29.89 242.12,28.20 243.96,25.24 C250.09,15.36 264.04,15.79 269.29,26.02 C270.80,28.97 271.03,31.65 270.79,43.68 C270.48,58.97 269.91,60.74 263.91,65.21 Z" />
      </g>
    </svg>
  );
};


export default LightbulbIcon;
