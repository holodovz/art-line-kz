import { afterEach, describe, expect, it, vi } from "vitest";
import { trackQualifiedLead } from "./analytics";

describe("marketing analytics", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("publishes a qualified lead to dataLayer and custom event", () => {
    const dataLayer: unknown[] = [];
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dataLayer, dispatchEvent });

    trackQualifiedLead({ language: "ru", source: "google", service: "Вывеска" });

    expect(dataLayer).toEqual([{ event: "qualified_lead", language: "ru", source: "google", service: "Вывеска" }]);
    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(dispatchEvent.mock.calls[0][0].detail).toEqual({ event: "qualified_lead", language: "ru", source: "google", service: "Вывеска" });
  });
});
