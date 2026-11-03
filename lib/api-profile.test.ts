import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  createContextItem,
  deleteCv,
  getProfile,
  replaceCvFile,
  updateProfile,
  uploadCv,
} from "@/lib/api";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("uploadCv and replaceCvFile", () => {
  it("send the form data without a JSON content type so the browser sets the multipart boundary", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ cv: { id: "cv_1" } }, 201));
    const formData = new FormData();
    formData.set("label", "RN");

    await uploadCv(formData);

    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe("/api/profile/cvs");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(formData);
    expect(init.headers).toBeUndefined();
  });

  it("replaceCvFile PUTs to the CV's file endpoint", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ cv: { id: "cv_1" } }));
    const formData = new FormData();

    await replaceCvFile("cv_1", formData);

    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe("/api/profile/cvs/cv_1/file");
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(formData);
  });

  it("throws an ApiError carrying the status, message and error code from the server", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: "The file is too large.", details: { code: "CV_TOO_LARGE" } }, 413),
    );

    const error = await uploadCv(new FormData()).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(413);
    expect((error as ApiError).message).toBe("The file is too large.");
    expect((error as ApiError).details).toEqual({ code: "CV_TOO_LARGE" });
  });

  it("falls back to the status text when the error body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>", { status: 502, statusText: "Bad Gateway" }));

    const error = await uploadCv(new FormData()).catch((caught: unknown) => caught);

    expect((error as ApiError).status).toBe(502);
    expect((error as ApiError).message).toBe("Bad Gateway");
  });
});

describe("deleteCv", () => {
  it("resolves for an empty 204 response without trying to parse JSON", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(deleteCv("cv_1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("/api/profile/cvs/cv_1", { method: "DELETE" });
  });

  it("throws an ApiError for a 404", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "CV not found" }, 404));

    await expect(deleteCv("cv_1")).rejects.toMatchObject({ status: 404, message: "CV not found" });
  });
});

describe("JSON profile endpoints", () => {
  it("getProfile reads /api/profile", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ firstName: "Ada" }));

    await expect(getProfile()).resolves.toEqual({ firstName: "Ada" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/profile");
  });

  it("updateProfile PATCHes the payload as JSON", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ firstName: "Ada" }));

    await updateProfile({ firstName: "Ada", address: { city: "Lviv" } });

    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe("/api/profile");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ firstName: "Ada", address: { city: "Lviv" } });
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("createContextItem POSTs only the text", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ item: { id: "i1" }, scoring: { scored: 0, remaining: 0, skipped: null } }));

    await createContextItem("Shipped passkeys");

    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe("/api/profile/context-items");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ text: "Shipped passkeys" });
  });
});
