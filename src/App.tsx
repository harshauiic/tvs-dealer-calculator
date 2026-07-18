import { Link, Route, Routes } from "react-router-dom";
import CalculatorPage from "./pages/CalculatorPage";
import AdminPage from "./pages/AdminPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import LoadProposalPage from "./pages/LoadProposalPage";

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <img
            src={`${import.meta.env.BASE_URL}uiic-header.png`}
            alt="United India Insurance Company Ltd."
            className="block h-12 sm:h-14 md:h-16 w-auto max-w-[55%] object-contain object-left shrink-0"
          />
          <div className="flex flex-col items-end text-right gap-1.5 min-w-0">
            <p className="text-sm sm:text-base font-semibold text-slate-900">
              TVS Dealer Package Proposal
            </p>
            <nav className="flex flex-wrap justify-end gap-3 sm:gap-4 text-sm text-blue-900 font-medium">
              <Link to="/" className="hover:text-blue-700">
                Calculator
              </Link>
              <Link to="/load" className="hover:text-blue-700">
                Load Proposal
              </Link>
              <Link to="/admin" className="hover:text-blue-700">
                Admin
              </Link>
            </nav>
          </div>
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
