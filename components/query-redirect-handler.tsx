"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

interface QueryRedirectHandlerProps {
  onRedirect?: (redirect: string) => void;
}

export default function QueryRedirectHandler({
  onRedirect,
}: QueryRedirectHandlerProps) {
  const params = useSearchParams();
  const handledRef = useRef<boolean>(false);

  useEffect(() => {
    if (handledRef.current) {
      return;
    }

    const redirect = params.get("redirect");

    if (redirect && redirect.startsWith("/")) {
      handledRef.current = true;
      onRedirect?.(redirect);
    }
  }, [params, onRedirect]);

  return null;
}
