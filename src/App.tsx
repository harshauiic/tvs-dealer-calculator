import { Link, Route, Routes } from "react-router-dom";
import CalculatorPage from "./pages/CalculatorPage";
import AdminPage from "./pages/AdminPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import LoadProposalPage from "./pages/LoadProposalPage";

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="bg-black border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={`${import.meta.env.BASE_URL}uiic-logo.png`}
              alt="United India Insurance Co. Ltd."
              className="h-12 sm:h-14 w-auto max-w-[min(100%,420px)] object-contain"
            />
            <p className="hidden md:block text-slate-300 text-sm shrink-0">
              Insurance Premium Calculator
            </p>
          </div>
          <nav className="flex gap-3 text-sm text-white font-medium shrink-0">
            <Link to="/" className="hover:text-blue-300">
              Calculator
            </Link>
            <Link to="/load" className="hover:text-blue-300">
              Load Proposal
            </Link>
            <Link to="/admin" className="hover:text-blue-300">
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
