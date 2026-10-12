import {useEffect, type ReactElement} from "react";

export interface TurnstileCallbacks {
    siteKey: string;
    onSuccess?: (token: string) => void;
    onError?: (errorCode: string) => void;
    onExpire?: () => void;
}

const registry: {latestProps: TurnstileCallbacks | null} = {latestProps: null};

function FakeTurnstile(props: TurnstileCallbacks): ReactElement {
    useEffect(() => {
        registry.latestProps = props;
    });
    return <div data-testid="turnstile-widget"/>;
}

export const turnstileModuleMock = {Turnstile: FakeTurnstile};

export function getTurnstileProps(): TurnstileCallbacks {
    if (!registry.latestProps) throw new Error("Turnstile widget was not rendered");
    return registry.latestProps;
}

export function resetTurnstileMock(): void {
    registry.latestProps = null;
}
