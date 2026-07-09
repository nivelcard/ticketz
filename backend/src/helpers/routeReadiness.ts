let heavyRoutesReady = false;
let heavyRoutesError: string | null = null;

export const markHeavyRoutesReady = (): void => {
  heavyRoutesReady = true;
  heavyRoutesError = null;
};

export const markHeavyRoutesFailed = (error: unknown): void => {
  heavyRoutesReady = false;
  heavyRoutesError =
    error instanceof Error ? error.message : String(error ?? "unknown");
};

export const getHeavyRoutesState = (): {
  heavyRoutesReady: boolean;
  heavyRoutesError: string | null;
} => ({
  heavyRoutesReady,
  heavyRoutesError
});
