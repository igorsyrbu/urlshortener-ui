export {};

if (process.env.NODE_ENV === "development") {
    const {scan} = await import("react-scan");
    // The app's CSP blocks blob workers; draw the development overlay on the main thread instead.
    scan({enabled: true, useOffscreenCanvasWorker: false});
}
