/** Default when `NEXT_PUBLIC_FORMIE_BASE_URL` is unset (typical ddev HTTPS URL). Override in `.env.local`. */
const DEFAULT_FORMIE_BASE_URL = "https://craft.ddev.site:8443";

export function resolveFormieBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_FORMIE_BASE_URL;
  if (fromEnv !== undefined && fromEnv.trim() !== "") {
    return fromEnv.trim();
  }
  return DEFAULT_FORMIE_BASE_URL;
}

export const FORMIE_BASE_URL = resolveFormieBaseUrl();

function buildDefaultGraphqlEndpoint(baseUrl: string): string {
  if (!baseUrl) {
    return "/api";
  }
  try {
    return new URL("/api", baseUrl).toString();
  } catch {
    return `${baseUrl.replace(/\/$/, "")}/api`;
  }
}

export const GRAPHQL_ENDPOINT =
  process.env.NEXT_PUBLIC_FORMIE_GRAPHQL_ENDPOINT || buildDefaultGraphqlEndpoint(FORMIE_BASE_URL);

export function describeRestBaseUrl(): string {
  return FORMIE_BASE_URL;
}

export function describeGraphqlEndpoint(): string {
  return GRAPHQL_ENDPOINT;
}

export const DEFAULT_EXAMPLE_ID = "single-page";
export const DEFAULT_SCENARIO_ID = "html-default-theme";
export const DEFAULT_GRAPHQL_DEMO_ID = "html-payload";
export const DEFAULT_STORY_ID = "html-rest";

export type ThemeConfig = Record<string, unknown>;

export type DemoExample = {
  id: string;
  title: string;
  summary: string;
  description: string;
  handle: string;
  highlights: string[];
};

export type RestScenario = {
  id: string;
  mode: "server-rendered" | "client-rendered";
  title: string;
  summary: string;
  description?: string;
  theme?: "formie" | "none";
  themeConfig?: ThemeConfig;
};

export type StarterStory = {
  id: string;
  mode: "server-rendered" | "client-rendered";
  transport: "rest" | "graphql";
  title: string;
  summary: string;
};

export type GraphqlDemo = {
  id: string;
  mode: "server-rendered" | "client-rendered";
  title: string;
  summary: string;
  description: string;
};

export const DEMO_EXAMPLES: DemoExample[] = [
  {
    id: "single-page",
    title: "Single-page",
    summary: "A simple contact-style form for comparing presentation options quickly.",
    description:
      "Use this example as the baseline demo. It is the easiest way to compare how a normal production form looks and behaves under each transport.",
    handle: process.env.NEXT_PUBLIC_FORMIE_SINGLE_PAGE_HANDLE || "singlePage",
    highlights: ["Simple validation", "Best default theme comparison", "Fast smoke test"],
  },
  {
    id: "multi-page",
    title: "Multi-page",
    summary: "A guided multi-step form for checking navigation, continuity, and progress state.",
    description:
      "Use this example to pressure-test workflow behavior such as page transitions, previous/next actions, and token-backed continuity.",
    handle: process.env.NEXT_PUBLIC_FORMIE_MULTI_PAGE_HANDLE || "multiPage",
    highlights: ["Page navigation", "State continuity", "Back/save/submit flows"],
  },
  {
    id: "advanced",
    title: "Advanced",
    summary: "A richer form intended for conditional logic, summaries, and heavier interactions.",
    description: "Use this example to show how the same transport behaves once the form includes more realistic field complexity.",
    handle: process.env.NEXT_PUBLIC_FORMIE_ADVANCED_HANDLE || "advanced",
    highlights: ["Conditional logic", "Richer field types", "Real-world behavior"],
  },
];

export const REST_SCENARIOS: RestScenario[] = [
  {
    id: "html-default-theme",
    mode: "server-rendered",
    title: "Default theme",
    summary: "Formie renders with its built-in styles.",
    theme: "formie",
  },
  {
    id: "html-no-theme",
    mode: "server-rendered",
    title: "No theme",
    summary: "Keep the markup and behavior, but styling is up to you.",
    theme: "none",
  },
  {
    id: "html-custom-styling",
    mode: "server-rendered",
    title: "Custom styling",
    summary: "Start from Formie defaults and add app-level classes and attributes.",
    theme: "formie",
    themeConfig: {
      field: {
        attributes: {
          class: ["starter-field", "starter-field--spaced"],
          "data-scenario": "custom-styling",
        },
      },
      fieldLabel: {
        attributes: {
          class: ["starter-label"],
        },
      },
      fieldControl: {
        attributes: {
          class: ["starter-control"],
        },
      },
    },
  },
  {
    id: "html-theme-reset-custom",
    mode: "server-rendered",
    title: "Theme reset + custom",
    summary: "Reset Formie’s theme layer and supply your own presentation hooks.",
    theme: "formie",
    themeConfig: {
      field: {
        reset: true,
        attributes: {
          class: [
            "grid",
            "gap-3",
            "rounded-2xl",
            "border",
            "border-indigo-200",
            "bg-gradient-to-b",
            "from-sky-50",
            "to-indigo-50",
            "p-4",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]",
          ],
          "data-scenario": "theme-reset-custom",
        },
      },
      fieldLabel: {
        reset: true,
        attributes: {
          class: [
            "inline-flex",
            "justify-self-start",
            "rounded-full",
            "bg-white/90",
            "px-2.5",
            "py-1",
            "text-[11px]",
            "font-semibold",
            "uppercase",
            "tracking-[0.16em]",
            "text-indigo-700",
          ],
        },
      },
      fieldInput: {
        reset: true,
        attributes: {
          class: [
            "rounded-xl",
            "border",
            "border-dashed",
            "border-indigo-200",
            "bg-white/80",
            "p-3",
            "shadow-sm",
            "w-full",
            "text-slate-900",
          ],
        },
      },
    },
  },
  {
    id: "component-rest-form",
    mode: "client-rendered",
    title: "REST component definition",
    summary: "Load the public component contract and render it with a minimal app-owned React view.",
    description:
      "This path is intentionally small and contract-focused because the host app owns the markup and styling surface.",
  },
];

