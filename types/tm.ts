export interface TmImageModule {
  load: (
    modelURL: string,
    metadataURL: string
  ) => Promise<{
    predict: (element: HTMLVideoElement) => Promise<
      Array<{ className: string; probability: number }>
    >;
  }>;
}
