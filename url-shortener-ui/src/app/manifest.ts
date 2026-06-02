import type {MetadataRoute} from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Short Links",
        short_name: "Short Links",
        description: "Dashboard for URL Shortener",
        display: "standalone",
        start_url: "/links",
        theme_color: "#d96a47",
        background_color: "#ffffff",
        icons: [
            {
                src: "/favicon.ico",
                sizes: "32x32",
                type: "image/x-icon",
            },
        ],
    };
}