export const STARTER_STORIES: StarterStory[] = [
  {
    id: "html-rest",
    mode: "server-rendered",
    transport: "rest",
    title: "REST",
    summary: "Formie-owned HTML rendering through the REST render endpoint.",
  },
  {
    id: "html-graphql",
    mode: "server-rendered",
    transport: "graphql",
    title: "GraphQL",
    summary: "Fetch a Formie-owned HTML payload through GraphQL (same shape as the REST HTML demo).",
  },
  {
    id: "component-rest",
    mode: "client-rendered",
    transport: "rest",
    title: "REST",
    summary: "Load the public component contract and render it with a minimal app-owned React view.",
  },
  {
    id: "component-graphql",
    mode: "client-rendered",
    transport: "graphql",
    title: "GraphQL",
    summary:
      "Fetch the dedicated frontend contract through GraphQL and map it into a minimal React renderer (`formieClientForm`).",
  },
];

export const GRAPHQL_DEMOS: GraphqlDemo[] = [
  {
    id: "html-payload",
    mode: "server-rendered",
    title: "HTML payload query",
    summary: "Fetch a Formie-owned HTML payload through GraphQL.",
    description:
      "This is the GraphQL-first equivalent of the REST HTML demo and the clearest path for teams standardizing reads on GraphQL.",
  },
  {
    id: "component-payload",
    mode: "client-rendered",
    title: "Component payload query",
    summary: "Fetch the dedicated frontend contract through GraphQL and map it into a minimal React renderer.",
    description:
      "Use this to inspect the canonical `formieClientForm` envelope a GraphQL-first app can map into its own rendering layer.",
  },
  {
    id: "submit-mutation",
    mode: "client-rendered",
    title: "Submission mutation",
    summary: "Show how GraphQL callers submit the same continuity and field payloads.",
    description:
      "This is the clearest follow-along example for teams posting component-mode submissions through the dedicated frontend contract mutation surface.",
  },
];

const LEGACY_SCENARIO_IDS: Record<string, string> = {
  "default-theme": "html-default-theme",
  "unstyled-output": "html-no-theme",
};

export function resolveExample(id: string | null): DemoExample {
  return DEMO_EXAMPLES.find((example) => example.id === id) || DEMO_EXAMPLES[0];
}

export function resolveStory(id: string | null): StarterStory {
  return STARTER_STORIES.find((story) => story.id === id) || STARTER_STORIES[0];
}

export function resolveGraphqlDemo(id: string | null): GraphqlDemo {
  return GRAPHQL_DEMOS.find((demo) => demo.id === id) || GRAPHQL_DEMOS[0];
}

export function resolveGraphqlDemoForMode(mode: GraphqlDemo["mode"], id: string | null): GraphqlDemo {
  return (
    GRAPHQL_DEMOS.find((demo) => demo.mode === mode && demo.id === id) ||
    GRAPHQL_DEMOS.find((demo) => demo.mode === mode) ||
    GRAPHQL_DEMOS[0]
  );
}

export function resolveRestScenario(id: string | null): RestScenario {
  const normalized = (id && LEGACY_SCENARIO_IDS[id]) || id;
  return (
    REST_SCENARIOS.find((scenario) => {
      return scenario.id === normalized;
    }) || REST_SCENARIOS[0]
  );
}

export function resolveRestScenarioForMode(mode: RestScenario["mode"], id: string | null): RestScenario {
  const normalized = (id && LEGACY_SCENARIO_IDS[id]) || id;
  return (
    REST_SCENARIOS.find((scenario) => {
      return scenario.mode === mode && scenario.id === normalized;
    }) ||
    REST_SCENARIOS.find((scenario) => {
      return scenario.mode === mode;
    }) ||
    REST_SCENARIOS[0]
  );
}

export function resolveScenarioForStory(story: StarterStory, scenarioId: string | null): RestScenario {
  if (story.mode === "client-rendered") {
    return resolveRestScenarioForMode("client-rendered", "component-rest-form");
  }
  return resolveRestScenarioForMode("server-rendered", scenarioId || DEFAULT_SCENARIO_ID);
}

export function buildUrl(storyId: string, exampleId: string, scenarioId: string): string {
  return `?story=${storyId}&example=${exampleId}&scenario=${scenarioId}`;
}

export function scenarioForStoryNavTarget(story: StarterStory, currentScenario: RestScenario): RestScenario {
  if (story.mode === "client-rendered") {
    return resolveRestScenarioForMode("client-rendered", "component-rest-form");
  }

  if (currentScenario.mode === "server-rendered") {
    return currentScenario;
  }

  return resolveRestScenarioForMode("server-rendered", DEFAULT_SCENARIO_ID);
}

export function buildStoryNavUrl(storyId: string, exampleId: string, currentScenario: RestScenario): string {
  const story = resolveStory(storyId);
  const scenario = scenarioForStoryNavTarget(story, currentScenario);
  return buildUrl(storyId, exampleId, scenario.id);
}
