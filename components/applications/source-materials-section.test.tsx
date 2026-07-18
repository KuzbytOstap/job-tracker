// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourceMaterialsSection } from "@/components/applications/source-materials-section";

afterEach(() => {
  cleanup();
});

describe("SourceMaterialsSection", () => {
  it("renders nothing when both source texts are null", () => {
    const { container } = render(<SourceMaterialsSection jobPostingText={null} coverLetterText={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows only the job posting item when only a posting is stored", () => {
    render(<SourceMaterialsSection jobPostingText="Some posting" coverLetterText={null} />);

    expect(screen.getByText("Source materials")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /job posting/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cover letter/i })).not.toBeInTheDocument();
  });

  it("renders plain text safely rather than interpreting HTML or markdown", async () => {
    const user = userEvent.setup();
    const htmlLikeText = "<script>alert('x')</script>\n**bold** _italic_";
    const { container } = render(<SourceMaterialsSection jobPostingText={htmlLikeText} coverLetterText={null} />);

    await user.click(screen.getByRole("button", { name: /job posting/i }));

    const paragraph = container.querySelector("p");
    expect(paragraph?.textContent).toBe(htmlLikeText);
    expect(container.querySelector("script")).not.toBeInTheDocument();
  });

  it("shows both items when both source texts are stored", () => {
    render(<SourceMaterialsSection jobPostingText="Posting" coverLetterText="Cover letter" />);

    expect(screen.getByRole("button", { name: /job posting/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cover letter/i })).toBeInTheDocument();
  });
});
