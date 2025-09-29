export type AppLocale = "en" | "ja";

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
