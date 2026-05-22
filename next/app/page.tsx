import StarterApp from "./components/StarterApp";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function toSearchString(params: Record<string, string | string[] | undefined>): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === "string") {
      search.set(key, value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        search.append(key, entry);
      });
    }
  });

  const result = search.toString();
  return result ? `?${result}` : "";
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  return (
    <StarterApp
      initialPathname="/"
      initialSearch={toSearchString(resolvedSearchParams)}
    />
  );
}
