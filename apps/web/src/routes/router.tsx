import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./RootLayout";
import { RequireAuth } from "../components/RequireAuth";

// Route-level code splitting (design.md section 15). The chat builder, customize
// editor and the rest load on demand, so the initial bundle stays small. The
// Anthropic SDK lives only on the server and adds zero client weight.
const FeedPage = lazy(() =>
  import("../features/feed/FeedPage").then((m) => ({ default: m.FeedPage })),
);
const LoginPage = lazy(() =>
  import("../features/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const DetailPage = lazy(() =>
  import("../features/detail/DetailPage").then((m) => ({ default: m.DetailPage })),
);
const BuilderPage = lazy(() =>
  import("../features/builder/BuilderPage").then((m) => ({ default: m.BuilderPage })),
);
const CustomizePage = lazy(() =>
  import("../features/customize/CustomizePage").then((m) => ({ default: m.CustomizePage })),
);
const MyItinerariesPage = lazy(() =>
  import("../features/me/MyItinerariesPage").then((m) => ({ default: m.MyItinerariesPage })),
);

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <FeedPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/itinerary/:id", element: <DetailPage /> },
      {
        path: "/build",
        element: (
          <RequireAuth>
            <BuilderPage />
          </RequireAuth>
        ),
      },
      {
        path: "/build/:id",
        element: (
          <RequireAuth>
            <BuilderPage />
          </RequireAuth>
        ),
      },
      {
        path: "/build/:id/customize",
        element: (
          <RequireAuth>
            <CustomizePage />
          </RequireAuth>
        ),
      },
      {
        path: "/me",
        element: (
          <RequireAuth>
            <MyItinerariesPage />
          </RequireAuth>
        ),
      },
    ],
  },
]);
