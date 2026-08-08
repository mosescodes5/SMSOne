"use client";

import { useEffect, useState } from "react";
import DigitReel from "./DigitReel";

const DEMO_CODES = ["482913", "719284", "350672"];

export default function HeroDemoReel() {
  const [code, setCode] = useState(null);
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    let i = 0;
    const showFirst = setTimeout(() => {
      setCode(DEMO_CODES[0]);
      setArrived(true);
    }, 600);

    const interval = setInterval(() => {
      i = (i + 1) % DEMO_CODES.length;
      setCode(null);
      setArrived(false);
      setTimeout(() => {
        setCode(DEMO_CODES[i]);
        setArrived(true);
      }, 450);
    }, 3200);

    return () => {
      clearTimeout(showFirst);
      clearInterval(interval);
    };
  }, []);

  return <DigitReel code={code} arrived={arrived} />;
}
