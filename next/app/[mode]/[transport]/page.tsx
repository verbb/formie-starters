import StarterApp from "../../components/StarterApp";

type StarterRoutePageProps = {
  params: Promise<{
    mode: string;
    transport: string;
  }>;
};

export function generateStaticParams() {
  return [
    { mode: 'server-rendered', transport: 'rest' },
    { mode: 'server-rendered', transport: 'graphql' },
    { mode: 'client-rendered', transport: 'rest' },
    { mode: 'client-rendered', transport: 'graphql' },
  ];
}

export default async function StarterRoutePage({ params }: StarterRoutePageProps) {
  const resolvedParams = await params;

  return (
    <StarterApp
      initialPathname={`/${resolvedParams.mode}/${resolvedParams.transport}`}
    />
  );
}
