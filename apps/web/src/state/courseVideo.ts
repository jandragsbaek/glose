import { COURSE_VIDEO_PATH } from "@glose/contracts";

export const courseVideoUrl = (id: string, version: string | null = null): string =>
  `${COURSE_VIDEO_PATH}/${encodeURIComponent(id)}${version === null ? "" : `?v=${encodeURIComponent(version)}`}`;

export const uploadCourseVideo = (
  id: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<boolean> =>
  new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open("PUT", `${courseVideoUrl(id)}?name=${encodeURIComponent(file.name)}`);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.floor((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => resolve(request.status >= 200 && request.status < 300));
    request.addEventListener("error", () => resolve(false));
    request.addEventListener("abort", () => resolve(false));
    request.send(file);
  });
