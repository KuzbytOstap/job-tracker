// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FitMismatchChip } from "@/components/applications/fit-mismatch-chip";

afterEach(() => {
  cleanup();
});

describe("FitMismatchChip", () => {
  it.each([null, undefined, 0])("renders nothing for %s", (count) => {
    const { container } = render(<FitMismatchChip count={count} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the count with an accessible name that is not tied to colour", () => {
    const { container } = render(<FitMismatchChip count={3} />);

    expect(container).toHaveTextContent("3");
    expect(screen.getByText("3 mismatches")).toHaveClass("sr-only");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("uses the singular form for one mismatch", () => {
    render(<FitMismatchChip count={1} />);

    expect(screen.getByText("1 mismatch")).toBeInTheDocument();
  });
});
