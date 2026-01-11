import { useEffect, useRef } from "react";

interface SeoProps {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage?: string;
}

const DEFAULT_OG_IMAGE = "https://payodsoft.co.uk/og-default.png";
const SITE_NAME = "MyBizStream";

export function Seo({ title, description, canonicalUrl, ogImage = DEFAULT_OG_IMAGE }: SeoProps) {
  const createdElements = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const elementsToRemove: HTMLElement[] = [];

    const setMeta = (name: string, content: string, property?: boolean) => {
      const attr = property ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      const wasCreated = !el;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
      if (wasCreated) {
        elementsToRemove.push(el);
      }
    };

    const setLink = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      const wasCreated = !el;
      if (!el) {
        el = document.createElement("link");
        el.rel = rel;
        document.head.appendChild(el);
      }
      el.href = href;
      if (wasCreated) {
        elementsToRemove.push(el);
      }
    };

    setMeta("description", description);

    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:url", canonicalUrl, true);
    setMeta("og:type", "website", true);
    setMeta("og:site_name", SITE_NAME, true);
    setMeta("og:image", ogImage, true);

    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", ogImage);

    setLink("canonical", canonicalUrl);

    createdElements.current = elementsToRemove;

    return () => {
      document.title = previousTitle || SITE_NAME;
      createdElements.current.forEach((el) => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
      createdElements.current = [];
    };
  }, [title, description, canonicalUrl, ogImage]);

  return null;
}
