// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ApplicationLinksSection } from "@/components/applications/application-links-section";

afterEach(() => {
  cleanup();
});

describe("ApplicationLinksSection", () => {
  it("renders nothing when there are no URLs", () => {
    const { container } = render(<ApplicationLinksSection urls={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a labeled, clickable link for each URL", () => {
    render(
      <ApplicationLinksSection
        urls={["https://jobs.dou.ua/companies/acme/vacancies/1/", "https://example.com/apply"]}
      />,
    );

    expect(screen.getByText("Links")).toBeInTheDocument();

    const douLink = screen.getByRole("link", { name: /DOU/ });
    expect(douLink).toHaveAttribute("href", "https://jobs.dou.ua/companies/acme/vacancies/1/");
    expect(douLink).toHaveAttribute("target", "_blank");
    expect(douLink).toHaveAttribute("rel", "noopener noreferrer");

    const exampleLink = screen.getByRole("link", { name: /example.com/ });
    expect(exampleLink).toHaveAttribute("href", "https://example.com/apply");
  });
});
