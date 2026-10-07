import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Globe3DDemo } from './components/GlobeBackground';
import { 
  Clock, 
  X, 
  Search, 
  Sun, 
  Moon, 
  ExternalLink, 
  Sparkles, 
  Truck, 
  ShieldCheck, 
  Layers, 
  ArrowRight, 
  TrendingDown 
} from 'lucide-react';
import AuthModal from './components/AuthModal';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  
  // 1. History State (localStorage se load karega)
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('pricehunter_search_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showDropdown, setShowDropdown] = useState(false);

  // 2. Nayi Search ko History mein Save karne ka helper
  const saveQueryToHistory = (queryText) => {
    if (!queryText || !queryText.trim()) return;
    const trimmed = queryText.trim();

    setSearchHistory((prev) => {
      const updated = [trimmed, ...prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
      localStorage.setItem('pricehunter_search_history', JSON.stringify(updated));
      return updated;
    });
  };

  // 3. Single Item Delete Handler
  const removeHistoryItem = (e, itemToDelete) => {
    e.stopPropagation();
    setSearchHistory((prev) => {
      const updated = prev.filter((item) => item !== itemToDelete);
      localStorage.setItem('pricehunter_search_history', JSON.stringify(updated));
      return updated;
    });
  };

  // 4. History item par click karne par direct search execute karna
  const handleSelectHistory = (item) => {
    setQuery(item);
    setShowDropdown(false);
    handleSearch(null, item);
  };

  // Auth & 1-search limitation states
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('user_token');
    const name = localStorage.getItem('user_name');
    if (token && name) {
      setUser({ name });
    }
  }, []);

  const handleThemeToggle = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

