import Link from "next/link";
import { Zap, Shield, Globe, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Feature {
  icon: React.ReactNode;
  text: string;
}

const features: Feature[] = [
  {
    icon: <Zap className="h-4 w-4 text-primary" aria-hidden="true" />,
    text: "5 項目の入力で即算出",
  },
  {
    icon: <Globe className="h-4 w-4 text-primary" aria-hidden="true" />,
    text: "OpenAI / Anthropic / Google 対応",
  },
  {
    icon: <Shield className="h-4 w-4 text-primary" aria-hidden="true" />,
    text: "上限値算定で安心の見積もり",
  },
];

export function HeroSection() {
  return (
    <section className="text-center py-12 sm:py-20 space-y-6">
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
        AI エージェントの月額コスト、根拠ある上限値を 30 秒で
      </h2>
      <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
        マルチエージェント構成の API コストを、モデル選択と用途タイプの入力だけで概算
      </p>
      <div className="flex flex-wrap justify-center gap-3 pt-2">
        {features.map((feature) => (
          <div
            key={feature.text}
            className="flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm text-foreground shadow-sm"
          >
            {feature.icon}
            <span>{feature.text}</span>
          </div>
        ))}
      </div>
      <div className="pt-4">
        <Button asChild size="lg" className="text-base px-8 py-6">
          <Link href="/calculator">
            今すぐ見積もる
            <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
