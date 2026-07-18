import { Link, Route, Routes } from "react-router-dom";
import CalculatorPage from "./pages/CalculatorPage";
import AdminPage from "./pages/AdminPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import LoadProposalPage from "./pages/LoadProposalPage";

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="bg-yellow-400 border-b border-yellow-500">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <img
              src={`${import.meta.env.BASE_URL}uiic-logo.png`}
              alt="United India Insurance Co. Ltd."
              className="h-12 sm:h-14 w-auto max-w-[min(100%,420px)] object-contain"
            />
            <p className="mt-1 text-sm sm:text-base font-semibold text-slate-900">
              TVS Dealer Package Proposal
            </p>
          </div>
          <nav className="flex gap-3 text-sm text-slate-900 font-medium shrink-0">
            <Link to="/" className="hover:text-blue-800">
              Calculator
            </Link>
            <Link to="/load" className="hover:text-blue-800">
              Load Proposal
            </Link>
            <Link to="/admin" className="hover:text-blue-800">
              Admin
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<CalculatorPage />} />
          <Route path="/load" element={<LoadProposalPage />} />
          <Route path="/load/:reference" element={<LoadProposalPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  );
}