const handleSearch = async (e, directQuery = null) => {
    if (e) e.preventDefault();
    const searchQuery = directQuery || query;
    if (!searchQuery.trim()) return;

    const hasSearchedBefore = localStorage.getItem('guest_has_searched');
    if (!user && hasSearchedBefore === 'true') {
      setIsAuthModalOpen(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // FIX: Full endpoint aur GET request with query param (?q=)
      const response = await axios.get(
        `https://pricehunter-api-ox2s.onrender.com/api/products/search?q=${encodeURIComponent(searchQuery)}`
      );
      setResults(response.data);

      if (!user) {
        localStorage.setItem('guest_has_searched', 'true');
      }

      // Smooth scroll to results
      setTimeout(() => {
        const resultsElement = document.getElementById('search-results-section');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);

    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching live prices. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_name');
    setUser(null);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-200`}>
      
      {/* 1. Header / Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20">
              ₹
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
              Price<span className="text-blue-600 dark:text-sky-400">Hunter</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleThemeToggle}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {user ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Hi, {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg font-medium transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-md transition shadow-blue-500/20"
              >
                Log In / Sign Up
              </button>
            )}
          </div>
        </div>
      </header>

    {/* 2. Hero & Highlighted Smart Search Bar */}
      <section 
        style={{ minHeight: '580px' }}
        className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 flex flex-col items-center justify-center text-center"
      >

        {/* --- 3D Globe Background Canvas --- */}
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
          <div 
            style={{ width: '560px', height: '560px' }} 
            className="flex items-center justify-center -translate-y-10 opacity-75 dark:opacity-70 transition-opacity"
          >
            <Globe3DDemo />
          </div>

          {/* White gradient ko bahut chhota (h-12) aur ultra-subtle (opacity-40) kar diya hai */}
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-40/60 to-transparent dark:from-slate-900/40 pointer-events-none" />
        </div>

        {/* --- Foreground Content (Open & Crisp) --- */}
        <div className="relative z-10 max-w-4xl mx-auto w-full">
          <span className="inline-flex items-center gap-1.5 bg-blue-100/90 dark:bg-blue-900/50 text-blue-700 dark:text-sky-300 text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider mb-5 border border-blue-200 dark:border-blue-800/60 shadow-sm backdrop-blur-sm">
            <Sparkles size={14} /> Compare Live Prices in Seconds
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            Find the <span className="text-emerald-500 dark:text-emerald-400">Lowest Price</span> Across Amazon, Flipkart & More
          </h1>

          <p className="mt-4 text-slate-900  dark:text-slate-300 font-medium text-base sm:text-lg max-w-2xl mx-auto">
            Never overpay again. Enter any gadget, sneaker or product to view live verified deals side-by-side.
          </p>

          {/* Smart Search Bar Container with Dropdown */}
          <div className="mt-8 relative z-50 max-w-2xl mx-auto text-left">
            <form 
              onSubmit={(e) => {
                setShowDropdown(false);
                saveQueryToHistory(query);
                handleSearch(e);
              }} 
              className="relative flex items-center shadow-xl rounded-2xl bg-white dark:bg-slate-800 border-2 border-blue-500/30 focus-within:border-blue-600 dark:focus-within:border-sky-400"
            >
              <Search className="absolute left-4 text-slate-400 pointer-events-none" size={20} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search product (e.g. iPhone 15, Puma Smashic Shoes, boAt 141)..."
                className="w-full pl-12 pr-32 py-4 rounded-2xl bg-transparent text-slate-900 dark:text-white text-base outline-none font-medium placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-6 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                {loading ? 'Finding...' : 'Compare'}
              </button>
            </form>

            {/* Google-like Recent Searches Dropdown */}
            {showDropdown && searchHistory.length > 0 && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowDropdown(false)} 
                />

                <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/60">
                  <div className="px-4 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                    <span>Recent Searches</span>
                  </div>

                  {searchHistory.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => handleSelectHistory(item)}
                      className="flex items-center justify-between px-4 py-3 hover:bg-blue-50/60 dark:hover:bg-slate-700/50 cursor-pointer transition group"
                    >
                      <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200 text-sm font-medium">
                        <Clock size={16} className="text-slate-400 group-hover:text-blue-500 dark:group-hover:text-sky-400 transition" />
                        <span className="truncate max-w-md">{item}</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => removeHistoryItem(e, item)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-600 transition"
                        title="Remove from history"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {error && (
            <p className="mt-4 text-rose-500 text-sm font-medium">{error}</p>
          )}
        </div>
      </section>

      {/* 3. Search Results & In-Page Navigation */}
      {results && (
        <main id="search-results-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          
          {/* Sticky Sub-Navbar */}
          <div className="sticky top-16 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-3 border-y border-slate-200 dark:border-slate-800 my-6">
            <nav className="flex items-center justify-center space-x-2 sm:space-x-6 text-sm font-medium">
              <a href="#best-deal" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 transition font-bold">
                <TrendingDown size={16} /> Best Deal
              </a>
              <a href="#comparison" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition">
                <Layers size={16} /> Compare Stores
              </a>
              <a href="#fast-delivery" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition">
                <Truck size={16} /> Fast Delivery
              </a>
              <a href="#specifications" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition">
                <ShieldCheck size={16} /> Specifications
              </a>
            </nav>
          </div>

          {/* Section 1: #best-deal */}
          <section id="best-deal" className="scroll-mt-36 mb-12">
            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-emerald-500/10">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                {results.bestDeal.imageUrl && (
                  <img 
                    src={results.bestDeal.imageUrl} 
                    alt={results.bestDeal.title} 
                    className="w-28 h-28 object-contain rounded-2xl bg-white p-3 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0" 
                  />
                )}
                <div>
                  <span className="inline-block bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Lowest Price Found
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold mt-2 text-slate-900 dark:text-white leading-snug">
                    {results.bestDeal.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
                    Available on <strong className="text-slate-900 dark:text-white">{results.bestDeal.source}</strong>
                  </p>
                </div>
              </div>

              <div className="text-right flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-emerald-200 dark:border-emerald-800/40">
                <div>
                  <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {results.bestDeal.priceText}
                  </span>
                </div>
                <a
                  href={
                    results.bestDeal?.link &&
                    results.bestDeal.link !== '#' &&
                    (results.bestDeal.link.startsWith('http://') || results.bestDeal.link.startsWith('https://'))
                      ? results.bestDeal.link
                      : `https://www.google.com/search?q=${encodeURIComponent(
                          (results.bestDeal?.title || '') + ' buy online ' + (results.bestDeal?.source || '')
                        )}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition shadow-md shadow-emerald-600/20 whitespace-nowrap"
                >
                  Buy on {results.bestDeal.source} <ArrowRight size={16} />
                </a>
              </div>
            </div>
          </section>

          {/* Section 2: #comparison */}
          <section id="comparison" className="scroll-mt-36 mb-12">
            <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">
              All Available Stores & Prices
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.allStores.map((item, index) => (
                <div 
                  key={index}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 flex flex-col justify-between hover:shadow-lg transition"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {item.source}
                      </span>
                      {item.rating && (
                        <span className="text-xs font-semibold text-amber-500">
                          ★ {item.rating} ({item.ratingCount || 0})
                        </span>
                      )}
                    </div>
                    {item.imageUrl && (
                      <div className="h-36 flex items-center justify-center mb-4">
                        <img src={item.imageUrl} alt={item.title} className="max-h-full object-contain" />
                      </div>
                    )}
                    <h4 className="font-semibold text-sm line-clamp-2 text-slate-900 dark:text-white mb-2">
                      {item.title}
                    </h4>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between mt-2 z-10">
                    <span className="text-xl font-bold text-slate-900 dark:text-white">
                      {item.priceText}
                    </span>
                    <a
                      href={
                        item.link &&
                        item.link !== '#' &&
                        (item.link.startsWith('http://') || item.link.startsWith('https://'))
                          ? item.link
                          : `https://www.google.com/search?q=${encodeURIComponent(item.title + ' buy online ' + item.source)}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 text-sm font-semibold"
                    >
                      Visit Store <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: #fast-delivery */}
          <section id="fast-delivery" className="scroll-mt-36 mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
              Delivery Information & Timeline
            </h2>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <div className="space-y-4">
                {results.allStores.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0 border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <Truck className="text-slate-400" size={18} />
                      <span className="font-semibold text-sm">{item.source}</span>
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {item.delivery}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 4: #specifications */}
          <section id="specifications" className="scroll-mt-36">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
              Product Overview & Summary
            </h2>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Showing live scraped price details for <strong>"{results.query}"</strong>. 
                Prices and stock availability are directly linked to their official checkout pages. 
                Always verify warranty and delivery estimated dates on the merchant site prior to purchase.
              </p>
            </div>
          </section>

        </main>
      )}

      {/* Auth Modal for 1-search limitation */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={() => {
          const name = localStorage.getItem('user_name');
          setUser({ name });
        }}
      />
    </div>
  );
}

export default App;