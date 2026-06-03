declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

interface Window {
  electronAPI?: {
    resizeToImage: (contentW: number, contentH: number) => void;
    resetWindow: () => void;
  };
}
