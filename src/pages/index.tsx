import type { GetServerSideProps, NextPage } from "next";
import { twMerge } from "tailwind-merge";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

const Page: NextPage = () => {
  return <Home />;
};
export default Page;

function Home() {
  return (
    <>
      <nav className="bg-slate-50/5">
        <div
          className={twMerge(
            "relative w-full",
            "max-w-lg px-4 py-4",
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
        </div>
      </main>
    </>
  );
}

function AboutSection() {
  return (
    <section
      className={twMerge(
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
            Software Engineer{", "}
          </a>
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
            href="https://www.instagram.com/symphakurt/?hl=en"
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
      title: "생성 AI 모델의 임베딩 벡터를 이용한 서버리스 추천 검색 구현하기",
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
      title: "서버리스 기반 검색 서비스 구축하기",
      event: "AWS Community Day Online 2020",
    },
    {
      type: "youtube",
      videoId: "-LZFJ6BpplE",
      title: "서버리스 기반 컨텐츠 추천 서비스 만들기",
      event: "AWS Summit Seoul 2019",
    },
    {
      type: "youtube",
      videoId: "zZ8Sn-vbsOE",
      title:
        "Lambda@Edge를 통한 점진적 서버리스 이전 및 멑티 리전 트래픽 길들이기",
      event: "AWS Summit Seoul 2018",
    },
    {
      type: "youtube",
      videoId: "CM47-1UpgOc",
      title: "Vingle의 AWS 기반 서버리스 마이크로 서비스 구현 사례",
      event: "AWS Summit Seoul 2017",
    },
  ];

  return (
    <section
      className={twMerge(
        "relative w-full",
        "max-w-lg px-4",
        "lg:max-w-5xl lg:px-0"
      )}
    >
      <h1 className="pb-6 pt-4 text-3xl font-semibold">Presentations</h1>
      <div
        className={twMerge(
          "grid",
          "grid-cols-1 gap-5",
          "lg:gap-3 lg:grid-cols-3"
        )}
      >
        {presentations.map((presentation, index) => {
          switch (presentation.type) {
          case "youtube": {
            return (
              <div key={index}>
                <div className="aspect-[560/315]">
                  <a
                    href={`https://www.youtube.com/watch?v=${presentation.videoId}`}
                  >
                    <img
                      loading="lazy"
                      src={`https://img.youtube.com/vi/${presentation.videoId}/0.jpg`}
                      alt={presentation.title}
                      className="h-full w-full rounded-md object-cover transition-all hover:translate-y-[-2px] hover:shadow-lg"
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
            );
          }
          default:
            return null;
          }
        })}
      </div>
    </section>
  );
}
