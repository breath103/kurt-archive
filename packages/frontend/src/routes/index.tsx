import { createRoute, Link } from "@tanstack/react-router";

import { cn } from "@/lib/cn";

import { rootRoute } from "./__root";

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Home,
});

function Home() {
  return (
    <>
      <nav className="bg-slate-50/5">
        <div
          className={cn(
            "relative w-full",
            "max-w-lg p-4",
            "lg:max-w-5xl lg:px-0",
            "mx-auto"
          )}
        >
          <a className="py-4 text-2xl font-semibold">About</a>
        </div>
      </nav>

      <main className="relative flex min-h-full w-full flex-col items-center">
        <div className="space-y-12 py-8">
          <AboutSection />
          <PresentationSection />
          <HobbySection />
        </div>
      </main>
    </>
  );
}

function AboutSection() {
  return (
    <section
      className={cn(
        "relative w-full",
        "max-w-lg px-4",
        "lg:max-w-5xl lg:px-0"
      )}
    >
      <div className="space-y-2">
        <p>
          {"I'm a "}
          <a
            className="font-semibold text-highlight"
            href="https://github.com/breath103"
          >
            Software Engineer
          </a>
          {", "}
          <a
            className="font-semibold text-highlight"
            href="https://www.mirror.work/en/"
          >
            Startup Founder
          </a>
          {", "}
          <a
            className="font-semibold text-highlight"
            href="https://builder.aws.com/community/heroes/KurtLee"
          >
            AWS Serverless Hero
          </a>
          {", "}
          <a
            className="font-semibold text-highlight"
            href="https://www.youtube.com/@%ED%85%8C%ED%97%A4%EB%9E%80%EB%B0%B8%EB%A6%AC"
          >
            Occasionally Youtuber
          </a>
          {", "}
          <a
            className="font-semibold text-highlight"
            href="https://www.instagram.com/p/CRZO78PgS8J/?hl=en"
          >
            Hobbyist Painter
          </a>
          <br />
          most interested in building meaningful, beautiful software product -
          and company/team that could do that.
        </p>
        <p>
          <a
            className="font-semibold text-highlight"
            href="mailto:breath103@gmail.com"
          >
            breath103@gmail.com
          </a>
          {" / "}
          <a
            className="font-semibold text-highlight"
            href="https://www.linkedin.com/in/kurt-lee-70010391/"
          >
            LinkedIn
          </a>
        </p>
      </div>
    </section>
  );
}

function PresentationSection() {
  const presentations: Array<{
    type: "youtube";
    videoId: string;
    title: string;
    event: string;
  }> = [
    {
      type: "youtube",
      videoId: "7pRItmvbXLM",
      title: "Building a Serverless Recommendation Search with Generative AI Embedding Vectors",
      event: "AWS Summit Seoul 2023",
    },
    {
      type: "youtube",
      videoId: "SGJ5WR60K58",
      title:
        "How CATCH FASHION built a serverless ML inference service with AWS Lambda",
      event: "AWS re:Invent 2020",
    },
    {
      type: "youtube",
      videoId: "4vwXY0SGnDo",
      title:
        "Serverless Today: Stateless Architectures for Stateless Applications",
      event: "AWS Hero Summit 2020",
    },
    {
      type: "youtube",
      videoId: "Y3XpIQHfqZQ",
      title: "Building a Serverless Search Service",
      event: "AWS Community Day Online 2020",
    },
    {
      type: "youtube",
      videoId: "-LZFJ6BpplE",
      title: "Building a Serverless Content Recommendation Service",
      event: "AWS Summit Seoul 2019",
    },
    {
      type: "youtube",
      videoId: "zZ8Sn-vbsOE",
      title:
        "Gradual Serverless Migration and Multi-Region Traffic Management with Lambda@Edge",
      event: "AWS Summit Seoul 2018",
    },
    {
      type: "youtube",
      videoId: "CM47-1UpgOc",
      title: "Vingle's Serverless Microservices Implementation on AWS",
      event: "AWS Summit Seoul 2017",
    },
  ];

  return (
    <section
      className={cn(
        "relative w-full",
        "max-w-lg px-4",
        "lg:max-w-5xl lg:px-0"
      )}
    >
      <h1 className="pt-4 pb-6 text-3xl font-semibold">Presentations</h1>
      <div
        className={cn(
          "grid",
          "grid-cols-1 gap-5",
          "lg:grid-cols-3 lg:gap-3"
        )}
      >
        {presentations.map((presentation, index) => (
          <div key={index}>
            <div className="aspect-560/315">
              <a
                href={`https://www.youtube.com/watch?v=${presentation.videoId}`}
              >
                <img
                  loading="lazy"
                  src={`https://img.youtube.com/vi/${presentation.videoId}/0.jpg`}
                  alt={presentation.title}
                  className="size-full rounded-md object-cover transition-all hover:-translate-y-0.5 hover:shadow-lg"
                />
              </a>
            </div>
            <a
              href={`https://www.youtube.com/watch?v=${presentation.videoId}`}
            >
              <h5 className="pt-1 text-sm">
                <span className="font-semibold">
                  {presentation.title}
                </span>
                <br />
                <span className="italic">{presentation.event}</span>
              </h5>
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

function HobbySection() {
  return (
    <section
      className={cn(
        "relative w-full",
        "max-w-lg px-4",
        "lg:max-w-5xl lg:px-0"
      )}
    >
      <h1 className="pt-4 pb-6 text-3xl font-semibold">Hobbies</h1>
      <div
        className={cn("flex flex-col gap-4")}
      >
        <a
          className="font-semibold text-highlight"
          href="https://antislopbuilderclub.com/"
        >
          Anti Slop Builder Club
        </a>
        <Link className="font-semibold text-highlight" to="/zen-garden">
          Zen Garden
        </Link>
      </div>
    </section>
  );
}
