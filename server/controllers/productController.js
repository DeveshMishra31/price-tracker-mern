import axios from 'axios';
import NodeCache from 'node-cache';
import SearchHistory from '../models/SearchHistory.js';

// Cache results for 2 hours (stdTTL: 7200 seconds)
const searchCache = new NodeCache({ stdTTL: 7200, checkperiod: 600 });

// Helper: Convert ₹65,999 or Rs. 65,999 to clean float number
const parsePrice = (priceStr) => {
  if (!priceStr) return 0;
  const cleaned = priceStr.toString().replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
};

// URL sanitize helper: Ensures links have valid https://
const cleanUrl = (url) => {
  if (!url) return '#';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};

// Verified Multi-Store & Fashion Brands
const TRUSTED_STORES = [
  { name: 'Amazon', match: ['amazon.in', 'amazon'] },
  { name: 'Flipkart', match: ['flipkart.com', 'flipkart'] },
  { name: 'Croma', match: ['croma.com', 'croma'] },
  { name: 'Reliance Digital', match: ['reliancedigital.in', 'reliance digital', 'reliancedigital'] },
  { name: 'Vijay Sales', match: ['vijaysales.com', 'vijay sales'] },
  { name: 'Tata CLiQ', match: ['tatacliq.com', 'tata cliq', 'tatacliq'] },
  { name: 'Myntra', match: ['myntra.com', 'myntra'] },
  { name: 'Nykaa', match: ['nykaa.com', 'nykaa', 'nykaa fashion'] },
  { name: 'Ajio', match: ['ajio.com', 'ajio'] },
  { name: 'Snitch', match: ['snitch.co.in', 'snitch'] },
  { name: 'Meesho', match: ['meesho.com', 'meesho'] },
  { name: 'Nike', match: ['nike.com', 'nike'] },
  { name: 'Puma', match: ['puma.com', 'in.puma.com', 'puma'] },
  { name: 'Adidas', match: ['adidas.co.in', 'adidas.com', 'adidas'] },
  { name: 'boAt', match: ['boat-lifestyle.com', 'boat'] },
  { name: 'Noise', match: ['gonoise.com', 'noise'] }
];

// Smart Category Intelligence Rules
const CATEGORY_RULES = [
  {
    type: 'TV',
    triggers: ['tv', 'television', 'led tv', 'smart tv', 'qled', 'oled'],
    mustInclude: ['tv', 'television', 'led'],
    bannedWords: ['fan', 'bulb', 'remote', 'wall mount', 'cover', 'stabilizer', 'cable', 'bracket', 'stand'],
    minPrice: 6000
  },
  {
    type: 'PHONE',
    triggers: ['iphone', 'galaxy', 'smartphone', 'mobile', 'oneplus', 'redmi', 'realme'],
    mustInclude: [],
    bannedWords: ['case', 'cover', 'glass', 'tempered', 'skin', 'cable', 'lens', 'dummy', 'strap', 'stand', 'pouch'],
    minPrice: 4000
  },
  {
    type: 'LAPTOP',
    triggers: ['laptop', 'macbook', 'thinkpad', 'notebook'],
    mustInclude: ['laptop', 'macbook', 'notebook'],
    bannedWords: ['bag', 'sleeve', 'skin', 'stand', 'keyboard cover', 'cleaning', 'adapter'],
    minPrice: 12000
  },
  {
    type: 'WATCH',
    triggers: ['smartwatch', 'smart watch', 'apple watch'],
    mustInclude: ['watch'],
    bannedWords: ['strap', 'band', 'screen protector', 'charging dock', 'case', 'cable'],
    minPrice: 900
  },
  {
    type: 'SHOES',
    triggers: ['shoes', 'sneakers', 'air jordan'],
    mustInclude: ['shoe', 'sneaker', 'jordan'],
    bannedWords: ['socks', 'shoelaces', 'laces', 'sole', 'cleaner', 'deodorant'],
    minPrice: 800
  }
];

// Model Number & Key Words Match Scorer
const calculateMatchScore = (productTitle, userQuery) => {
  const cleanStr = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const pTokens = cleanStr(productTitle).split(/\s+/).filter(Boolean);
  const qTokens = cleanStr(userQuery).split(/\s+/).filter((w) => w.length > 1);

  if (qTokens.length === 0) return 0;

  let score = 0;
  qTokens.forEach((token) => {
    const isAlphanumeric = /[0-9]/.test(token) && /[a-z]/i.test(token);
    if (pTokens.includes(token)) {
      score += isAlphanumeric ? 6 : 1.5;
    } else if (pTokens.some((pt) => pt.includes(token) || token.includes(pt))) {
      score += 0.5;
    }
  });

  return score;
};

