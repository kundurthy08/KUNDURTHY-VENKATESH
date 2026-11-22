import React, { useEffect, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { useCafe } from '../../context/CafeContext';
import { formatINR } from '../../types';

export const ProductModal: React.FC = () => {
  const { selectedProduct, setSelectedProduct, addToCart, setCartOpen } = useCafe();
  const [quantity, setQuantity] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedProduct) return;
    setQuantity(1);
    const defaults: string[] = [];
    for (const group of selectedProduct.modifiersJson || []) {
      if (group.options.length > 0 && group.maxSelect === 1) {
        defaults.push(group.options[0].id);
      }
    }
    setSelectedIds(defaults);
  }, [selectedProduct]);

  if (!selectedProduct) return null;

  const toggleOption = (groupId: string, optionId: string, maxSelect: number) => {
    const group = selectedProduct.modifiersJson.find((g) => g.id === groupId);
    if (!group) return;
    const groupOptionIds = new Set(group.options.map((o) => o.id));

    setSelectedIds((prev) => {
      const others = prev.filter((id) => !groupOptionIds.has(id));
      const currentInGroup = prev.filter((id) => groupOptionIds.has(id));

      if (maxSelect === 1) {
        return [...others, optionId];
      }
      if (currentInGroup.includes(optionId)) {
        return [...others, ...currentInGroup.filter((id) => id !== optionId)];
      }
      if (currentInGroup.length >= maxSelect) {
        return [...others, ...currentInGroup.slice(1), optionId];
      }
      return [...others, ...currentInGroup, optionId];
    });
  };

  let modifierDelta = 0;
  for (const group of selectedProduct.modifiersJson || []) {
    for (const opt of group.options) {
      if (selectedIds.includes(opt.id)) modifierDelta += opt.priceDeltaPaise;
    }
  }
  const unitPrice = selectedProduct.basePricePaise + modifierDelta;

  const handleAdd = () => {
    addToCart(selectedProduct, quantity, selectedIds);
    setSelectedProduct(null);
    setCartOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#102B22]/60">
      <div
        className="w-full max-w-2xl bg-[#FFFDF8] rounded-2xl border border-[#30231C]/15 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        role="dialog"
        aria-label={selectedProduct.name}
      >
        <div className="relative h-56 sm:h-64 shrink-0 bg-[#173E32]">
          <img
            src={selectedProduct.imageUrl}
            alt={selectedProduct.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() => setSelectedProduct(null)}
            className="absolute top-3 right-3 p-2 rounded-lg bg-[#102B22]/85 text-[#F4EDDF] hover:bg-[#102B22] cursor-pointer"
            aria-label="Close item details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#706B62]">
              <span>{selectedProduct.dietaryTag}</span>
              {selectedProduct.isDraftSample && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Draft Sample Item</span>
                </>
              )}
              {!selectedProduct.available && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#8C3E25] font-semibold">Currently Unavailable</span>
                </>
              )}
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-4">
              <h2 className="font-display text-3xl font-semibold text-[#173E32]">
                {selectedProduct.name}
              </h2>
              <span className="font-mono-tabular text-lg font-semibold text-[#173E32] shrink-0">
                {formatINR(unitPrice)}
              </span>
            </div>
            <p className="mt-2 text-sm text-[#514B42] leading-relaxed">
              {selectedProduct.description}
            </p>
            {selectedProduct.allergenNote && (
              <p className="mt-2 text-xs text-[#706B62]">
                Allergen note: {selectedProduct.allergenNote}
              </p>
            )}
          </div>

          {(selectedProduct.modifiersJson || []).map((group) => (
            <div key={group.id} className="pt-4 border-t border-[#30231C]/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#173E32]">{group.name}</h3>
                <span className="text-xs text-[#706B62]">
                  {group.maxSelect === 1 ? 'Choose 1' : `Up to ${group.maxSelect}`}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.options.map((opt) => {
                  const active = selectedIds.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleOption(group.id, opt.id, group.maxSelect)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#173E32] text-[#F4EDDF] border-[#173E32]'
                          : 'bg-[#F4EDDF]/60 text-[#30231C] border-[#30231C]/15 hover:border-[#173E32]'
                      }`}
                    >
                      <span className="font-medium">{opt.label}</span>
                      <span className="font-mono-tabular">
                        {opt.priceDeltaPaise > 0 ? `+${formatINR(opt.priceDeltaPaise)}` : 'Included'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 bg-[#F4EDDF] border-t border-[#30231C]/12 flex items-center justify-between gap-4 shrink-0">
          <div className="inline-flex items-center border border-[#30231C]/20 rounded-lg bg-[#FFFDF8]">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="p-2.5 text-[#30231C] hover:bg-[#F4EDDF] cursor-pointer"
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="px-4 text-sm font-mono-tabular font-semibold">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(25, q + 1))}
              className="p-2.5 text-[#30231C] hover:bg-[#F4EDDF] cursor-pointer"
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            disabled={!selectedProduct.available}
            onClick={handleAdd}
            className="flex-1 py-3 px-5 rounded-lg bg-[#8C3E25] text-[#F4EDDF] text-sm font-semibold hover:bg-[#A14A2E] transition-colors disabled:opacity-45 cursor-pointer"
          >
            {selectedProduct.available
              ? `Add to Bag · ${formatINR(unitPrice * quantity)}`
              : 'Currently Unavailable'}
          </button>
        </div>
      </div>
    </div>
  );
};
