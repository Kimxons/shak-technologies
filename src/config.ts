export type Site = {
  website: string;
  author: string;
  desc: string;
  title: string;
  ogImage: string;
  lightAndDarkMode: boolean;
  postPerPage: number;
  scheduledPostMargin: number;
};

export type SocialObjects = {
  name: "GitHub" | "LinkedIn" | "X" | "Mail" | "YouTube" | "Skype";
  href: string;
  linkTitle: string;
  active: boolean;
}[];

export const SITE: Site = {
  website: "https://kitonga-meshack.vercel.app/",
  author: "Shak Technologies Ltd",
  desc: "Official website of Shak Technologies Ltd: courses, consultancy, and practical AI engineering insights.",
  title: "Shak Technologies Ltd",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerPage: 5,
  scheduledPostMargin: 15 * 60 * 1000,
};

export const LOCALE = {
  lang: "en",
  langTag: ["en-EN"],
} as const;

export const LOGO_IMAGE = {
  enable: false,
  svg: true,
  width: 216,
  height: 46,
};

export const SOCIALS: SocialObjects = [
  {
    name: "GitHub",
    href: "https://github.com/kimxons",
    linkTitle: `${SITE.title} on Github`,
    active: true,
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/kimwele-meshack/",
    linkTitle: `${SITE.title} on LinkedIn`,
    active: true,
  },
  {
    name: "Mail",
    href: "mailto:kitongameshack9@gmail.com",
    linkTitle: `Send an email to ${SITE.title}`,
    active: true,
  },
  {
    name: "X",
    href: "https://twitter.com/k_kitonga_",
    linkTitle: `${SITE.title} on X`,
    active: true,
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/@TechHowTo_with_Kimxons",
    linkTitle: `${SITE.title} on YouTube`,
    active: false,
  },
  {
    name: "Skype",
    href: "live:kimwelemeshack01",
    linkTitle: `${SITE.title} on Skype`,
    active: false,
  },
];

export const CONSULT_BOOKING_LINKS = {
  secret: "https://cal.com/kitonga-meshack/secret",
  quick15: "https://cal.com/kitonga-meshack/15min",
  strategy30: "https://cal.com/kitonga-meshack/30min",
} as const;
