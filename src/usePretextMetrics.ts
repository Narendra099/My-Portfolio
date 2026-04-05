import { useEffect, useMemo, useState } from "react";
import { layout, prepare } from "@chenglou/pretext";

type Metrics = {
  lineCount: number;
  height: number;
};

const fontStyle = "600 16px Avenir Next, Segoe UI, sans-serif";

export function usePretextMetrics(
  text: string,
  width: number,
  lineHeight: number,
): Metrics {
  const prepared = useMemo(() => prepare(text, fontStyle), [text]);
  const [metrics, setMetrics] = useState<Metrics>({ lineCount: 0, height: 0 });

  useEffect(() => {
    if (!width) {
      return;
    }

    const result = layout(prepared, width, lineHeight);
    const nextLineCount = Math.max(1, Math.round(result.height / lineHeight));
    setMetrics({ lineCount: nextLineCount, height: result.height });
  }, [lineHeight, prepared, width]);

  return metrics;
}
