import {
  createBrowserRouter,
  RouterProvider,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Home from "./routes/Home.tsx";
import NotFound from "./routes/NotFound.tsx";
import Auth from "./routes/Auth.tsx";
import React, { Suspense, useEffect } from "react";
import { useDeeptrain } from "@/conf/env.ts";
import Register from "@/routes/Register.tsx";
import Forgot from "@/routes/Forgot.tsx";
import { lazyFactor } from "@/utils/loader.tsx";
import { useSelector } from "react-redux";
import { selectAdmin, selectAuthenticated, selectInit } from "@/store/auth.ts";
import Index from "@/routes/Index.tsx";

const Model = lazyFactor(() => import("@/routes/Model.tsx"));
const Wallet = lazyFactor(() => import("@/routes/Wallet.tsx"));
const Account = lazyFactor(() => import("@/routes/Account.tsx"));

const Generation = lazyFactor(() => import("@/routes/Generation.tsx"));
const Sharing = lazyFactor(() => import("@/routes/Sharing.tsx"));
const Article = lazyFactor(() => import("@/routes/Article.tsx"));

const AdminPage = lazyFactor(() => import("@/routes/Admin.tsx"));
const AdminDashboard = lazyFactor(() => import("@/routes/admin/DashBoard.tsx"));
const AdminMarket = lazyFactor(() => import("@/routes/admin/Market.tsx"));
const AdminChannel = lazyFactor(() => import("@/routes/admin/Channel.tsx"));
const AdminSystem = lazyFactor(() => import("@/routes/admin/System.tsx"));
const AdminCharge = lazyFactor(() => import("@/routes/admin/Charge.tsx"));
const AdminUsers = lazyFactor(() => import("@/routes/admin/Users.tsx"));
const AdminBroadcast = lazyFactor(() => import("@/routes/admin/Broadcast.tsx"));
const AdminSubscription = lazyFactor(
  () => import("@/routes/admin/Subscription.tsx"),
);
const AdminRecord = lazyFactor(
  () => import("@/routes/admin/Record.tsx"),
);
const AdminPayment = lazyFactor(
  () => import("@/routes/admin/Payment.tsx"),
);
const AdminLogger = lazyFactor(() => import("@/routes/admin/Logger.tsx"));

const router = createBrowserRouter([
  {
    id: "index",
    path: "/",
    Component: Index,
    ErrorBoundary: NotFound,
    children: [
      {
        id: "not-found",
        path: "*",
        element: <NotFound />,
      },
      {
        id: "home",
        path: "",
        element: <Home />,
      },
      {
        id: "model",
        path: "model",
        element: (
          <Suspense>
            <Model />
          </Suspense>
        ),
      },
      {
        id: "wallet",
        path: "wallet",
        element: (
          <Suspense>
            <Wallet />
          </Suspense>
        ),
      },
      // {
      //   id: "log",
      //   path: "log",
      //   element: (
      //     <Suspense>
      //       <License />
      //     </Suspense>
      //   ),
      // },
      // {
      //   id: "preset",
      //   path: "preset",
      //   element: (
      //     <Suspense>
      //       <Preset />
      //     </Suspense>
      //   ),
      // },
      // {
      //   id: "key",
      //   path: "key",
      //   element: (
      //     <Suspense>
      //       <License />
      //     </Suspense>
      //   ),
      // },
      {
        id: "account",
        path: "account",
        element: (
          <Suspense>
            <Account />
          </Suspense>
        ),
      },
      {
        id: "login",
        path: "/login",
        element: (
          <AuthForbidden>
            <Auth />
          </AuthForbidden>
        ),
        ErrorBoundary: NotFound,
      },
      {
        id: "admin",
        path: "/admin",
        element: (
          <AdminRequired>
            <Suspense>
              <AdminPage />
            </Suspense>
          </AdminRequired>
        ),
        children: [
          {
            id: "admin-dashboard",
            path: "",
            element: (
              <Suspense>
                <AdminDashboard />
              </Suspense>
            ),
          },
          {
            id: "admin-users",
            path: "users",
            element: (
              <Suspense>
                <AdminUsers />
              </Suspense>
            ),
          },
          {
            id: "admin-market",
            path: "market",
            element: (
              <Suspense>
                <AdminMarket />
              </Suspense>
            ),
          },
          {
            id: "admin-channel",
            path: "channel",
            element: (
              <Suspense>
                <AdminChannel />
              </Suspense>
            ),
          },
          {
            id: "admin-system",
            path: "system",
            element: (
              <Suspense>
                <AdminSystem />
              </Suspense>
            ),
          },
          {
            id: "admin-charge",
            path: "charge",
            element: (
              <Suspense>
                <AdminCharge />
              </Suspense>
            ),
          },
          {
            id: "admin-broadcast",
            path: "broadcast",
            element: (
              <Suspense>
                <AdminBroadcast />
              </Suspense>
            ),
          },
          {
            id: "admin-subscription",
            path: "subscription",
            element: (
              <Suspense>
                <AdminSubscription />
              </Suspense>
            ),
          },
          {
            id: "admin-record",
            path: "record",
            element: (
              <Suspense>
                <AdminRecord />
              </Suspense>
            ),
          },
          {
            id: "admin-payment",
            path: "pay",
            element: (
              <Suspense>
                <AdminPayment />
              </Suspense>
            ),
          },
          {
            id: "admin-logger",
            path: "logger",
            element: (
              <Suspense>
                <AdminLogger />
              </Suspense>
            ),
          },
        ],
        ErrorBoundary: NotFound,
      },
      {
        id: "generation",
        path: "/generate",
        element: (
          <AuthRequired>
            <Suspense>
              <Generation />
            </Suspense>
          </AuthRequired>
        ),
        ErrorBoundary: NotFound,
      },
      {
        id: "article",
        path: "/article",
        element: (
          <AuthRequired>
            <Suspense>
              <Article />
            </Suspense>
          </AuthRequired>
        ),
        ErrorBoundary: NotFound,
      },

      ...(useDeeptrain
        ? []
        : [
            {
              id: "register",
              path: "/register",
              element: (
                <AuthForbidden>
                  <Register />
                </AuthForbidden>
              ),
              ErrorBoundary: NotFound,
            },
            {
              id: "forgot",
              path: "/forgot",
              element: (
                <AuthForbidden>
                  <Forgot />
                </AuthForbidden>
              ),
              ErrorBoundary: NotFound,
            },
          ]),
    ],
  },
  {
    id: "share",
    path: "/share/:hash",
    element: (
      <Suspense>
        <Sharing />
      </Suspense>
    ),
    ErrorBoundary: NotFound,
  },
]);

export function AuthRequired({ children }: { children: React.ReactNode }) {
  const init = useSelector(selectInit);
  const authenticated = useSelector(selectAuthenticated);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (init && !authenticated) {
      navigate("/login", { state: { from: location.pathname } });
    }
  }, [init, authenticated]);

  return <>{children}</>;
}

export function AuthForbidden({ children }: { children: React.ReactNode }) {
  const init = useSelector(selectInit);
  const authenticated = useSelector(selectAuthenticated);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (init && authenticated) {
      navigate("/", { state: { from: location.pathname } });
    }
  }, [init, authenticated]);

  return <>{children}</>;
}

export function AdminRequired({ children }: { children: React.ReactNode }) {
  const init = useSelector(selectInit);
  const admin = useSelector(selectAdmin);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (init && !admin) {
      navigate("/", { state: { from: location.pathname } });
    }
  }, [init, admin]);

  return <>{children}</>;
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}

export default router;
