import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/features/auth/LoginPage";
import { RequireAdmin } from "@/features/auth/RequireAdmin";
import { OrderDetailPage } from "@/features/orders/OrderDetailPage";
import { OrdersListPage } from "@/features/orders/OrdersListPage";
import { PaymentsListPage } from "@/features/payments/PaymentsListPage";
import { ProductCreatePage } from "@/features/products/ProductCreatePage";
import { ProductEditorPage } from "@/features/products/ProductEditorPage";
import { ProductsListPage } from "@/features/products/ProductsListPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <RequireAdmin />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Navigate to="/orders" replace /> },
          { path: "orders", element: <OrdersListPage /> },
          { path: "orders/:id", element: <OrderDetailPage /> },
          { path: "payments", element: <PaymentsListPage /> },
          { path: "products", element: <ProductsListPage /> },
          { path: "products/new", element: <ProductCreatePage /> },
          { path: "products/:id", element: <ProductEditorPage /> },
        ],
      },
    ],
  },
]);
