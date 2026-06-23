// Fix: Add React import for JSX support
import React from 'react';

export const APP_TITLE = "Bóc Băng";

export const SUPPORTED_AUDIO_TYPES: string[] = [
  'audio/mpeg', // .mp3
  'audio/wav',  // .wav
  'audio/mp4',  // .m4a (often this MIME type)
  'audio/x-m4a', // .m4a (sometimes this MIME type)
];

export const MAX_FILE_SIZE_MB = 100; // Maximum file size in MB

export const GEMINI_MODEL_NAME = 'gemini-3.5-flash';

export const LOCAL_STORAGE_HISTORY_KEY = 'bocBangHistory';

// SVG Icons

export const AppLogoIcon = (props: React.SVGProps<SVGSVGElement>) => (
    React.createElement('svg', {
      ...props,
      viewBox: "0 0 180 50",
      xmlns: "http://www.w3.org/2000/svg",
    },
      React.createElement('g', { transform: "translate(0, 5) scale(1)" },
        React.createElement('path', {
          d: "M0 0 H40 V40 H0 Z",
          fill: "#101820" // Rich Black
        }),
        React.createElement('path', {
          d: "M20 0 H40 V20 L20 0 Z",
          fill: "#FEE715" // Vivid Yellow
        }),
        React.createElement('path', {
          d: "M20 0 L40 20",
          stroke: "rgba(0,0,0,0.2)",
          strokeWidth: "1.5"
        })
      ),
      React.createElement('text', {
        x: "55",
        y: "33",
        fontFamily: "Montserrat, sans-serif",
        fontSize: "24",
        fontWeight: "bold",
        fill: "#101820", // Rich Black
      }, "Bóc Băng")
    )
);


export const UploadIcon = (props: React.SVGProps<SVGSVGElement>) => (
  React.createElement('svg', {
    xmlns: "http://www.w3.org/2000/svg",
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: 1.5,
    stroke: "currentColor",
    ...props
  },
    React.createElement('path', {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
    })
  )
);

export const TranscribeIcon = (props: React.SVGProps<SVGSVGElement>) => (
 React.createElement('svg', {
  xmlns: "http://www.w3.org/2000/svg",
  fill: "none",
  viewBox: "0 0 24 24",
  strokeWidth: 1.5,
  stroke: "currentColor",
  ...props
 },
  React.createElement('path', {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
  })
 )
);

export const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => (
  React.createElement('svg', {
    xmlns: "http://www.w3.org/2000/svg",
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: 1.5,
    stroke: "currentColor",
    ...props
  },
    React.createElement('path', {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    })
  )
);

export const CopyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  React.createElement('svg', {
    xmlns: "http://www.w3.org/2000/svg",
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: 1.5,
    stroke: "currentColor",
    ...props
  },
    React.createElement('path', {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 4.625v2.625m-7.5-2.625v2.625m0-2.625H12m-6.75-4.625h6.75"
    })
  )
);

export const HistoryViewIcon = (props: React.SVGProps<SVGSVGElement>) => (
 React.createElement('svg', {
  xmlns: "http://www.w3.org/2000/svg",
  fill: "none",
  viewBox: "0 0 24 24",
  strokeWidth: 1.5,
  stroke: "currentColor",
  ...props
 },
  React.createElement('path', {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
  }),
  React.createElement('path', {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z"
  })
 )
);

export const HistoryDeleteIcon = (props: React.SVGProps<SVGSVGElement>) => (
  React.createElement('svg', {
    xmlns: "http://www.w3.org/2000/svg",
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: 1.5,
    stroke: "currentColor",
    ...props
  },
    React.createElement('path', {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c.342.052.682.107 1.022.166m0 0l-.346 9m4.788 0l-.224-1.332m-4.348 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c.342.052.682.107 1.022.166"
    })
  )
);

export const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => (
  React.createElement('svg', {
    xmlns: "http://www.w3.org/2000/svg",
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: 1.5,
    stroke: "currentColor",
    ...props
  },
    React.createElement('path', {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 7.5l.813 2.846a4.5 4.5 0 003.09 3.09L25.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09L18.25 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L11.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L18.25 7.5z"
    })
  )
);

export const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  React.createElement('svg', {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 48 48",
    ...props
  },
    React.createElement('path', { fill: "#FFC107", d: "M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" }),
    React.createElement('path', { fill: "#FF3D00", d: "M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" }),
    React.createElement('path', { fill: "#4CAF50", d: "M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" }),
    React.createElement('path', { fill: "#1976D2", d: "M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.089,5.571l6.19,5.238C42.012,35.846,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z" })
  )
);

export const UserCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    React.createElement('svg', {
      xmlns: "http://www.w3.org/2000/svg",
      fill: "none",
      viewBox: "0 0 24 24",
      strokeWidth: 1.5,
      stroke: "currentColor",
      ...props
    },
      React.createElement('path', {
        strokeLinecap: "round",
        strokeLinejoin: "round",
        d: "M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
      })
    )
);

export const LogoutIcon = (props: React.SVGProps<SVGSVGElement>) => (
    React.createElement('svg', {
      xmlns: "http://www.w3.org/2000/svg",
      fill: "none",
      viewBox: "0 0 24 24",
      strokeWidth: 1.5,
      stroke: "currentColor",
      ...props
    },
    React.createElement('path', {
        strokeLinecap: "round",
        strokeLinejoin: "round",
        d: "M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
    })
    )
);