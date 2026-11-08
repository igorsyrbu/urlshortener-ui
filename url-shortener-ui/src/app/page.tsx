import {LandingEntryPoints} from "@/components/landing/LandingEntryPoints";
import {LandingFeatures} from "@/components/landing/LandingFeatures";
import {LandingFooter} from "@/components/landing/LandingFooter";
import {LandingHeader} from "@/components/landing/LandingHeader";
import {LandingHero} from "@/components/landing/LandingHero";

/** Development landing page: the public entry points of the app, with placeholder copy only. */
export default function Home() {
    return (
        <div className="flex min-h-dvh flex-col bg-background">
            <LandingHeader/>
            <main className="flex-1">
                <LandingHero/>
                <LandingFeatures/>
                <LandingEntryPoints/>
            </main>
            <LandingFooter/>
        </div>
    );
}
