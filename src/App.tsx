import { Link, Route, Routes } from "react-router-dom";
import CalculatorPage from "./pages/CalculatorPage";
import AdminPage from "./pages/AdminPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import LoadProposalPage from "./pages/LoadProposalPage";

export default function App() {
  return (
    <div className="min-h-screen">
      <header>
        <div className="w-full bg-black">
          <img
            src={`${import.meta.env.BASE_URL}uiic-header.png`}
            alt="United India Insurance Company Ltd."
            className="block w-full h-14 sm:h-16 md:h-20 object-cover object-left"
          />
        </div>
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
            <p className="text-sm sm:text-base font-semibold text-slate-900 min-w-0">
              TVS Dealer Package Proposal
            </p>
            <nav className="flex gap-3 sm:gap-4 text-sm text-blue-900 font-medium shrink-0">
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
