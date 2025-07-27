import type { MicroCMSDate, MicroCMSImage } from "microcms-js-sdk";

export type Category = {
  id: string;
  name: string;
} & MicroCMSDate;

export type Tag = {
  id: string;
  name: string;
} & MicroCMSDate;

export type BlogPost = {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  eyecatch?: MicroCMSImage;
  category?: Category;
  tags?: Tag[];
} & MicroCMSDate;
