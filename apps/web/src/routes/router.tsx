import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./RootLayout";
import { RequireAuth } from "../components/RequireAuth";
import { FeedPage } from "../features/feed/FeedPage";
import { LoginPage } from "../features/auth/LoginPage";
import { BuilderPage } from "../features/builder/BuilderPage";
import { CustomizePage } from "../features/customize/CustomizePage";
import { MyItinerariesPage } from "../features/me/MyItinerariesPage";

// Data router (design.md D1). Public routes render directly; authed routes are
// wrapped in RequireAuth. The remaining screens (build/:id, customize, detail)
// are added in their phases.
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <FeedPage /> },
      { path: "/login", element: <LoginPage /> },
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
