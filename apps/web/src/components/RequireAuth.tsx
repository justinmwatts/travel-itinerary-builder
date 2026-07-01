// Copyright (c) 2026 Justin Watts. All rights reserved.
// Proprietary and confidential. Unauthorized copying, distribution, or use of
// this file, via any medium, is strictly prohibited without prior written permission.
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Flex, Spinner } from "@chakra-ui/react";
import { useMe } from "../features/auth/api";

// Gate for authed routes. While the session is resolving we hold with a spinner;
// once known, an anonymous visitor is sent to /login with the intended location
// preserved so we can return them after sign-in.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: me, isPending } = useMe();
  const location = useLocation();

  if (isPending) {
    return (
      <Flex minH="60vh" align="center" justify="center">
        <Spinner color="accent" />
      </Flex>
    );
  }

  if (!me) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
