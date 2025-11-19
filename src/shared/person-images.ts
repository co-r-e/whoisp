import type { Locale } from "./deep-research-types";

export type AppLocale = Locale;

export type PersonImage = {
  id: string;
  title: string;
  thumbnailUrl: string;
  fullSizeUrl: string;
  sourcePage: string;
  attribution?: string;
};

export type PersonImageResponse = {
  images: PersonImage[];
};
