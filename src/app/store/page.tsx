"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ShoppingCart, Plus, Minus, Search, Package } from "lucide-react";
import { addToCart, getCart, getCartCount, type CartItem } from "@/lib/cart";

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  in_stock: boolean;
}

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "paper", label: "Paper" },
  { key: "notebooks", label: "Notebooks" },
  { key: "writing", label: "Writing" },
  { key: "essentials", label: "Essentials" },
  { key: "files_folders", label: "Files" },
];

const CATEGORY_EMOJI: Record<string, string> = {
  paper: "📄",
  notebooks: "📓",
  writing: "✏️",
  essentials: "📎",
  files_folders: "📁",
};

export default function StorePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
    setCartCount(getCartCount(getCart()));
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/store/products");
      const { products } = await res.json();
      setProducts(products || []);
    } catch {
      console.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (product: Product) => {
    const cart = addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
    });
    setCartCount(getCartCount(cart));
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 800);
  };

  const filtered = products.filter((p) => {
    const matchesCategory = activeCategory === "all" || p.category === activeCategory;
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group by category for display
  const grouped: Record<string, Product[]> = {};
  filtered.forEach((p) => {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  });

  return (
    <div className="container" style={{ paddingBottom: "100px" }}>
      <header style={{ padding: "16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Image src="/logo.png" alt="PrintPod" width={100} height={40} style={{ objectFit: "contain" }} />
        <button
          onClick={() => router.push("/cart")}
          style={{
            position: "relative",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="View cart"
        >
          <ShoppingCart size={24} color="var(--text)" />
          {cartCount > 0 && (
            <span style={{
              position: "absolute",
              top: "2px",
              right: "0",
              background: "var(--error)",
              color: "white",
              fontSize: "11px",
              fontWeight: 700,
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {cartCount > 9 ? "9+" : cartCount}
            </span>
          )}
        </button>
      </header>

      <div style={{ marginTop: "8px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "4px" }}>Stationery Store</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "20px" }}>
          Notebooks, sheets, pens & more — pickup at any pod.
        </p>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: "16px" }}>
          <Search
            size={18}
            color="var(--text-secondary)"
            style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            className="input"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "40px" }}
          />
        </div>

        {/* Category pills */}
        <div style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "8px",
          marginBottom: "20px",
          scrollbarWidth: "none",
        }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                border: activeCategory === cat.key ? "none" : "1px solid var(--border)",
                background: activeCategory === cat.key ? "var(--primary)" : "white",
                color: activeCategory === cat.key ? "white" : "var(--text-secondary)",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Products */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            background: "white",
            textAlign: "center",
            padding: "64px 24px",
          }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <Package size={48} strokeWidth={1} color="var(--border)" />
            </div>
            <h3 style={{ fontWeight: 600, marginBottom: "8px", fontSize: "16px" }}>No items found</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Try a different category or search term.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category} style={{ marginBottom: "28px" }}>
              <h2 style={{
                fontSize: "16px",
                fontWeight: 700,
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                textTransform: "capitalize",
              }}>
                <span>{CATEGORY_EMOJI[category] || "📦"}</span>
                {category.replace("_", " & ")}
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {items.map((product) => (
                  <div
                    key={product.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      padding: "14px 16px",
                      background: "white",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-lg)",
                      transition: "box-shadow 0.2s ease",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "2px" }}>{product.name}</div>
                      {product.description && (
                        <div style={{
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}>
                          {product.description}
                        </div>
                      )}
                    </div>

                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700,
                      fontSize: "15px",
                      whiteSpace: "nowrap",
                      color: "var(--text)",
                    }}>
                      ₹{product.price}
                    </div>

                    <button
                      onClick={() => handleAdd(product)}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        border: addedId === product.id ? "none" : "1px solid var(--border)",
                        background: addedId === product.id ? "var(--success)" : "white",
                        color: addedId === product.id ? "white" : "var(--primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        flexShrink: 0,
                      }}
                      aria-label={`Add ${product.name} to cart`}
                    >
                      <Plus size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating cart bar */}
      {cartCount > 0 && (
        <div style={{
          position: "fixed",
          bottom: "64px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "calc(100% - 32px)",
          maxWidth: "448px",
          background: "var(--primary)",
          color: "white",
          borderRadius: "var(--radius-lg)",
          padding: "14px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "var(--shadow-lg)",
          zIndex: 45,
          cursor: "pointer",
        }}
          onClick={() => router.push("/cart")}
        >
          <div>
            <span style={{ fontWeight: 700, fontSize: "15px" }}>{cartCount} {cartCount === 1 ? "item" : "items"}</span>
            <span style={{ opacity: 0.7, fontSize: "13px", marginLeft: "8px" }}>in cart</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "15px" }}>
            View Cart <ShoppingCart size={18} />
          </div>
        </div>
      )}
    </div>
  );
}