export const searchProducts = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || query.trim() === '') {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const normalizedQuery = query.trim().toLowerCase();

    // 1. Instant Cache Check (<50ms response)
    const cachedResponse = searchCache.get(normalizedQuery);
    if (cachedResponse) {
      return res.status(200).json(cachedResponse);
    }

    if (req.user) {
      SearchHistory.create({ userId: req.user.id, query }).catch(() => {});
    }

    // 2. Fetch Serper with optimized batch (num: 25 for fast response)
    const response = await axios.post(
      'https://google.serper.dev/shopping',
      {
        q: query,
        gl: 'in',
        hl: 'en',
        num: 25
      },
      {
        headers: {
          'X-API-KEY': process.env.SERPER_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 8000 // 8s safety timeout
      }
    );

    let rawList = response.data.shopping || [];

    // Fallback if empty
    if (rawList.length === 0) {
      const modelMatch = query.match(/[a-zA-Z0-9]+-[a-zA-Z0-9]+/i) || query.match(/[a-zA-Z]{1,3}\d{2,5}[a-zA-Z0-9]*/i);
      const brandWord = query.trim().split(/\s+/)[0];
      const trimmedQuery = modelMatch ? `${brandWord} ${modelMatch[0]}` : query.split(' ').slice(0, 4).join(' ');

      const fallbackRes = await axios.post(
        'https://google.serper.dev/shopping',
        {
          q: trimmedQuery,
          gl: 'in',
          hl: 'en',
          num: 20
        },
        {
          headers: {
            'X-API-KEY': process.env.SERPER_API_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 6000
        }
      );
      rawList = fallbackRes.data.shopping || [];
    }

    if (rawList.length === 0) {
      return res.status(404).json({ message: `No products found for "${query}".` });
    }

    // Filter verified stores
    const verifiedProducts = [];
    rawList.forEach((item) => {
      const sourceLower = (item.source || '').toLowerCase();
      const linkLower = (item.link || '').toLowerCase();

      let identifiedStore = null;
      for (const store of TRUSTED_STORES) {
        if (store.match.some((m) => sourceLower.includes(m) || linkLower.includes(m))) {
          identifiedStore = store.name;
          break;
        }
      }

      if (identifiedStore) {
        const matchScore = calculateMatchScore(item.title, query);
        verifiedProducts.push({
          title: item.title,
          source: identifiedStore,
          rawSource: item.source || identifiedStore,
          priceText: item.price,
          numericPrice: parsePrice(item.price),
          link: cleanUrl(item.link || item.direct_link),
          imageUrl: item.imageUrl,
          rating: item.rating || null,
          ratingCount: item.ratingCount || null,
          delivery: item.delivery || 'Free Delivery',
          matchScore
        });
      }
    });

    if (verifiedProducts.length === 0) {
      return res.status(404).json({
        message: `No verified stores found for "${query}". Try searching with a specific brand or model.`
      });
    }

    // Category Intelligence Filter
    const qLower = query.toLowerCase();
    const activeRule = CATEGORY_RULES.find((rule) =>
      rule.triggers.some((t) => qLower.includes(t))
    );

    const filteredList = verifiedProducts.filter((item) => {
      const titleLower = item.title.toLowerCase();
      if (activeRule) {
        if (item.numericPrice < activeRule.minPrice) return false;
        if (activeRule.mustInclude.length > 0) {
          const hasMust = activeRule.mustInclude.some((w) => titleLower.includes(w));
          if (!hasMust) return false;
        }
        const hasBanned = activeRule.bannedWords.some(
          (b) => titleLower.includes(b) && !qLower.includes(b)
        );
        if (hasBanned) return false;
      }
      return item.numericPrice > 0;
    });

    const pool = filteredList.length > 0 ? filteredList : verifiedProducts;

    // Relevance Ranking
    const maxScore = Math.max(...pool.map((p) => p.matchScore));
    let candidatePool = pool;
    if (maxScore >= 4) {
      candidatePool = pool.filter((p) => p.matchScore >= maxScore * 0.55);
    }

    // Outlier Filter
    const sortedPrices = candidatePool.map((i) => i.numericPrice).sort((a, b) => a - b);
    const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
    const cleanFinal = candidatePool.filter((item) => item.numericPrice >= medianPrice * 0.35);

    // Final Sorting
    cleanFinal.sort((a, b) => {
      if (Math.abs(b.matchScore - a.matchScore) > 1.5) {
        return b.matchScore - a.matchScore;
      }
      return a.numericPrice - b.numericPrice;
    });

    // Best Deal selection
    const topTierMatches = cleanFinal.filter(
      (item) => item.matchScore >= cleanFinal[0].matchScore - 1.5
    );
    let bestDeal = topTierMatches[0];
    topTierMatches.forEach((item) => {
      if (item.numericPrice < bestDeal.numericPrice) {
        bestDeal = item;
      }
    });

    const finalResult = {
      success: true,
      query,
      bestDeal,
      allStores: cleanFinal
    };

    // Store in cache for future instant queries
    searchCache.set(normalizedQuery, finalResult);

    res.status(200).json(finalResult);

  } catch (error) {
    console.error('Search API Error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Error fetching product comparison data' });
  }
};