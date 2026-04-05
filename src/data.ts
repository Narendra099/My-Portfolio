export type Project = {
  name: string;
  summary: string;
  stack: string[];
  status: string;
  link: string;
  accent: string;
};

export type ScheduleBlock = {
  day: string;
  window: string;
  focus: string;
};

export const profile = {
  name: "Narendra",
  githubUsername: "Narendra099",
  role: "Product Developer",
  company: "VOZIQ AI",
  location: "Hyderabad",
  intro:
    "I build backend-heavy product experiences, shape low-code workflows, and explore AI ideas that feel useful in the real world.",
  headline:
    "Product developer building low-code platforms, backend systems, and AI-led experiments.",
  about: [
    "At VOZIQ AI, I work on Axelor-based product development across backend Java services, React components, and XML views.",
    "I also have hands-on experience building Django and Flask applications, and I enjoy translating rough ideas into something people can actually use.",
    "Lately I have been spending more time on AI automation, generative models, hosting, and the kind of vibecoding that turns curiosity into shipped work.",
  ],
  interests: [
    "Low-code product systems",
    "Java backend development",
    "React component building",
    "Django and Flask apps",
    "AI automation",
    "Generative model exploration",
    "Hosting and deployment",
  ],
  links: {
    github: "https://github.com/Narendra099",
    linkedin: "https://www.linkedin.com/in/narendra-matti-398781233/",
  },
};

export const featuredProjects: Project[] = [
  {
    name: "Vocal Extractor AI",
    summary:
      "An AI audio processing app that separates vocals, instrumentals, and cleaner source tracks through a production-minded pipeline.",
    stack: ["FastAPI", "React", "Vite", "Python", "Audio AI"],
    status: "Active build",
    link: "https://github.com/Narendra099/Vocal-Extractor-AI",
    accent: "Coral",
  },
  {
    name: "Text to Speech Gen",
    summary:
      "A local text-to-speech and voice cloning studio focused on controllable generation, model tuning, and AI-assisted scripting.",
    stack: ["Python", "Streamlit", "TTS", "Voice Cloning"],
    status: "Exploring generative workflows",
    link: "https://github.com/Narendra099/text-to-speech-gen",
    accent: "Gold",
  },
  {
    name: "Guess the Code",
    summary:
      "A Django-based puzzle game that mixes logic gameplay with a more expressive interface, including voice-led interaction ideas.",
    stack: ["Django", "JavaScript", "HTML", "CSS"],
    status: "Playable concept",
    link: "https://github.com/Narendra099/guess-the-code",
    accent: "Mint",
  },
];

export const schedule: ScheduleBlock[] = [
  {
    day: "Office Hours",
    window: "2:00 PM - 11:00 PM",
    focus: "My regular work schedule during weekdays, aligned to Asia/Kolkata time.",
  },
  {
    day: "Best Collaboration",
    window: "1:00 PM - 4:00 PM",
    focus: "This is the best window for product discussions, async follow-ups, and short collaboration sessions.",
  },
  {
    day: "Daily Busy Slot",
    window: "11:30 AM - 12:00 PM",
    focus: "Recurring team sync time during the day, so I usually keep this short window blocked.",
  },
  {
    day: "Timezone",
    window: "Asia/Kolkata",
    focus: "Useful for remote collaboration, planning meetings, and async expectations.",
  },
];
