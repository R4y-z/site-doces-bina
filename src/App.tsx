import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminProductForm from "./pages/admin/AdminProductForm";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminCategories from "./pages/admin/AdminCategories";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="pedidos" element={<AdminOrders />} />
        <Route path="produtos" element={<AdminProducts />} />
        <Route path="produtos/novo" element={<AdminProductForm />} />
        <Route path="produtos/:id" element={<AdminProductForm />} />
        <Route path="categorias" element={<AdminCategories />} />
        <Route path="configuracoes" element={<AdminSettings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
