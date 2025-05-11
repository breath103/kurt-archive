import type { GetServerSideProps, NextPage } from 'next';
import { twMerge } from 'tailwind-merge';

interface PageProps {}
export const getServerSideProps: GetServerSideProps<PageProps> = async () => {
  return { props: {} };
};

const Page: NextPage<PageProps> = () => {
  return <Home />;
};
export default Page;

function Home() {
  return (
    <main className="relative flex min-h-full w-full flex-col items-center">
      <Background className="fixed inset-0 z-0 h-screen w-screen" />

      <div className="space-y-12">
        <AboutSection />
        <PresentationSection />
      </div>
    </main>
  );
}

function AboutSection() {
  return (
    <section
      className={twMerge(
        'relative w-full',
        'max-w-lg px-4',
        'lg:max-w-5xl lg:px-0'
      )}
    >
      <h1 className="pb-6 pt-4 text-3xl font-semibold">About</h1>
      <div className="space-y-2">
        <p>
          {"I'm a "}
          <a
            className="font-semibold text-blue-700"
            href="https://github.com/breath103"
          >
            Software Engineer{', '}
          </a>
          <a
            className="font-semibold text-blue-700"
            href="https://www.mirror.work/en/"
          >
            Startup Founder
          </a>
          {', '}
          <a
            className="font-semibold text-blue-700"
            href="https://aws.amazon.com/ko/developer/community/heroes/kurt-lee/"
          >
            AWS Serverless Hero
          </a>
          {', '}
          <a
            className="font-semibold text-blue-700"
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
            className="font-semibold text-blue-700"
            href="mailto:breath103@gmail.com"
          >
            breath103@gmail.com
          </a>
          {' / '}
          <a
            className="font-semibold text-blue-700"
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
    type: 'youtube';
    videoId: string;
    title: string;
    event: string;
  }> = [
    {
      type: 'youtube',
      videoId: '7pRItmvbXLM',
      title: '생성 AI 모델의 임베딩 벡터를 이용한 서버리스 추천 검색 구현하기',
      event: 'AWS Summit Seoul 2023',
    },
    {
      type: 'youtube',
      videoId: 'SGJ5WR60K58',
      title:
        'How CATCH FASHION built a serverless ML inference service with AWS Lambda',
      event: 'AWS re:Invent 2020',
    },
    {
      type: 'youtube',
      videoId: '4vwXY0SGnDo',
      title:
        'Serverless Today: Stateless Architectures for Stateless Applications',
      event: 'AWS Hero Summit 2020',
    },
    {
      type: 'youtube',
      videoId: 'Y3XpIQHfqZQ',
      title: '서버리스 기반 검색 서비스 구축하기',
      event: 'AWS Community Day Online 2020',
    },
    {
      type: 'youtube',
      videoId: '-LZFJ6BpplE',
      title: '서버리스 기반 컨텐츠 추천 서비스 만들기',
      event: 'AWS Summit Seoul 2019',
    },
    {
      type: 'youtube',
      videoId: 'zZ8Sn-vbsOE',
      title:
        'Lambda@Edge를 통한 점진적 서버리스 이전 및 멑티 리전 트래픽 길들이기',
      event: 'AWS Summit Seoul 2018',
    },
    {
      type: 'youtube',
      videoId: 'CM47-1UpgOc',
      title: 'Vingle의 AWS 기반 서버리스 마이크로 서비스 구현 사례',
      event: 'AWS Summit Seoul 2017',
    },
  ];

  return (
    <section
      className={twMerge(
        'relative w-full',
        'max-w-lg px-4',
        'lg:max-w-5xl lg:px-0'
      )}
    >
      <h1 className="pb-6 pt-4 text-3xl font-semibold">Presentations</h1>
      <div
        className={twMerge(
          'grid',
          'grid-cols-1 gap-5',
          'lg:gap-3 lg:grid-cols-3'
        )}
      >
        {presentations.map((presentation, index) => {
          switch (presentation.type) {
            case 'youtube': {
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
                        className="h-full w-full rounded-md border border-gray-400 object-cover transition-all hover:translate-y-[-2px] hover:shadow-lg"
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

function Background({ className }: { className: string }) {
  /*
  https://fffuel.co/ffflux/
  https://fffuel.co/bbblurry/
  https://www.magicpattern.design/tools/mesh-gradients
  */
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      // viewBox="0 0 700 700"
      className={className}
      opacity={0.65}
    >
      <defs>
        <linearGradient
          gradientTransform="rotate(212, 0.5, 0.5)"
          x1="50%"
          y1="0%"
          x2="50%"
          y2="100%"
          id="ffflux-gradient"
        >
          <stop
            stopColor="hsl(315, 23%, 80%)"
            stopOpacity="1"
            offset="0%"
          ></stop>
          <stop
            stopColor="hsl(227, 70%, 65%)"
            stopOpacity="1"
            offset="100%"
          ></stop>
        </linearGradient>
        <filter
          id="ffflux-filter"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          filterUnits="objectBoundingBox"
          primitiveUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.004 0.003"
            numOctaves="1"
            seed="2"
            stitchTiles="stitch"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            result="turbulence"
          ></feTurbulence>
          <feGaussianBlur
            stdDeviation="73 100"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            in="turbulence"
            edgeMode="duplicate"
            result="blur"
          ></feGaussianBlur>
          <feBlend
            mode="color-dodge"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            in="SourceGraphic"
            in2="blur"
            result="blend"
          ></feBlend>
        </filter>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="url(#ffflux-gradient)"
        filter="url(#ffflux-filter)"
      ></rect>
    </svg>
  );
}
