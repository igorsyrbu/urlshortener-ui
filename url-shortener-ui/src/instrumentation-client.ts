export {};

// Not awaited: a top-level await makes this an async module, and that wrapper would ship to every production route
// even though the branch below is removed there.
if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_ENABLE_REACT_SCAN === "true") {
    void import("react-scan").then(({scan}) => {
        // The app's CSP blocks blob workers; draw the development overlay on the main thread instead.
        scan({enabled: true, useOffscreenCanvasWorker: false});
    });
}
