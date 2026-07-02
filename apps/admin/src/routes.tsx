import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/features/auth/LoginPage";
import { RequireAdmin } from "@/features/auth/RequireAdmin";
import { CategoriesPage } from "@/features/categories/CategoriesPage";
import { OrderDetailPage } from "@/features/orders/OrderDetailPage";
import { OrdersListPage } from "@/features/orders/OrdersListPage";
import { PaymentsListPage } from "@/features/payments/PaymentsListPage";
import { ProductCreatePage } from "@/features/products/ProductCreatePage";
import { ProductEditorPage } from "@/features/products/ProductEditorPage";
import { ProductsListPage } from "@/features/products/ProductsListPage";
import { ShippingPage } from "@/features/shipping/ShippingPage";
import { UsersPage } from "@/features/users/UsersPage";

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
          { path: "categories", element: <CategoriesPage /> },
          { path: "shipping", element: <ShippingPage /> },
          { path: "users", element: <UsersPage /> },
        ],
      },
    ],
  },
]);
