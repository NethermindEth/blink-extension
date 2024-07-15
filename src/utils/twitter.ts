export const resolveTwitterShortenedUrl = async (
  shortenedUrl: string
): Promise<URL> => {
  const res = await fetch(shortenedUrl);
  const html = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const actionUrl = doc.querySelector("title")?.textContent;
  return new URL(actionUrl!);
};

export const findElementByTestId = (element: Element, testId: string) => {
  if (element.attributes.getNamedItem("data-testid")?.value === testId) {
    return element;
  }
  return element.querySelector(`[data-testid="${testId}"]`);
};
